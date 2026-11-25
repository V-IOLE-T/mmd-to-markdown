import assert from "node:assert/strict";
import test from "node:test";
import { convertMmd } from "../src/convert.js";

test("converts Mathpix inline and display math", () => {
  assert.equal(
    convertMmd("内联 \\(E=mc^2\\)。\n\\[\n  a^2+b^2=c^2\n\\]"),
    "内联 $E=mc^2$。\n\n$$\na^2+b^2=c^2\n$$\n",
  );
});

test("converts standalone square-bracket display math", () => {
  assert.equal(
    convertMmd("前文\n\n[\n\\mathcal{F}\\{\\hat{x}(t)\\} = -i\\operatorname{sgn}(\\omega)X(\\omega)\n]\n\n后文"),
    "前文\n\n$$\n\\mathcal{F}\\{\\hat{x}(t)\\} = -i\\operatorname{sgn}(\\omega)X(\\omega)\n$$\n\n后文\n",
  );
});

test("converts a formula wrapped in square brackets on one line", () => {
  assert.equal(convertMmd("[ x(t)=a(t)\\cos\\phi(t) ]"), "$x(t)=a(t)\\cos\\phi(t)$\n");
});

test("converts unmarked inline LaTeX expressions in parentheses", () => {
  const source = "瞬时振幅 (a(t)) 和相位 (\\phi(t))，旋转角 (90^\\circ)，重建信号 (\\hat{x}(t))。";
  assert.equal(
    convertMmd(source),
    "瞬时振幅 $a(t)$ 和相位 $\\phi(t)$，旋转角 $90^\\circ$，重建信号 $\\hat{x}(t)$。\n",
  );
});

test("does not convert ordinary parenthetical prose", () => {
  assert.equal(convertMmd("这是一段说明（见上文），以及普通括号 (见示例)。"), "这是一段说明（见上文），以及普通括号 (见示例)。\n");
});

test("converts signed imaginary units in unmarked parentheses", () => {
  assert.equal(convertMmd("正频率乘以 (-i)，负频率乘以 (+i)。"), "正频率乘以 $-i$，负频率乘以 $+i$。\n");
});

test("converts unmarked Hilbert-transform notation without interpreting multiplication as emphasis", () => {
  const source = "h(t) = 1/(pi*t)。希尔伯特变换就是卷积 Hilbert(f(t))。卷积意味着 Hilbert(f(t)) = f(t)*h(t) = F(omega)xH(omega) = -i sgn(omega) x F(omega)。";
  const converted = convertMmd(source);

  assert.match(converted, /\$h\(t\) = 1\/\(\\pi t\)\$/);
  assert.match(converted, /\$\\mathcal\{H\}\\\{f\(t\)\\\}\$/);
  assert.match(converted, /\$\\mathcal\{H\}\\\{f\(t\)\\\} = f\(t\)\\cdot h\(t\) = F\(\\omega\)\\cdot H\(\\omega\) = -i\\,\\operatorname\{sgn\}\(\\omega\)\\cdot F\(\\omega\)\$/);
  assert.doesNotMatch(converted, /\*h\(t\)/);
  assert.equal(convertMmd("h(t) = 1/pi*t"), "$h(t) = 1/(\\pi t)$\n");
  assert.equal(convertMmd("卷积 f(t)*g(t)，傅里叶变换 Fourier(h(t)。"), "卷积 $f(t)\\cdot g(t)$，傅里叶变换 $\\mathcal{F}\\{h(t)\\}$。\n");
});

test("converts imaginary-unit Hilbert expressions and bare Hilbert kernels", () => {
  const source = "负频率为 -i sgn(omega) x F(omega)，解析信号为 f(t) + i Hilbert(f(t)) = z(t)，核函数是 1/pi*t。";
  const converted = convertMmd(source);

  assert.match(converted, /\$-i\\,\\operatorname\{sgn\}\(\\omega\)\\cdot F\(\\omega\)\$/);
  assert.match(converted, /\$f\(t\) \+ i\\,\\mathcal\{H\}\\\{f\(t\)\\\} = z\(t\)\$/);
  assert.match(converted, /\$1\/\(\\pi t\)\$/);
});

test("supports non-Mathpix content without changing its meaning", () => {
  const source = "# Heading\n\n- one\n- two\n\n| A | B |\n| - | - |\n| 1 | 2 |\n";
  assert.equal(convertMmd(source), source);
});

test("converts common math environments", () => {
  assert.equal(
    convertMmd("\\begin{align}\nx &= y + 1 \\\\\ny &= 2\n\\end{align}"),
    "$$\nx &= y + 1 \\\\\ny &= 2\n$$\n",
  );
});

test("leaves fenced and inline code untouched", () => {
  assert.equal(
    convertMmd("```markdown\n\\(literal\\)\n```\n`\\(also literal\\)`\n\\(real\\)"),
    "```markdown\n\\(literal\\)\n```\n`\\(also literal\\)`\n$real$\n",
  );
});

test("converts admonitions and HTML breaks", () => {
  assert.equal(
    convertMmd("::: note\n内容<br>下一行\n:::\n"),
    "> **note**\n内容  \n下一行\n>\n",
  );
});

test("removes table wrappers without guessing cell structure", () => {
  assert.equal(
    convertMmd("\\begin{table}\n\\caption{示例}\n\\begin{tabular}{cc}\na & b \\\\\n\\end{tabular}\n\\end{table}"),
    "**示例**\n\na & b \\\\\n",
  );
});

test("normalizes zero-width characters and excess blank lines", () => {
  assert.equal(convertMmd("a\u200b\n\n\n\nb\ufeff"), "a\n\nb\n");
});
