import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdown, renderMmd } from "../src/render.js";

test("renders MMD and Markdown math delimiters", () => {
  const html = renderMarkdown("内联 \\(x^2\\) 和 $y^2$\n\n\\[a+b\\]");
  assert.equal((html.match(/class="katex"/g) ?? []).length, 3);
});

test("renders tables and task lists", () => {
  const html = renderMarkdown("| A | B |\n| - | - |\n| 1 | 2 |\n\n- [x] done");
  assert.match(html, /<table\b/);
  assert.match(html, /checked=""[^>]*type="checkbox"/);
});

test("adds source line metadata to preview blocks", () => {
  const html = renderMarkdown("第一段\n\n第二段");
  assert.match(html, /<p data-source-line="0">第一段<\/p>/);
  assert.match(html, /<p data-source-line="2">第二段<\/p>/);
});

test("renders each single source newline as a visible hard line break", () => {
  assert.match(renderMarkdown("第一行\n第二行"), /第一行<br>\n第二行/);
  assert.match(renderMmd("第一行\n第二行"), /第一行<br>\n第二行/);
});

test("renders MMD admonitions as portable callouts", () => {
  const html = renderMmd("::: note\nImportant text\n:::");
  assert.match(html, /<blockquote\b/);
  assert.match(html, /<strong>note<\/strong>/);
  assert.doesNotMatch(html, /:::/);
});

test("renders raw square-bracket MMD formulas as KaTeX", () => {
  const html = renderMmd("[\n\\mathcal{F}\\{\\hat{x}(t)\\}=x_0\n]");
  assert.match(html, /class="katex"/);
  assert.doesNotMatch(html, /\[|\]/);
});

test("MMD preview renders Hilbert notation as math and never italicizes prose", () => {
  const html = renderMmd("希尔伯特变换就是卷积 Hilbert(f(t))。卷积意味着 Hilbert(f(t)) = f(t)*h(t) = F(omega)xH(omega) = -i sgn(omega) x F(omega)。");
  assert.doesNotMatch(html, /<em>|<i>/);
  assert.match(html, /class="katex"/);
  assert.match(html, /\\omega/);
  assert.match(html, /operatorname/);
});

test("highlights common code without allowing embedded HTML", () => {
  const html = renderMarkdown("```python\nprint('<script>')\n```\n\n<script>alert(1)</script>");
  assert.match(html, /class="hljs/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
