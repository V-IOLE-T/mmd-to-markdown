import { copyFile, cp, mkdir, readFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { KATEX_WOFF2_FONTS } from "./extension-src/katex-fonts.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(root, "dist");
const extensionSource = path.join(root, "extension-src");
const extensionOutput = path.join(root, "extension-dist");

await Promise.all([
  rm(output, { recursive: true, force: true }),
  rm(extensionOutput, { recursive: true, force: true }),
]);
await Promise.all([mkdir(output, { recursive: true }), mkdir(extensionOutput, { recursive: true })]);
await copyFile(path.join(root, "src/index.html"), path.join(output, "index.html"));

const common = {
  bundle: true,
  platform: "browser",
  target: ["chrome114", "safari17"],
  logLevel: "info",
};

const isolateKatexFonts = {
  name: "isolate-katex-font-faces",
  setup(buildContext) {
    buildContext.onLoad({ filter: /katex[\/]dist[\/]katex\.min\.css$/ }, async ({ path: cssPath }) => {
      const contents = (await readFile(cssPath, "utf8")).replace(/@font-face\{[^}]*\}/g, "");
      return { contents, loader: "css", resolveDir: path.dirname(cssPath) };
    });
  },
};

await Promise.all([
  build({
    ...common,
    entryPoints: [path.join(root, "src/main.js")],
    outfile: path.join(output, "app.js"),
    format: "iife",
    legalComments: "none",
  }),
  build({
    ...common,
    entryPoints: [path.join(root, "src/styles.css")],
    outfile: path.join(output, "app.css"),
    assetNames: "fonts/[name]-[hash]",
    loader: { ".woff2": "file", ".woff": "file", ".ttf": "file" },
    minify: true,
  }),
  build({
    ...common,
    entryPoints: [path.join(extensionSource, "content.js")],
    outfile: path.join(extensionOutput, "content.js"),
    format: "iife",
    legalComments: "none",
    minify: true,
  }),
  build({
    ...common,
    entryPoints: [path.join(extensionSource, "content.css")],
    outfile: path.join(extensionOutput, "content.css"),
    plugins: [isolateKatexFonts],
    assetNames: "fonts/[name]-[hash]",
    loader: { ".woff2": "file", ".woff": "file", ".ttf": "file" },
    minify: true,
  }),
]);

await Promise.all([
  copyFile(path.join(extensionSource, "manifest.json"), path.join(extensionOutput, "manifest.json")),
  copyFile(path.join(extensionSource, "background.js"), path.join(extensionOutput, "background.js")),
  copyFile(path.join(extensionSource, "open-workbench.js"), path.join(extensionOutput, "open-workbench.js")),
  copyFile(path.join(extensionSource, "katex-fonts.js"), path.join(extensionOutput, "katex-fonts.js")),
  cp(output, extensionOutput, { recursive: true }),
  mkdir(path.join(extensionOutput, "icons"), { recursive: true }),
  mkdir(path.join(extensionOutput, "fonts/katex"), { recursive: true }),
]);

await Promise.all(KATEX_WOFF2_FONTS.map(({ file }) =>
  copyFile(
    path.join(root, "node_modules/katex/dist/fonts", file),
    path.join(extensionOutput, "fonts/katex", file),
  ),
));

for (const size of [16, 48, 128]) {
  execFileSync("sips", [
    "-s", "format", "png",
    "--resampleHeightWidth", String(size), String(size),
    path.join(extensionSource, "icon.svg"),
    "--out", path.join(extensionOutput, "icons", `icon-${size}.png`),
  ], { stdio: "ignore" });
}
