import assert from "node:assert/strict";
import test from "node:test";
import { locateSourceTarget } from "../src/preview-navigation.js";

test("selects the double-clicked word on its mapped source line", () => {
  assert.deepEqual(locateSourceTarget("第一行\n傅里叶 F(omega) 公式", 1, "F(omega)"), {
    lineNumber: 2,
    from: 4,
    to: 12,
  });
});

test("falls back to the beginning of the source line when rendered text differs", () => {
  assert.deepEqual(locateSourceTarget("第一行\n\\[x^2\\]", 1, "x²"), {
    lineNumber: 2,
    from: 0,
    to: 0,
  });
});

test("clamps missing or out-of-range source lines", () => {
  assert.deepEqual(locateSourceTarget("only line", 50, "missing"), {
    lineNumber: 1,
    from: 0,
    to: 0,
  });
});

test("does not select a rendered word absent from the mapped source line", () => {
  assert.deepEqual(locateSourceTarget("h(t) = 1/pi*t", 0, "π"), {
    lineNumber: 1,
    from: 0,
    to: 0,
  });
});

test("uses the closest matching source line when rendering changed line offsets", () => {
  assert.deepEqual(locateSourceTarget("paragraph\n[\nx^2\n]\nTarget word", 9, "Target"), {
    lineNumber: 5,
    from: 0,
    to: 6,
  });
});
