import { encodeFontBuffer } from "./katex-fonts.js";
import { handleOpenWorkbenchRequest } from "./open-workbench.js";

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
  } catch (error) {
    console.warn("MMD 浮层无法在此页面打开。", error);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "mmd:open-workbench") {
    handleOpenWorkbenchRequest({
      createTab: (options) => new Promise((resolve, reject) => {
        chrome.tabs.create(options, (tab) => {
          const error = chrome.runtime.lastError;
          if (error) reject(new Error(error.message));
          else resolve(tab);
        });
      }),
      getURL: (path) => chrome.runtime.getURL(path),
      sendResponse,
    });
    return true;
  }

  if (message?.type !== "mmd:get-katex-fonts") return false;

  Promise.all(message.files.map(async (descriptor) => {
    const response = await fetch(chrome.runtime.getURL(`fonts/katex/${descriptor.file}`));
    if (!response.ok) throw new Error(`Failed to load ${descriptor.file}`);
    return { descriptor, base64: encodeFontBuffer(await response.arrayBuffer()) };
  }))
    .then((fonts) => sendResponse({ fonts }))
    .catch((error) => sendResponse({ error: error.message }));

  return true;
});
