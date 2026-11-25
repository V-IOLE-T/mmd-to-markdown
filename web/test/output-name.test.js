import assert from "node:assert/strict";
import test from "node:test";
import { defaultOutputName } from "../src/workspace.js";

test("suggests a non-overwriting filename for each format", () => {
  assert.equal(defaultOutputName("notes.md", "mmd"), "notes.mmd.md");
  assert.equal(defaultOutputName("notes.md", "markdown"), "notes.standard.md");
});

test("keeps the same document stem after saving a generated version", () => {
  assert.equal(defaultOutputName("notes.standard.md", "markdown"), "notes.standard.md");
  assert.equal(defaultOutputName("notes.mmd.md", "mmd"), "notes.mmd.md");
});
