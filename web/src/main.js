import { basicSetup, EditorView } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { openSearchPanel } from "@codemirror/search";
import { Compartment, EditorState, Transaction } from "@codemirror/state";
import { renderMarkdown, renderMmd } from "./render.js";
import { defaultOutputName, isSaveShortcut, Workspace } from "./workspace.js";
import { locateSourceTarget } from "./preview-navigation.js";
import { loadAutoWrap, saveAutoWrap } from "./editor-settings.js";

const byId = (id) => document.getElementById(id);
let workspace = new Workspace();
let statusTimeout;
const fileInput = byId("file-input");
const lineWrappingCompartment = new Compartment();
let preferenceStorage;
try { preferenceStorage = window.localStorage; } catch { preferenceStorage = null; }
let autoWrap = loadAutoWrap(preferenceStorage);

function createEditorState(text) {
  return EditorState.create({
    doc: text,
    extensions: [
      basicSetup,
      markdown(),
      lineWrappingCompartment.of(autoWrap ? EditorView.lineWrapping : []),
      EditorView.theme({
        "&": { height: "100%", fontSize: "14px" },
        ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.72" },
        ".cm-content": { padding: "22px 24px 36px" },
        ".cm-gutters": { backgroundColor: "#f7f8f5", border: "none", color: "#8a928d" },
        ".cm-activeLineGutter": { backgroundColor: "#edf0eb" },
        ".cm-activeLine": { backgroundColor: "#f7f9f5" },
        ".cm-focused": { outline: "none" },
        ".cm-selectionBackground": { background: "#cde9df !important" },
      }),
      EditorView.updateListener.of(onEditorUpdate),
    ],
  });
}

const view = new EditorView({
  parent: byId("editor"),
  state: createEditorState(""),
});

function onEditorUpdate(update) {
  if (!update.docChanged) {
    updateCursor();
    return;
  }

  const text = update.state.doc.toString();
  if (
    workspace.activeFormat === "markdown" &&
    update.transactions.some((transaction) => transaction.isUserEvent("undo")) &&
    workspace.canUndoConversionTo(text)
  ) {
    workspace.undoConversion();
  }
  workspace.setBuffer(workspace.activeFormat, text);
  renderWorkspace();
}

function updateCursor() {
  const selection = view.state.selection.main;
  const line = view.state.doc.lineAt(selection.head);
  byId("cursor-position").textContent = `第 ${line.number} 行，列 ${selection.head - line.from + 1}`;
  byId("character-count").textContent = `${Array.from(view.state.doc.toString()).length} 字符`;
}

function updateSaveState() {
  const dirty = workspace.hasUnsavedChanges();
  byId("save-state").classList.toggle("is-dirty", dirty);
  byId("save-label").textContent = dirty ? "未保存" : "已保存";
}

function renderWorkspace() {
  const format = workspace.activeFormat;
  const isMmd = format === "mmd";
  byId("mode-mmd").setAttribute("aria-selected", String(isMmd));
  byId("mode-markdown").setAttribute("aria-selected", String(!isMmd));
  byId("editor-heading").textContent = isMmd ? "MMD 源码" : "Markdown 源码";
  byId("editor-meta").textContent = isMmd ? "UTF-8 · Mathpix Markdown" : "UTF-8 · GitHub 风格 Markdown";
  byId("preview-format").textContent = isMmd ? "MMD 内容" : "Markdown 内容";
  byId("toggle-wrap").setAttribute("aria-pressed", String(autoWrap));
  byId("document-name").textContent = workspace.filename;
  const source = workspace.getBuffer(format);
  byId("preview").innerHTML = source.trim()
    ? isMmd ? renderMmd(source) : renderMarkdown(source)
    : '<div class="preview-empty"><span class="preview-empty-mark" aria-hidden="true">M</span><strong>预览为空</strong><p>在左侧输入或粘贴内容</p></div>';
  byId("convert").innerHTML = isMmd
    ? '转换为 Markdown <span aria-hidden="true">→</span>'
    : '重新转换 <span aria-hidden="true">↻</span>';
  updateSaveState();
  updateCursor();
}

function setStatus(message, temporary = false) {
  clearTimeout(statusTimeout);
  byId("status-message").textContent = message;
  if (temporary) {
    statusTimeout = setTimeout(() => {
      byId("status-message").textContent = "本地编辑 · 自动预览";
    }, 4000);
  }
}

