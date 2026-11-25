import katex from "katex";
import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import texmath from "markdown-it-texmath";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import html from "highlight.js/lib/languages/xml";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import yaml from "highlight.js/lib/languages/yaml";
import { convertMmd } from "./convert.js";

for (const [name, language] of Object.entries({
  bash,
  css,
  html,
  javascript,
  json,
  markdown,
  python,
  sql,
  typescript,
  yaml,
})) {
  hljs.registerLanguage(name, language);
}

function createParser() {
  const parser = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true,
    highlight(code, language) {
      if (!language || !hljs.getLanguage(language)) return "";
      const highlighted = hljs.highlight(code, { language, ignoreIllegals: true }).value;
      return `<pre class="hljs"><code>${highlighted}</code></pre>`;
    },
  });

  parser.use(taskLists, { enabled: false });
  parser.use(texmath, {
    delimiters: ["dollars", "brackets", "beg_end"],
    engine: katex,
    katexOptions: { throwOnError: false },
  });
  addSourceLineMetadata(parser);
  return parser;
}

function addSourceLineMetadata(parser) {
  for (const type of [
    "paragraph_open",
    "heading_open",
    "blockquote_open",
    "bullet_list_open",
    "ordered_list_open",
    "list_item_open",
    "table_open",
    "tr_open",
  ]) {
    const renderToken = parser.renderer.rules[type] ?? ((tokens, index, options, env, self) => self.renderToken(tokens, index, options));
    parser.renderer.rules[type] = (tokens, index, options, env, self) => {
      const token = tokens[index];
      if (token.map && token.attrGet("data-source-line") === null) {
        token.attrSet("data-source-line", String(token.map[0]));
      }
      return renderToken(tokens, index, options, env, self);
    };
  }
}

const markdownParser = createParser();

export function renderMarkdown(source) {
  return markdownParser.render(source);
}

export function renderMmd(source) {
  return markdownParser.render(convertMmd(source));
}
