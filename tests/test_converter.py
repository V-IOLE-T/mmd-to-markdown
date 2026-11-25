import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from mmd_to_markdown import convert_file, convert_mmd


class ConverterTests(unittest.TestCase):
    def test_mathpix_inline_and_display_math(self):
        source = "内联 \\(E=mc^2\\)。\n\\[\n  a^2+b^2=c^2\n\\]"
        result = convert_mmd(source)
        self.assertIn("$E=mc^2$", result)
        self.assertIn("$$\na^2+b^2=c^2\n$$", result)

    def test_standalone_square_brackets_wrap_display_math(self):
        source = "前文\n\n[\n\\mathcal{F}\\{\\hat{x}(t)\\} = -i\\operatorname{sgn}(\\omega)X(\\omega)\n]\n\n后文"
        result = convert_mmd(source)
        self.assertIn("$$\n\\mathcal{F}\\{\\hat{x}(t)\\} = -i\\operatorname{sgn}(\\omega)X(\\omega)\n$$", result)
        self.assertNotIn("\n[\n", result)

    def test_single_line_square_brackets_wrap_inline_math(self):
        self.assertEqual(convert_mmd("[ x(t)=a(t)\\cos\\phi(t) ]"), "$x(t)=a(t)\\cos\\phi(t)$\n")

    def test_unmarked_inline_latex_in_parentheses(self):
        source = "瞬时振幅 (a(t)) 和相位 (\\phi(t))，旋转角 (90^\\circ)，重建信号 (\\hat{x}(t))。"
        expected = "瞬时振幅 $a(t)$ 和相位 $\\phi(t)$，旋转角 $90^\\circ$，重建信号 $\\hat{x}(t)$。\n"
        self.assertEqual(convert_mmd(source), expected)

    def test_plain_parenthetical_prose_is_unchanged(self):
        self.assertEqual(convert_mmd("这是一段说明（见上文），以及普通括号 (见示例)。"), "这是一段说明（见上文），以及普通括号 (见示例)。\n")

    def test_signed_imaginary_units_in_parentheses(self):
        self.assertEqual(convert_mmd("正频率乘以 (-i)，负频率乘以 (+i)。"), "正频率乘以 $-i$，负频率乘以 $+i$。\n")

    def test_unmarked_hilbert_transform_notation(self):
        source = "h(t) = 1/(pi*t)。希尔伯特变换就是卷积 Hilbert(f(t))。卷积意味着 Hilbert(f(t)) = f(t)*h(t) = F(omega)xH(omega) = -i sgn(omega) x F(omega)。"
        converted = convert_mmd(source)
        self.assertIn("$h(t) = 1/(\\pi t)$", converted)
        self.assertIn("$\\mathcal{H}\\{f(t)\\}$", converted)
        self.assertIn("$\\mathcal{H}\\{f(t)\\} = f(t)\\cdot h(t) = F(\\omega)\\cdot H(\\omega) = -i\\,\\operatorname{sgn}(\\omega)\\cdot F(\\omega)$", converted)
        self.assertNotIn("*h(t)", converted)
        self.assertEqual(convert_mmd("h(t) = 1/pi*t"), "$h(t) = 1/(\\pi t)$\n")
        self.assertEqual(convert_mmd("卷积 f(t)*g(t)，傅里叶变换 Fourier(h(t)。"), "卷积 $f(t)\\cdot g(t)$，傅里叶变换 $\\mathcal{F}\\{h(t)\\}$。\n")

    def test_imaginary_unit_hilbert_expressions_and_bare_kernel(self):
        source = "负频率为 -i sgn(omega) x F(omega)，解析信号为 f(t) + i Hilbert(f(t)) = z(t)，核函数是 1/pi*t。"
        converted = convert_mmd(source)
        self.assertIn("$-i\\,\\operatorname{sgn}(\\omega)\\cdot F(\\omega)$", converted)
        self.assertIn("$f(t) + i\\,\\mathcal{H}\\{f(t)\\} = z(t)$", converted)
        self.assertIn("$1/(\\pi t)$", converted)

    def test_math_environments(self):
        source = "\\begin{align}\nx &= y + 1 \\\\\ny &= 2\n\\end{align}"
        result = convert_mmd(source)
        self.assertIn(r"$$" + "\n" + r"x &= y + 1 \\" + "\n" + r"y &= 2" + "\n" + r"$$", result)

    def test_code_blocks_are_untouched(self):
        source = "```markdown\n\\(not math\\)\n```\n\n\\(real math\\)"
        result = convert_mmd(source)
        self.assertIn("\\(not math\\)", result)
        self.assertIn("$real math$", result)

    def test_common_extensions(self):
        source = "::: note\n内容<br>下一行\n:::\n"
        result = convert_mmd(source)
        self.assertIn("> **note**", result)
        self.assertIn("内容  \n下一行", result)
        self.assertNotIn(":::", result)

    def test_tabular_wrappers_are_removed(self):
        source = r"\begin{tabular}{cc}\na & b \\\n\end{tabular}"
        result = convert_mmd(source)
        self.assertNotIn("\\begin{tabular}", result)
        self.assertIn("a & b", result)

    def test_in_place_conversion_replaces_source_after_success(self):
        with TemporaryDirectory() as directory:
            source_path = Path(directory) / "note.md"
            source_path.write_text("公式：\\(x^2\\)\n", encoding="utf-8")

            result = convert_file(source_path, in_place=True)

            self.assertEqual(result, source_path)
            self.assertEqual(source_path.read_text(encoding="utf-8"), "公式：$x^2$\n")
            self.assertFalse((Path(directory) / "note.standard.md").exists())

    def test_copy_conversion_stays_beside_each_source_file(self):
        with TemporaryDirectory() as directory:
            first_directory = Path(directory) / "first"
            second_directory = Path(directory) / "second"
            first_directory.mkdir()
            second_directory.mkdir()
            first = first_directory / "one.md"
            second = second_directory / "two.md"
            first.write_text("\\(a\\)\n", encoding="utf-8")
            second.write_text("\\(b\\)\n", encoding="utf-8")

            first_output = convert_file(first)
            second_output = convert_file(second)

            self.assertEqual(first_output, first_directory / "one.standard.md")
            self.assertEqual(second_output, second_directory / "two.standard.md")
            self.assertEqual(first_output.read_text(encoding="utf-8"), "$a$\n")
            self.assertEqual(second_output.read_text(encoding="utf-8"), "$b$\n")


if __name__ == "__main__":
    unittest.main()
