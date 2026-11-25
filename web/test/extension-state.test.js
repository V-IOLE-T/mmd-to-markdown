import assert from "node:assert/strict";
import test from "node:test";
import { nextPanelAction, panelControllerAction, shouldDismissPanel } from "../extension-src/panel-state.js";

test("toolbar activation toggles the floating panel", () => {
  assert.equal(nextPanelAction(false), "open");
  assert.equal(nextPanelAction(true), "close");
});

test("outside clicks dismiss only an open unpinned panel", () => {
  assert.equal(shouldDismissPanel({ pinned: false, targetInside: false }), true);
  assert.equal(shouldDismissPanel({ pinned: false, targetInside: true }), false);
  assert.equal(shouldDismissPanel({ pinned: true, targetInside: false }), false);
});

test("replaces a panel left behind by a previous extension version", () => {
  assert.equal(panelControllerAction(undefined, "1.0.1"), "mount");
  assert.equal(panelControllerAction("1.0.0", "1.0.1"), "replace");
  assert.equal(panelControllerAction("1.0.1", "1.0.1"), "toggle");
});

test("extension manifest uses toolbar click injection without a popup page", async () => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const path = await import("node:path");
  const root = path.dirname(fileURLToPath(import.meta.url));
  const manifest = JSON.parse(await readFile(path.join(root, "../extension-src/manifest.json"), "utf8"));

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, "1.0.8");
  assert.equal(manifest.background.type, "module");
  assert.ok(manifest.permissions.includes("activeTab"));
  assert.ok(manifest.permissions.includes("scripting"));
  assert.equal(manifest.action.default_popup, undefined);
});
