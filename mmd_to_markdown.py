#!/usr/bin/env python3
"""Convert common Mathpix/AI Markdown extensions to portable Markdown."""

from __future__ import annotations

import argparse
import os
import re
import sys
import tempfile
from pathlib import Path


MATH_ENVIRONMENTS = (
    "equation",
    "equation*",
    "displaymath",
    "displaymath*",
    "align",
    "align*",
    "alignat",
    "alignat*",
    "gather",
    "gather*",
    "multline",
    "multline*",
    "flalign",
    "flalign*",
)


def _protect_blocks(text: str) -> tuple[str, dict[str, str]]:
    """Protect fenced and inline code because their contents are literal."""
    protected: dict[str, str] = {}
    counter = 0

    def save(match: re.Match[str]) -> str:
        nonlocal counter
        key = f"\x00MMD_PROTECTED_{counter}\x00"
        counter += 1
        protected[key] = match.group(0)
        return key

    # Fenced blocks must be matched before inline code.
    text = re.sub(r"(?ms)^\s*(`{3,}|~{3,})[^\n]*\n.*?^\s*\1\s*$", save, text)
    text = re.sub(r"(?s)(?<!`)`[^`\n]+`(?!`)", save, text)
    return text, protected


def _restore_blocks(text: str, protected: dict[str, str]) -> str:
    for key, value in protected.items():
        text = text.replace(key, value)
    return text


def _replace_math_environment(text: str, environment: str) -> str:
    pattern = re.compile(
        rf"\\begin\{{{re.escape(environment)}\}}(?:\[[^\]]*\])?\s*"
        rf"(.*?)"
        rf"\s*\\end\{{{re.escape(environment)}\}}",
        re.DOTALL,
    )
    return pattern.sub(lambda match: "\n$$\n" + match.group(1).strip() + "\n$$\n", text)


def _replace_tabular_wrappers(text: str) -> str:
    """Remove wrappers while preserving tabular content for manual conversion."""
    text = re.sub(r"\\begin\{table\*?\}(?:\[[^\]]*\])?", "", text)
    text = re.sub(r"\\end\{table\*?\}", "", text)
    text = re.sub(r"\\begin\{tabular\*?\}(?:\{[^}]*\})?", "", text)
    text = re.sub(r"\\end\{tabular\*?\}", "", text)
    text = re.sub(r"\\(?:toprule|midrule|bottomrule|hline)\s*", "", text)
    text = re.sub(r"\\caption\{([^{}]*)\}", r"**\1**\n", text)
    return text


def _convert_math(text: str) -> str:
    for environment in MATH_ENVIRONMENTS:
        text = _replace_math_environment(text, environment)

    # Mathpix commonly emits \[...\] and \(...\); DOTALL allows OCR output to span lines.
    text = re.sub(r"\\\[(.*?)\\\]", lambda m: "\n$$\n" + m.group(1).strip() + "\n$$\n", text, flags=re.DOTALL)
    text = re.sub(r"\\\((.*?)\\\)", lambda m: "$" + m.group(1).strip() + "$", text, flags=re.DOTALL)

    def convert_square_bracket_block(match: re.Match[str]) -> str:
        body = match.group(1).strip()
        if re.search(r"\\[a-zA-Z]+|[_^=]", body):
            return "\n$$\n" + body + "\n$$\n"
        return match.group(0)

    def convert_square_bracket_line(match: re.Match[str]) -> str:
        body = match.group(1).strip()
        if re.search(r"\\[a-zA-Z]+|[_^=]", body):
            return "$" + body + "$"
        return match.group(0)

    text = re.sub(r"(?m)^\s*\[\s*\n([\s\S]*?)\n\s*\]\s*$", convert_square_bracket_block, text)
    text = re.sub(r"(?m)^\s*\[\s*(.+?)\s*\]\s*$", convert_square_bracket_line, text)

    hilbert_chain = re.compile(
        r"Hilbert\s*\(\s*f\(t\)\s*\)\s*=\s*f\(t\)\s*\*\s*h\(t\)\s*=\s*F\(omega\)\s*x\s*H\(omega\)\s*=\s*-i\s*sgn\(omega\)\s*x\s*F\(omega\)",
        re.IGNORECASE,
    )
    chain_tex = r"$\mathcal{H}\{f(t)\} = f(t)\cdot h(t) = F(\omega)\cdot H(\omega) = -i\,\operatorname{sgn}(\omega)\cdot F(\omega)$"
    text = hilbert_chain.sub(lambda _: chain_tex, text)
    text = re.sub(
        r"\bh\(t\)\s*=\s*1\s*/\s*(?:\(\s*)?pi\s*\*\s*t\s*\)?",
        lambda _: r"$h(t) = 1/(\pi t)$",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"(?<![\w$])1\s*/\s*(?:pi|π)\s*(?:\*\s*)?t(?!\w)",
        lambda _: r"$1/(\pi t)$",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"f\(t\)\s*\+\s*i\s+(?:Hilbert\s*\(\s*f\(t\)\s*\)|H\s*\{\s*f\(t\)\s*\})\s*=\s*z\(t\)",
        lambda _: r"$f(t) + i\,\mathcal{H}\{f(t)\} = z(t)$",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"-\s*i\s+sgn\s*\((?:omega|ω)\)\s*(?:x|×|\\times|\*)\s*F\s*\((?:omega|ω)\)",
        lambda _: r"$-i\,\operatorname{sgn}(\omega)\cdot F(\omega)$",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"-\s*i\s+sgn\s*\((?:omega|ω)\)",
        lambda _: r"$-i\,\operatorname{sgn}(\omega)$",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"i\s+(?:Hilbert\s*\(\s*f\(t\)\s*\)|H\s*\{\s*f\(t\)\s*\})",
        lambda _: r"$i\,\mathcal{H}\{f(t)\}$",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"\bHilbert\s*\(\s*f\(t\)\s*\)",
        lambda _: r"$\mathcal{H}\{f(t)\}$",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"\bFourier\s*\(\s*h\(t\)\s*\)?",
        lambda _: r"$\mathcal{F}\{h(t)\}$",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"\b([fghz])\(t\)\s*\*\s*([fghz])\(t\)",
        lambda m: "$" + m.group(1) + r"(t)\cdot " + m.group(2) + "(t)$",
        text,
        flags=re.IGNORECASE,
    )

    protected_math: dict[str, str] = {}

    def save_math(match: re.Match[str]) -> str:
        key = f"\x00MMD_MATH_{len(protected_math)}\x00"
        protected_math[key] = match.group(0)
        return key

    text = re.sub(r"\$\$[\s\S]*?\$\$|(?<!\$)\$(?!\$)[^\n]*?(?<!\$)\$(?!\$)", save_math, text)

    def convert_unmarked_parentheses(match: re.Match[str]) -> str:
        body = match.group(1).strip()
        math_like = (
            re.search(r"\\[a-zA-Z]+|[_^=]", body)
            or re.fullmatch(r"[a-zA-Z]\([^()]+\)", body)
            or re.fullmatch(r"[+-]i", body)
        )
        return "$" + body + "$" if math_like else match.group(0)

    text = re.sub(r"(?<!\\)\(([^()\n]*(?:\([^()\n]*\)[^()\n]*)*)\)", convert_unmarked_parentheses, text)
    for key, value in protected_math.items():
        text = text.replace(key, value)
    protected_math = {}

    def save_typed_math(match: re.Match[str]) -> str:
        key = f"\x00MMD_TYPED_MATH_{len(protected_math)}\x00"
        protected_math[key] = match.group(0)
        return key

    text = re.sub(r"\$\$[\s\S]*?\$\$|(?<!\$)\$(?!\$)[^\n]*?(?<!\$)\$(?!\$)", save_typed_math, text)
    text = re.sub(r"\b([fFhHzZ])\(t\)(?!\s*=)", lambda m: "$" + m.group(1) + "(t)$", text)
    text = re.sub(r"\b([FH])\(omega\)", lambda m: "$" + m.group(1) + r"(\omega)$", text)
    text = re.sub(r"\bsgn\(omega\)", lambda _: r"$\operatorname{sgn}(\omega)$", text)
    for key, value in protected_math.items():
        text = text.replace(key, value)
    return text


