export function openWorkbenchTab(createTab, getURL) {
  return createTab({ url: getURL("index.html") });
}

export async function handleOpenWorkbenchRequest({ createTab, getURL, sendResponse }) {
  try {
    const tab = await openWorkbenchTab(createTab, getURL);
    if (!tab?.id) throw new Error("Chrome 未返回新标签页信息");
    sendResponse({ opened: true, tabId: tab.id });
  } catch (error) {
    sendResponse({ opened: false, error: error.message || "无法打开工作台" });
  }
}
