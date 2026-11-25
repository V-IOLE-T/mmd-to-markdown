import assert from "node:assert/strict";
import test from "node:test";
import { loadAutoWrap, saveAutoWrap } from "../src/editor-settings.js";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test("automatic wrapping defaults off and persists the selected value", () => {
  const storage = createStorage();
  assert.equal(loadAutoWrap(storage), false);
  saveAutoWrap(true, storage);
  assert.equal(loadAutoWrap(storage), true);
  saveAutoWrap(false, storage);
  assert.equal(loadAutoWrap(storage), false);
});

test("automatic wrapping remains usable when browser storage is unavailable", () => {
  const blockedStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.equal(loadAutoWrap(blockedStorage), false);
  assert.equal(saveAutoWrap(true, blockedStorage), true);
});
