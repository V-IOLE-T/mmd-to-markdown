import assert from "node:assert/strict";
import test from "node:test";
import { copyPngToClipboard, renderPreviewPng } from "../extension-src/image-export.js";

test("renders a white-background PNG at double resolution", async () => {
  const preview = {};
  const expected = new Blob(["png"], { type: "image/png" });
  let call;
  const actual = await renderPreviewPng(preview, async (...args) => {
    call = args;
    return expected;
  });

  assert.equal(actual, expected);
  assert.deepEqual(call, [preview, { pixelRatio: 2, backgroundColor: "#fff" }]);
});

test("copies the rendered PNG as an image clipboard item", async () => {
  const blob = new Blob(["png"], { type: "image/png" });
  let written;
  class FakeClipboardItem { constructor(items) { this.items = items; } }
  await copyPngToClipboard(blob, { write: async (items) => { written = items; } }, FakeClipboardItem);

  assert.equal(written.length, 1);
  assert.equal(written[0].items["image/png"], blob);
});
