const MATH_ENVIRONMENTS = [
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
];

function protectCode(text) {
  const protectedBlocks = [];
  const save = (value) => {
    const key = `\0MMD_PROTECTED_${protectedBlocks.length}\0`;
    protectedBlocks.push([key, value]);
    return key;
  };

  text = text.replace(/^\s*(`{3,}|~{3,})[^\n]*\n.*?^\s*\1\s*$/gms, save);
  text = text.replace(/(?<!`)`[^`\n]+`(?!`)/gs, save);
  return { text, protectedBlocks };
}

function convertMathEnvironment(text, environment) {
  const escaped = environment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `\\\\begin\\{${escaped}\\}(?:\\[[^\\]]*\\])?\\s*([\\s\\S]*?)\\s*\\\\end\\{${escaped}\\}`,
    "g",
  );
  return text.replace(pattern, (_, body) => `\n$$\n${body.trim()}\n$$\n`);
}

function convertUnmarkedParentheses(text) {
  const protectedMath = [];
  text = text.replace(/\$\$[\s\S]*?\$\$|(?<!\$)\$(?!\$)[^\n]*?(?<!\$)\$(?!\$)/g, (math) => {
    const token = `\0MMD_MATH_${protectedMath.length}\0`;
    protectedMath.push([token, math]);
    return token;
  });
  text = text.replace(/(?<!\\)\(([^()\n]*(?:\([^()\n]*\)[^()\n]*)*)\)/g, (whole, body) => {
    const mathLike = /\\[a-zA-Z]+|[_^=]/.test(body) || /^[a-zA-Z]\([^()]+\)$/.test(body.trim()) || /^[+-]i$/.test(body.trim());
    return mathLike ? `$${body.trim()}$` : whole;
  });
  for (const [token, math] of protectedMath) text = text.replaceAll(token, () => math);
  return text;
}

function convertHilbertNotation(text) {
  const hilbertChain = /Hilbert\s*\(\s*f\(t\)\s*\)\s*=\s*f\(t\)\s*\*\s*h\(t\)\s*=\s*F\(omega\)\s*x\s*H\(omega\)\s*=\s*-i\s*sgn\(omega\)\s*x\s*F\(omega\)/gi;
  text = text.replace(
    hilbertChain,
    () => "$\\mathcal{H}\\{f(t)\\} = f(t)\\cdot h(t) = F(\\omega)\\cdot H(\\omega) = -i\\,\\operatorname{sgn}(\\omega)\\cdot F(\\omega)$",
  );

  text = text.replace(/\bh\(t\)\s*=\s*1\s*\/\s*(?:\(\s*)?pi\s*\*\s*t\s*\)?/gi, () => "$h(t) = 1/(\\pi t)$");
  text = text.replace(/(?<![\w$])1\s*\/\s*(?:pi|π)\s*(?:\*\s*)?t(?!\w)/gi, () => "$1/(\\pi t)$");
  text = text.replace(
    /f\(t\)\s*\+\s*i\s+(?:Hilbert\s*\(\s*f\(t\)\s*\)|H\s*\{\s*f\(t\)\s*\})\s*=\s*z\(t\)/gi,
    () => "$f(t) + i\\,\\mathcal{H}\\{f(t)\\} = z(t)$",
  );
  text = text.replace(
    /-\s*i\s+sgn\s*\((?:omega|ω)\)\s*(?:x|×|\\times|\*)\s*F\s*\((?:omega|ω)\)/gi,
    () => "$-i\\,\\operatorname{sgn}(\\omega)\\cdot F(\\omega)$",
  );
  text = text.replace(
    /-\s*i\s+sgn\s*\((?:omega|ω)\)/gi,
    () => "$-i\\,\\operatorname{sgn}(\\omega)$",
  );
  text = text.replace(
    /i\s+(?:Hilbert\s*\(\s*f\(t\)\s*\)|H\s*\{\s*f\(t\)\s*\})/gi,
    () => "$i\\,\\mathcal{H}\\{f(t)\\}$",
  );
  text = text.replace(/\bHilbert\s*\(\s*f\(t\)\s*\)/gi, () => "$\\mathcal{H}\\{f(t)\\}$");
  text = text.replace(/\bFourier\s*\(\s*h\(t\)\s*\)?/gi, () => "$\\mathcal{F}\\{h(t)\\}$");
  text = text.replace(/\b([fghz])\(t\)\s*\*\s*([fghz])\(t\)/gi, (_, left, right) => `$${left}(t)\\cdot ${right}(t)$`);

  const protectedMath = [];
  text = text.replace(/\$\$[\s\S]*?\$\$|(?<!\$)\$(?!\$)[^\n]*?(?<!\$)\$(?!\$)/g, (math) => {
    const token = `\0MMD_TYPED_MATH_${protectedMath.length}\0`;
    protectedMath.push([token, math]);
    return token;
  });
  text = text.replace(/\b([fFhHzZ])\(t\)(?!\s*=)/g, (_, name) => `$${name}(t)$`);
  text = text.replace(/\b([FH])\(omega\)/g, (_, name) => `$${name}(\\omega)$`);
  text = text.replace(/\bsgn\(omega\)/g, () => "$\\operatorname{sgn}(\\omega)$");
  for (const [token, math] of protectedMath) text = text.replaceAll(token, () => math);
  return text;
}

function convertMath(text) {
  for (const environment of MATH_ENVIRONMENTS) {
    text = convertMathEnvironment(text, environment);
  }
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, body) => `\n$$\n${body.trim()}\n$$\n`);
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, body) => `$${body.trim()}$`);
  text = text.replace(/^\s*\[\s*\n([\s\S]*?)\n\s*\]\s*$/gm, (whole, body) =>
    /\\[a-zA-Z]+|[_^=]/.test(body) ? `\n$$\n${body.trim()}\n$$\n` : whole,
  );
  text = text.replace(/^\s*\[\s*(.+?)\s*\]\s*$/gm, (whole, body) =>
    /\\[a-zA-Z]+|[_^=]/.test(body) ? `$${body.trim()}$` : whole,
  );
  text = convertHilbertNotation(text);
  return convertUnmarkedParentheses(text);
}

function convertTables(text) {
  text = text.replace(/\\begin\{table\*?\}(?:\[[^\]]*\])?/g, "");
  text = text.replace(/\\end\{table\*?\}/g, "");
  text = text.replace(/\\begin\{tabular\*?\}(?:\{[^}]*\})?/g, "");
  text = text.replace(/\\end\{tabular\*?\}/g, "");
  text = text.replace(/\\(?:toprule|midrule|bottomrule|hline)\s*/g, "");
  return text.replace(/\\caption\{([^{}]*)\}/g, "**$1**\n");
}

function convertExtensions(text) {
  text = text.replace(/^\s*:::\s*([\w-]+)?\s*$/gm, (_, label) => (label ? `> **${label}**` : ">"));
  text = text.replace(/[ \t]*<br\s*\/?>[ \t]*/gi, "  \n");
  return text.replace(/[\u200b\ufeff]/g, "");
}

export function convertMmd(source) {
  const { text: protectedText, protectedBlocks } = protectCode(source);
  let converted = convertMath(protectedText);
  converted = convertTables(converted);
  converted = convertExtensions(converted);
  converted = converted.replace(/[\t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  converted = converted.trim() ? `${converted.trim()}\n` : "";

  for (const [key, original] of protectedBlocks) {
    converted = converted.replaceAll(key, original);
  }
  return converted;
}

