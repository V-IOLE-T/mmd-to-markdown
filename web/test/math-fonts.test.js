import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { encodeFontBuffer, installKatexFonts, KATEX_WOFF2_FONTS } from "../extension-src/katex-fonts.js";

const root = path.resolve(import.meta.dirname, "..");

test("standalone workbench leaves KaTeX's standard LaTeX math fonts intact", async () => {
  const css = await readFile(path.join(root, "src/styles.css"), "utf8");
  assert.match(css, /@import "katex\/dist\/katex\.min\.css"/);
  assert.doesNotMatch(css, /\.preview-content \.katex(?:\s+\.\w+)?\s*\{[^}]*font-family/);
});

test("floating extension leaves KaTeX's standard LaTeX math fonts intact", async () => {
  const css = await readFile(path.join(root, "extension-src/content.css"), "utf8");
  assert.match(css, /@import "katex\/dist\/katex\.min\.css"/);
  assert.doesNotMatch(css, /\.preview \.katex(?:\s+\.\w+)?\s*\{[^}]*font-family/);
});

test("floating extension requests bundled KaTeX WOFF2 faces from the extension context", async () => {
  assert.equal(KATEX_WOFF2_FONTS.length, 20);
  const css = await readFile(path.join(root, "extension-dist/content.css"), "utf8");
  assert.doesNotMatch(css, /@font-face\{[^}]*font-family:KaTeX_(?:Main|Math)/);
  for (const { file } of KATEX_WOFF2_FONTS) {
    await stat(path.join(root, "extension-dist/fonts/katex", file));
  }
});

test("font loader registers bundled byte buffers in document.fonts", async () => {
  const fontSet = new Set();
  class FakeFontFace {
    constructor(family, source, descriptors) {
      this.family = family;
      this.source = source;
      this.descriptors = descriptors;
    }
    async load() { this.loaded = true; return this; }
  }

  const count = await installKatexFonts({
    getFontData: async () => KATEX_WOFF2_FONTS.map((descriptor) => ({ descriptor, base64: "AQIDBA==" })),
    FontFaceType: FakeFontFace,
    fontSet,
  });

  assert.equal(count, 20);
  assert.equal(fontSet.size, 20);
  assert.ok([...fontSet].every((face) => face.loaded && face.source instanceof ArrayBuffer));
  assert.deepEqual([...fontSet][0].source, new Uint8Array([1, 2, 3, 4]).buffer);
});

test("font loader decodes Base64 transport into intact WOFF2 byte buffers", async () => {
  const fontSet = new Set();
  class FakeFontFace {
    constructor(family, source) { this.family = family; this.source = source; }
    async load() { return this; }
  }
  const loaded = await installKatexFonts({
    getFontData: async () => KATEX_WOFF2_FONTS.map((descriptor) => ({ descriptor, base64: "AQIDBA==" })),
    FontFaceType: FakeFontFace,
    fontSet,
  });

  assert.equal(loaded, 20);
  assert.deepEqual([...fontSet][0].source, new Uint8Array([1, 2, 3, 4]).buffer);
});

test("font transport Base64 round-trips binary WOFF2 bytes", () => {
  assert.equal(encodeFontBuffer(new Uint8Array([1, 2, 3, 4]).buffer), "AQIDBA==");
});
