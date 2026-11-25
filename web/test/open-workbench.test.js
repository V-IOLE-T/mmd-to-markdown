import assert from "node:assert/strict";
import test from "node:test";
import { handleOpenWorkbenchRequest, openWorkbenchTab } from "../extension-src/open-workbench.js";

test("opens the workbench bundled inside the extension in a new tab", async () => {
  let tabOptions;
  const tab = await openWorkbenchTab(
    (options) => { tabOptions = options; return { id: 12, ...options }; },
    (path) => `chrome-extension://extension-id/${path}`,
  );

  assert.deepEqual(tabOptions, { url: "chrome-extension://extension-id/index.html" });
  assert.equal(tab.id, 12);
});

test("returns a visible success response after Chrome creates the workbench tab", async () => {
  let response;
  await handleOpenWorkbenchRequest({
    createTab: async () => ({ id: 42 }),
    getURL: (path) => `chrome-extension://extension-id/${path}`,
    sendResponse: (value) => { response = value; },
  });

  assert.deepEqual(response, { opened: true, tabId: 42 });
});

test("returns the Chrome tab-creation failure to the floating panel", async () => {
  let response;
  await handleOpenWorkbenchRequest({
    createTab: async () => { throw new Error("tabs.create denied"); },
    getURL: (path) => `chrome-extension://extension-id/${path}`,
    sendResponse: (value) => { response = value; },
  });

  assert.deepEqual(response, { opened: false, error: "tabs.create denied" });
});
