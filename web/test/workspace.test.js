import assert from "node:assert/strict";
import test from "node:test";
import { Workspace } from "../src/workspace.js";

test("loads opened content into Markdown when that format is selected first", () => {
  const workspace = new Workspace("# Heading\n", "notes.md");
  workspace.switchFormat("markdown");

  assert.equal(workspace.activeFormat, "markdown");
  assert.equal(workspace.getBuffer("markdown"), "# Heading\n");
  assert.equal(workspace.getBuffer("mmd"), "# Heading\n");
  assert.equal(workspace.hasUnsavedChanges(), false);
});

test("asks before replacing manually edited Markdown", () => {
  const workspace = new Workspace("\\(x\\)", "notes.md");
  workspace.convert();
  workspace.setBuffer("markdown", "$x$\n\nEdited\n");

  const result = workspace.convert();

  assert.equal(result.needsConfirmation, true);
  assert.equal(workspace.getBuffer("markdown"), "$x$\n\nEdited\n");
});

test("confirmed conversion can be undone without changing the MMD source", () => {
  const workspace = new Workspace("\\(x\\)", "notes.md");
  workspace.convert();
  workspace.setBuffer("markdown", "$x$\n\nEdited\n");
  workspace.convert({ replaceEditedMarkdown: true });

  assert.equal(workspace.getBuffer("markdown"), "$x$\n");
  assert.equal(workspace.undoConversion(), true);
  assert.equal(workspace.getBuffer("markdown"), "$x$\n\nEdited\n");
  assert.equal(workspace.getBuffer("mmd"), "\\(x\\)");
});

test("saving one format leaves unsaved changes in the other format dirty", () => {
  const workspace = new Workspace("original", "notes.md");
  workspace.convert();
  workspace.setBuffer("mmd", "changed source");
  workspace.switchFormat("markdown");
  workspace.saveActive();

  assert.equal(workspace.hasUnsavedChanges(), true);
  workspace.switchFormat("mmd");
  workspace.saveActive();
  assert.equal(workspace.hasUnsavedChanges(), false);
});
