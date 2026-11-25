# MMD to Markdown

[简体中文](README.zh-CN.md)

Normalize common AI-generated text, especially Mathpix Markdown (MMD) and math-rich output, into more portable Markdown. A draggable browser panel also lets you quickly paste, edit, and preview non-standard Markdown while staying on a web page. The project includes a full local editing workbench and a Python converter; the workbench opens from a local HTML file without starting a server.

## What It Does

- **Normalize AI-generated rich text:** Convert common Mathpix Markdown (MMD) and AI-generated math, callout, line-break, and table-wrapper syntax into more portable Markdown.
- **Preview web content in place:** Open a draggable Chrome extension panel on the current page, paste or edit non-standard Markdown, and preview its rendered result without leaving the page.
- **Edit in a full workbench:** Use separate editable MMD and Markdown versions, a live preview, conversion with confirmation before replacing manual edits, and undo.
- **Work locally:** Open text files, save the selected version as a new file, and use the Python command-line or macOS Finder entry point. Documents do not need to be uploaded to a service.
- **Render and export:** Preview math with KaTeX and copy or export the rendered preview as an image.

## Quick Start

### Local Workbench

1. Download and extract the repository ZIP from GitHub, or clone the repository.
2. Open `web/dist/index.html` in a browser. No server is needed.
3. Paste AI-generated content or open a local file, then edit, convert, and preview it.
4. Use “Save As” to save the currently selected MMD or Markdown version.

The built workbench in `web/dist/` is included in the repository.

### Chrome Extension

1. Open `chrome://extensions` in Chrome and enable Developer mode.
2. Choose “Load unpacked” and select the repository's `web/extension-dist/` directory.
3. Click the MMD Workbench toolbar icon to open the panel on the current page. “Open Workbench” opens the full workbench in a new tab.

Chrome internal or otherwise restricted pages may prevent extensions from injecting the panel.

### Python CLI

Requires Python 3 and has no third-party Python dependencies.

```bash
# Read from stdin and write the result to stdout
python3 mmd_to_markdown.py < input.mmd

# Create a .standard.md copy beside each input file
python3 mmd_to_markdown.py notes.md

# Choose an output path for one input file
python3 mmd_to_markdown.py notes.md -o notes-clean.md

# Explicitly replace the source file (use with care)
python3 mmd_to_markdown.py --in-place notes.md
```

On macOS, you can also double-click `convert.command`, select files in the file picker, and choose whether to create copies or overwrite the sources.

## Conversion Scope

The converter performs lightweight normalization of common Mathpix/AI Markdown extensions, including `\\[...\\]` / `\\(...\\)` math delimiters, common math environments, selected un-delimited math patterns, HTML line breaks, callout blocks, and some table wrappers. Fenced and inline code are preserved literally.

This is not a complete rich-text or LaTeX-to-Markdown compiler. Complex tables, macros, arbitrary LaTeX commands, and less common source formats may need manual review. The browser preview uses a Markdown renderer and KaTeX; it does not execute arbitrary HTML or LaTeX.

## Build and Test

Requires Node.js (including npm) and Python 3. The build script uses macOS `sips` to generate extension icons.

```bash
cd web
npm ci
npm test
npm run build
```

The build generates or updates `web/dist/` (local workbench) and `web/extension-dist/` (unpacked Chrome extension). Run Python tests from the repository root:

```bash
python3 -m unittest discover -s tests -v
```

## Privacy and Permissions

The local workbench and converter process documents on your device and do not require a server. The Chrome extension injects its panel into the current web page; review its permissions in `web/extension-src/manifest.json`.

## License

This repository does not currently declare a project license. Public visibility does not grant a license to reuse, modify, or distribute the code. A maintainer should choose and add a license file if reuse under open-source terms is intended.
