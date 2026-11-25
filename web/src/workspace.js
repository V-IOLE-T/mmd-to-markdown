import { convertMmd } from "./convert.js";

const FORMATS = new Set(["mmd", "markdown"]);

export function defaultOutputName(filename, format) {
  const name = filename || "untitled.md";
  const stem = name.replace(/\.[^.]*$/, "").replace(/(?:\.standard|\.mmd)$/i, "") || "untitled";
  return format === "mmd" ? `${stem}.mmd.md` : `${stem}.standard.md`;
}

export function isSaveShortcut(event) {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
}

export class Workspace {
  constructor(source = "", filename = "untitled.md") {
    this.filename = filename;
    this.activeFormat = "mmd";
    this.buffers = { mmd: source, markdown: "" };
    this.saved = { ...this.buffers };
    this.lastConversion = null;
    this.hasConverted = false;
    this.conversionHistory = [];
  }

  getBuffer(format = this.activeFormat) {
    this.assertFormat(format);
    return this.buffers[format];
  }

  setBuffer(format, value) {
    this.assertFormat(format);
    this.buffers[format] = value;
  }

  switchFormat(format) {
    this.assertFormat(format);
    if (format === "markdown" && !this.hasConverted && this.buffers.markdown === "") {
      this.buffers.markdown = this.buffers.mmd;
      this.saved.markdown = this.buffers.mmd;
    }
    this.activeFormat = format;
  }

  convert({ replaceEditedMarkdown = false } = {}) {
    const markdownWasEdited = this.hasConverted
      ? this.buffers.markdown !== this.lastConversion
      : this.buffers.markdown !== this.saved.markdown;

    if (markdownWasEdited && !replaceEditedMarkdown) {
      return { needsConfirmation: true, text: this.buffers.markdown };
    }

    const text = convertMmd(this.buffers.mmd);
    this.conversionHistory.push({
      markdown: this.buffers.markdown,
      lastConversion: this.lastConversion,
      hasConverted: this.hasConverted,
    });
    this.buffers.markdown = text;
    this.lastConversion = text;
    this.hasConverted = true;
    return { needsConfirmation: false, text };
  }

  undoConversion() {
    const previous = this.conversionHistory.pop();
    if (!previous) return false;
    this.buffers.markdown = previous.markdown;
    this.lastConversion = previous.lastConversion;
    this.hasConverted = previous.hasConverted;
    return true;
  }

  canUndoConversionTo(text) {
    return this.conversionHistory.at(-1)?.markdown === text;
  }

  saveActive() {
    this.saved[this.activeFormat] = this.buffers[this.activeFormat];
  }

  hasUnsavedChanges() {
    return [...FORMATS].some((format) => this.buffers[format] !== this.saved[format]);
  }

  assertFormat(format) {
    if (!FORMATS.has(format)) throw new TypeError(`Unknown editor format: ${format}`);
  }
}
