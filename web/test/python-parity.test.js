import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";
import { convertMmd } from "../src/convert.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pythonConverter = path.join(projectRoot, "mmd_to_markdown.py");
const samples = [
  "内联 \\(E=mc^2\\)。\n\\[\n  a^2+b^2=c^2\n\\]",
  "前文\n\n[\n\\mathcal{F}\\{\\hat{x}(t)\\} = -i\\operatorname{sgn}(\\omega)X(\\omega)\n]\n\n后文",
  "[ x(t)=a(t)\\cos\\phi(t) ]",
  "瞬时振幅 (a(t)) 和相位 (\\phi(t))，旋转角 (90^\\circ)，重建信号 (\\hat{x}(t))。",
  "这是一段说明（见上文），以及普通括号 (见示例)。",
  "正频率乘以 (-i)，负频率乘以 (+i)。",
  "h(t) = 1/(pi*t)。希尔伯特变换就是卷积 Hilbert(f(t))。卷积意味着 Hilbert(f(t)) = f(t)*h(t) = F(omega)xH(omega) = -i sgn(omega) x F(omega)。",
  "负频率为 -i sgn(omega) x F(omega)，解析信号为 f(t) + i Hilbert(f(t)) = z(t)，核函数是 1/pi*t。",
  "\\begin{align}\nx &= y + 1 \\\\\ny &= 2\n\\end{align}",
  "```markdown\n\\(literal\\)\n```\n`\\(literal\\)`\n\\(real\\)",
  "::: note\n内容<br>下一行\n:::\n",
  "\\begin{table}\n\\caption{示例}\n\\begin{tabular}{cc}\na & b \\\\\n\\end{tabular}\n\\end{table}",
];

test("browser conversion matches the existing Python converter", () => {
  for (const source of samples) {
    const python = spawnSync("python3", [pythonConverter], { input: source, encoding: "utf8" });
    assert.equal(python.status, 0, python.stderr);
    assert.equal(convertMmd(source), python.stdout);
  }
});
