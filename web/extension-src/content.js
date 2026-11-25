import { renderMarkdown, renderMmd } from "../src/render.js";
import { locateSourceTarget } from "../src/preview-navigation.js";
import { toBlob } from "html-to-image";
import { copyPngToClipboard, renderPreviewPng } from "./image-export.js";
import {
  nextPanelAction,
  panelControllerAction,
  shouldDismissPanel,
  shouldRefreshPreviewForFontLoad,
} from "./panel-state.js";
import { installKatexFonts, KATEX_WOFF2_FONTS } from "./katex-fonts.js";

const CONTROLLER_KEY = "__mmdWorkbenchPanel__";
const EXTENSION_VERSION = chrome.runtime.getManifest().version;

const action = panelControllerAction(window[CONTROLLER_KEY]?.version, EXTENSION_VERSION);
if (action === "replace") {
  window[CONTROLLER_KEY].destroy();
  mountPanel();
} else if (action === "toggle") {
  window[CONTROLLER_KEY].toggle();
} else {
  mountPanel();
}

function mountPanel() {
  const host = document.createElement("div");
  host.id = "mmd-workbench-floating-panel";
  host.style.cssText = "all:initial!important;display:block!important;position:fixed!important;z-index:2147483647!important;top:12px!important;right:12px!important;width:min(440px,calc(100vw - 24px))!important;height:min(720px,calc(100vh - 24px))!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;overflow:visible!important;";
  const shadow = host.attachShadow({ mode: "closed" });
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = chrome.runtime.getURL("content.css");
  shadow.append(stylesheet);

  const panel = document.createElement("section");
  panel.className = "panel";
  panel.setAttribute("aria-label", "MMD 工作台浮层");
  panel.innerHTML = `
    <header class="panel-header" data-drag>
      <div class="brand"><span class="brand-mark" aria-hidden="true">M</span><span class="brand-title">MMD 工作台</span></div>
      <div class="header-actions">
        <button class="header-open-button" id="open-workbench" type="button" title="在新标签页打开完整工作台">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6m-1-5-9 9"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></svg>
          打开工作台
        </button>
        <button class="icon-button" id="pin" type="button" aria-label="固定在当前网页" aria-pressed="false" title="固定在当前网页">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5-4 1-4 4 1 4-2 2-3-5-5-5 2-2 4 1 4-4z"/><path d="m5 19 5-5"/></svg>
        </button>
        <button class="icon-button" id="close" type="button" aria-label="关闭浮层" title="关闭">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12"/></svg>
        </button>
      </div>
    </header>
    <div class="format-row">
      <div class="format-switch" role="tablist" aria-label="输入格式">
        <button class="format-tab" id="tab-mmd" role="tab" aria-selected="true" type="button">MMD</button>
        <button class="format-tab" id="tab-markdown" role="tab" aria-selected="false" type="button">Markdown</button>
      </div>
      <span class="format-hint" id="format-hint">Mathpix Markdown</span>
    </div>
    <label class="input-region">
      <span class="section-label">输入内容</span>
      <textarea class="source-input" id="source" spellcheck="false" placeholder="粘贴或输入 MMD 内容…"></textarea>
    </label>
    <section class="preview-region" aria-label="实时预览">
      <div class="preview-label"><span class="section-label">渲染预览</span><span id="preview-kind">MMD</span></div>
      <article class="preview" id="preview"></article>
    </section>
    <div class="export-row">
      <button class="button button-primary" id="copy-png" type="button" disabled>
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="m21 15-5-5L5 21" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
        复制 PNG
      </button>
      <button class="button" id="download-png" type="button" disabled>
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v3h16v-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        下载 PNG
      </button>
      <div class="export-more-wrap">
        <button class="button export-more" id="more" type="button" aria-label="更多操作" title="更多操作">···</button>
        <div class="export-menu" id="export-menu" hidden>
          <div class="menu-popover">
            <button class="menu-item" id="copy-source" type="button">复制源文本</button>
            <button class="menu-item" id="clear-source" type="button">清空输入</button>
          </div>
        </div>
      </div>
    </div>
    <footer class="panel-status"><span id="status" class="status-ready">本地预览 · 离线可用</span><span id="pin-status">未固定</span></footer>
  `;
  shadow.append(panel);
  document.documentElement.append(host);

  const source = panel.querySelector("#source");
  const preview = panel.querySelector("#preview");
  const pinButton = panel.querySelector("#pin");
  const status = panel.querySelector("#status");
  const moreButton = panel.querySelector("#more");
  const exportMenu = panel.querySelector("#export-menu");
  let format = "mmd";
  let pinned = false;
  let statusTimer;
  let panelMounted = true;
  let refreshAfterFontLoad = () => {};

  const controller = {
    version: EXTENSION_VERSION,
    toggle() {
      if (nextPanelAction(true) === "close") closePanel();
    },
    destroy: closePanel,
  };
  window[CONTROLLER_KEY] = controller;

  function closePanel() {
    panelMounted = false;
    document.removeEventListener("pointerdown", onOutsidePointerDown, true);
    document.removeEventListener("pointermove", onPointerMove, true);
    document.removeEventListener("pointerup", onPointerUp, true);
    host.remove();
    delete window[CONTROLLER_KEY];
  }

  function setStatus(message, kind = "ready") {
    clearTimeout(statusTimer);
    status.textContent = message;
    status.className = kind === "error" ? "status-error" : "status-ready";
    if (kind === "ready" && message !== "本地预览 · 离线可用") {
      statusTimer = setTimeout(() => setStatus("本地预览 · 离线可用"), 3200);
    }
  }

  function updatePreview() {
    const text = source.value;
    preview.innerHTML = text.trim()
      ? format === "mmd" ? renderMmd(text) : renderMarkdown(text)
      : '<div class="empty-state"><strong>预览会显示在这里</strong><span>输入文本或公式以开始</span></div>';
    panel.querySelector("#copy-png").disabled = !text.trim();
    panel.querySelector("#download-png").disabled = !text.trim();
  }

  refreshAfterFontLoad = () => {
    if (shouldRefreshPreviewForFontLoad({ mounted: panelMounted, fontLoaded: true })) updatePreview();
  };

  function switchFormat(nextFormat) {
    format = nextFormat;
    const isMmd = format === "mmd";
    panel.querySelector("#tab-mmd").setAttribute("aria-selected", String(isMmd));
    panel.querySelector("#tab-markdown").setAttribute("aria-selected", String(!isMmd));
    panel.querySelector("#format-hint").textContent = isMmd ? "Mathpix Markdown" : "GitHub 风格 Markdown";
    panel.querySelector("#preview-kind").textContent = isMmd ? "MMD" : "Markdown";
    source.placeholder = isMmd ? "粘贴或输入 MMD 内容…" : "粘贴或输入 Markdown 内容…";
    updatePreview();
  }

  async function makePng() {
    await document.fonts?.ready;
    return renderPreviewPng(preview, toBlob);
  }

  async function copyPng() {
    try {
      const blob = await makePng();
      await copyPngToClipboard(blob, navigator.clipboard, globalThis.ClipboardItem);
      setStatus("预览图片已复制");
    } catch (error) {
      setStatus(error.message || "复制失败，请下载 PNG", "error");
    }
  }

  async function downloadPng() {
    try {
      const blob = await makePng();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "mmd-preview.png";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setStatus("PNG 图片已下载");
    } catch (error) {
      setStatus(error.message || "导出 PNG 失败", "error");
    }
  }

  preview.addEventListener("dblclick", (event) => {
    const block = event.target.closest("[data-source-line]");
    if (!block) return;
    const selection = window.getSelection();
    const selectedText = selection && shadow.contains(selection.anchorNode)
      ? selection.toString()
      : "";
    const target = locateSourceTarget(source.value, Number(block.dataset.sourceLine), selectedText);
    const lineHeight = Number.parseFloat(getComputedStyle(source).lineHeight) || 19;
    const start = source.value.split("\n").slice(0, target.lineNumber - 1).join("\n").length
      + (target.lineNumber > 1 ? 1 : 0)
      + target.from;
    source.focus();
    source.setSelectionRange(start, start + (target.to - target.from));
    source.scrollTop = Math.max(0, (target.lineNumber - 1) * lineHeight - source.clientHeight / 2);
    setStatus(`源码已定位到第 ${target.lineNumber} 行`);
  });

  function onOutsidePointerDown(event) {
    const targetInside = event.composedPath().includes(host);
    if (shouldDismissPanel({ pinned, targetInside })) closePanel();
  }

  let drag = null;
  panel.querySelector("[data-drag]").addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.composedPath().some((node) => node instanceof Element && node.matches("button"))) return;
    const rect = host.getBoundingClientRect();
    host.style.setProperty("inset", "auto", "important");
    host.style.setProperty("left", `${rect.left}px`, "important");
    host.style.setProperty("top", `${rect.top}px`, "important");
    host.style.setProperty("width", `${rect.width}px`, "important");
    drag = { pointerId: event.pointerId, x: event.clientX - rect.left, y: event.clientY - rect.top };
    event.preventDefault();
  });

  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const maxX = Math.max(0, window.innerWidth - host.offsetWidth);
    const maxY = Math.max(0, window.innerHeight - host.offsetHeight);
    host.style.setProperty("left", `${Math.min(maxX, Math.max(0, event.clientX - drag.x))}px`, "important");
    host.style.setProperty("top", `${Math.min(maxY, Math.max(0, event.clientY - drag.y))}px`, "important");
  }

  function onPointerUp(event) {
    if (drag && event.pointerId === drag.pointerId) drag = null;
  }

  panel.querySelector("#close").addEventListener("click", closePanel);
  panel.querySelector("#open-workbench").addEventListener("click", async () => {
    const button = panel.querySelector("#open-workbench");
    button.disabled = true;
    setStatus("正在打开工作台…");
    try {
      const response = await chrome.runtime.sendMessage({ type: "mmd:open-workbench" });
      if (!response?.opened) throw new Error(response?.error || "无法打开工作台");
      setStatus("已在新标签页打开工作台");
    } catch (error) {
      setStatus(error.message || "无法打开工作台", "error");
    } finally {
      button.disabled = false;
    }
  });
  panel.querySelector("#pin").addEventListener("click", () => {
    pinned = !pinned;
    pinButton.setAttribute("aria-pressed", String(pinned));
    pinButton.title = pinned ? "取消固定" : "固定在当前网页";
    pinButton.setAttribute("aria-label", pinButton.title);
    panel.querySelector("#pin-status").textContent = pinned ? "已固定" : "未固定";
  });
  panel.querySelector("#tab-mmd").addEventListener("click", () => switchFormat("mmd"));
  panel.querySelector("#tab-markdown").addEventListener("click", () => switchFormat("markdown"));
  source.addEventListener("input", updatePreview);
  panel.querySelector("#copy-png").addEventListener("click", copyPng);
  panel.querySelector("#download-png").addEventListener("click", downloadPng);
  moreButton.addEventListener("click", () => { exportMenu.hidden = !exportMenu.hidden; });
  panel.querySelector("#copy-source").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(source.value);
      setStatus("源文本已复制");
    } catch {
      setStatus("无法访问剪贴板", "error");
    }
  });
  panel.querySelector("#clear-source").addEventListener("click", () => {
    source.value = "";
    updatePreview();
    exportMenu.hidden = true;
    source.focus();
  });

  document.addEventListener("pointerdown", onOutsidePointerDown, true);
  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("pointerup", onPointerUp, true);
  installKatexFonts({
    getFontData: async () => {
      const response = await chrome.runtime.sendMessage({
        type: "mmd:get-katex-fonts",
        files: KATEX_WOFF2_FONTS,
      });
      if (response?.error) throw new Error(response.error);
      return response?.fonts;
    },
    FontFaceType: FontFace,
    fontSet: document.fonts,
  }).then(refreshAfterFontLoad).catch((error) => {
    console.warn("MMD panel could not install bundled KaTeX fonts.", error);
    setStatus("公式字体加载失败", "error");
  });
  updatePreview();
  source.focus();
}