def _convert_extensions(text: str) -> str:
    # Convert common fenced admonition syntax to a portable blockquote.
    text = re.sub(r"(?m)^\s*:::\s*([\w-]+)?\s*$", lambda m: f"> **{m.group(1)}**" if m.group(1) else ">", text)
    text = re.sub(r"(?m)^\s*:::\s*$", ">", text)
    # HTML line breaks are unnecessary for ordinary Markdown paragraphs.
    text = re.sub(r"[ \t]*<br\s*/?>[ \t]*", "  \n", text, flags=re.IGNORECASE)
    # Remove zero-width characters sometimes copied from rendered ChatGPT output.
    text = text.replace("\u200b", "").replace("\ufeff", "")
    return text


def _tidy(text: str) -> str:
    # Keep two trailing spaces: they are the portable Markdown hard-break syntax.
    text = re.sub(r"[\t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n" if text.strip() else ""


def convert_mmd(text: str) -> str:
    """Convert MMD text without changing fenced or inline code contents."""
    text, protected = _protect_blocks(text)
    text = _convert_math(text)
    text = _replace_tabular_wrappers(text)
    text = _convert_extensions(text)
    return _restore_blocks(_tidy(text), protected)


def output_path(input_path: Path) -> Path:
    suffix = input_path.suffix or ".md"
    return input_path.with_name(input_path.stem + ".standard" + suffix)


def convert_file(input_path: Path, destination: Path | None = None, in_place: bool = False) -> Path:
    text = input_path.read_text(encoding="utf-8")
    converted = convert_mmd(text)

    if in_place:
        # Write beside the source, then replace it atomically after conversion succeeds.
        fd, temporary_name = tempfile.mkstemp(
            prefix=f".{input_path.name}.", suffix=".tmp", dir=input_path.parent
        )
        temporary_path = Path(temporary_name)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as temporary_file:
                temporary_file.write(converted)
                temporary_file.flush()
                os.fsync(temporary_file.fileno())
            temporary_path.chmod(input_path.stat().st_mode)
            os.replace(temporary_path, input_path)
        except Exception:
            temporary_path.unlink(missing_ok=True)
            raise
        return input_path

    target = destination or output_path(input_path)
    target.write_text(converted, encoding="utf-8")
    return target


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Convert Mathpix Markdown to portable Markdown.")
    parser.add_argument("files", nargs="*", type=Path, help="Markdown files; omit to read stdin")
    parser.add_argument("-o", "--output", type=Path, help="Output file for one input file")
    parser.add_argument("--in-place", action="store_true", help="Replace each source file after successful conversion")
    args = parser.parse_args(argv)

    if args.output and len(args.files) != 1:
        parser.error("--output requires exactly one input file")
    if args.output and args.in_place:
        parser.error("--output and --in-place cannot be used together")
    if args.in_place and not args.files:
        parser.error("--in-place requires at least one input file")

    if not args.files:
        sys.stdout.write(convert_mmd(sys.stdin.read()))
        return 0

    for input_path in args.files:
        if not input_path.is_file():
            print(f"跳过不存在的文件: {input_path}", file=sys.stderr)
            continue
        target = convert_file(input_path, args.output, in_place=args.in_place)
        print(f"已覆盖: {target}" if args.in_place else f"已生成: {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