function switchFormat(format) {
  if (format === workspace.activeFormat) return;
  workspace.switchFormat(format);
  view.setState(createEditorState(workspace.getBuffer(format)));
  renderWorkspace();
}

function convertToMarkdown() {
  const previousMarkdown = workspace.getBuffer("markdown");
  let result = workspace.convert();
  if (result.needsConfirmation) {
    const confirmed = window.confirm("Markdown 已手动修改。重新转换会替换这些修改，是否继续？可以使用撤销恢复。");
    if (!confirmed) return;
    result = workspace.convert({ replaceEditedMarkdown: true });
  }

  if (workspace.activeFormat !== "markdown") {
    workspace.switchFormat("markdown");
    view.setState(createEditorState(previousMarkdown));
  }
  const end = view.state.doc.length;
  view.dispatch({
    changes: { from: 0, to: end, insert: result.text },
    selection: { anchor: result.text.length },
    annotations: Transaction.userEvent.of("input"),
  });
  setStatus("转换完成。Markdown 版本已更新，可继续编辑或撤销。", true);
}

function confirmDiscard() {
  return !workspace.hasUnsavedChanges() || window.confirm("当前有未保存的修改。继续操作会丢弃这些修改，是否继续？");
}

async function openSelectedFile(file) {
  try {
    const text = await file.text();
    workspace = new Workspace(text, file.name);
    view.setState(createEditorState(text));
    renderWorkspace();
    setStatus(`已打开 ${file.name}`);
  } catch (error) {
    setStatus(`无法读取文件：${error.message}`);
  }
}

async function saveWithPicker() {
  const suggestedName = defaultOutputName(workspace.filename, workspace.activeFormat);
  const content = workspace.getBuffer();
  try {
    if (typeof window.showSaveFilePicker === "function") {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: "Markdown 文件", accept: { "text/markdown": [".md"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      workspace.filename = handle.name;
    } else {
      const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = suggestedName;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      workspace.filename = suggestedName;
    }
    workspace.saveActive();
    renderWorkspace();
    setStatus(`已保存 ${workspace.filename}`);
  } catch (error) {
    if (error.name === "AbortError") return;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = suggestedName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    workspace.filename = suggestedName;
    workspace.saveActive();
    renderWorkspace();
    setStatus(`已下载副本 ${suggestedName}`);
  }
}

byId("open-file").addEventListener("click", () => {
  fileInput.value = "";
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const [file] = fileInput.files ?? [];
  if (file && confirmDiscard()) openSelectedFile(file);
  fileInput.value = "";
});

byId("save-file").addEventListener("click", saveWithPicker);
byId("mode-mmd").addEventListener("click", () => switchFormat("mmd"));
byId("mode-markdown").addEventListener("click", () => switchFormat("markdown"));
byId("convert").addEventListener("click", convertToMarkdown);
byId("find").addEventListener("click", () => openSearchPanel(view));
byId("toggle-wrap").addEventListener("click", () => {
  autoWrap = saveAutoWrap(!autoWrap, preferenceStorage);
  view.dispatch({
    effects: lineWrappingCompartment.reconfigure(autoWrap ? EditorView.lineWrapping : []),
  });
  byId("toggle-wrap").setAttribute("aria-pressed", String(autoWrap));
  setStatus(autoWrap ? "源码自动换行已开启" : "源码自动换行已关闭", true);
});
byId("preview").addEventListener("dblclick", (event) => {
  const block = event.target.closest("[data-source-line]");
  if (!block) return;
  const selectedText = window.getSelection()?.toString() ?? "";
  const target = locateSourceTarget(
    view.state.doc.toString(),
    Number(block.dataset.sourceLine),
    selectedText,
  );
  const line = view.state.doc.line(target.lineNumber);
  const from = line.from + target.from;
  const to = line.from + target.to;
  view.dispatch({
    selection: { anchor: from, head: to },
    effects: EditorView.scrollIntoView(from, { y: "center" }),
  });
  view.focus();
});
window.addEventListener("keydown", (event) => {
  if (!isSaveShortcut(event)) return;
  event.preventDefault();
  saveWithPicker();
});

window.addEventListener("beforeunload", (event) => {
  if (!workspace.hasUnsavedChanges()) return;
  event.preventDefault();
  event.returnValue = "";
});

renderWorkspace();
setStatus("打开文件或粘贴内容以开始");
