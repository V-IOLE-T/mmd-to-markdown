# MMD to Markdown

**Language / 语言:** [English](README.en.md) · [简体中文](README.zh-CN.md)

A local-first Mathpix Markdown (MMD) workbench for editing and previewing MMD/Markdown, converting common MMD syntax, and using an optional Chrome floating panel or Python CLI. The workbench runs directly from a local HTML file and does not require a local server.

## Features

- Open the local HTML workbench and edit source alongside a live rendered preview.
- Keep editable MMD and Markdown versions. Conversion updates the Markdown version; the app asks before replacing manual edits and supports undoing the conversion.
- Open local text files and save the currently selected version as a new file.
- Toggle source line wrapping and use CodeMirror editing, search, and replace.
- Render math with KaTeX and copy or export the rendered preview as an image.
- Optional Chrome extension with a draggable page overlay for MMD/Markdown preview and an “Open Workbench” action.
- Python CLI and a macOS Finder file-picker/drag-and-drop entry point.

## Quick Start

### Local Workbench

1. Download and extract the repository ZIP from GitHub, or clone the repository.
2. Open `web/dist/index.html` in a browser. No server is needed.
3. Paste content or choose “Open File”, then edit, switch formats, convert, and preview.
4. Use “Save As” to save the selected version. If Markdown was edited manually, the app asks before replacing it during conversion.

The built workbench in `web/dist/` is included in the repository. To rebuild it from source, see below.

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

This is not a complete LaTeX-to-Markdown compiler. Complex tables, macros, arbitrary LaTeX commands, and less common MMD extensions may need manual review. The browser preview uses a Markdown renderer and KaTeX; it does not execute arbitrary HTML or LaTeX.

## Build from Source

Requires Node.js (including npm) and Python 3. The build script uses macOS `sips` to generate extension icons.

```bash
cd web
npm ci
npm test
npm run build
```

The build generates or updates `web/dist/` (local workbench) and `web/extension-dist/` (unpacked Chrome extension).

Run the Python tests with:

```bash
python3 -m unittest discover -s tests -v
```

## Project Layout

- `web/dist/`: offline workbench that can be opened directly.
- `web/extension-dist/`: files to load as an unpacked Chrome extension.
- `web/src/`: workbench source and rendering logic.
- `web/extension-src/`: extension source.
- `mmd_to_markdown.py`: Python converter.
- `convert.command`: macOS Finder entry point.

## Privacy

Conversion, editing, and preview run in the local browser or Python process; the workbench does not require uploading documents to a server. The browser extension injects its panel into the current page. Its permissions are defined in `web/extension-src/manifest.json`.

## License

This repository does not currently declare a project license. Public visibility does not grant a license to reuse, modify, or distribute the code. A maintainer should choose and add a license file if reuse under open-source terms is intended.
