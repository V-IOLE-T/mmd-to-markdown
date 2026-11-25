import assert from "node:assert/strict";
import test from "node:test";
import { isSaveShortcut } from "../src/workspace.js";

test("recognizes platform save shortcuts only when a modifier is held", () => {
  assert.equal(isSaveShortcut({ metaKey: true, ctrlKey: false, key: "s" }), true);
  assert.equal(isSaveShortcut({ metaKey: false, ctrlKey: true, key: "S" }), true);
  assert.equal(isSaveShortcut({ metaKey: false, ctrlKey: false, key: "s" }), false);
  assert.equal(isSaveShortcut({ metaKey: true, ctrlKey: false, key: "f" }), false);
});
