# MMD to Markdown

**语言 / Language:** [简体中文](README.zh-CN.md) · [English](README.md)

这个项目主要解决两个问题：把常见 AI 工具输出的富文本整理为更规范、可移植的 Markdown；在网页里通过可拖动的 Chrome 悬浮框，快速预览和整理不规范的 Markdown。项目也提供完整的本地编辑工作台和 Python 转换工具，工作台直接打开本地 HTML 即可使用，无需启动服务。

## 功能

- 双击本地 HTML 工作台，在同一界面编辑源码并查看实时渲染预览。
- 切换 MMD 和 Markdown 两个可编辑版本；转换会更新 Markdown 版本，已有手动修改时会先询问，并可撤销转换。
- 打开本地文本文件并将当前选中版本另存为新文件。
- 开关源码自动换行；支持 CodeMirror 的编辑、查找和替换能力。
- 使用 KaTeX 渲染数学公式，预览支持复制或导出渲染图片。
- 可选 Chrome 扩展：在网页上打开可拖动浮层，支持 MMD/Markdown 预览与“打开工作台”。
- 提供 Python CLI 和 macOS Finder 拖拽/文件选择入口。

## 快速使用

### 本地工作台

1. 从 GitHub 下载项目 ZIP 并解压，或克隆仓库。
2. 打开 `web/dist/index.html`。无需运行服务器。
3. 粘贴内容，或点击“打开文件”；切换格式、编辑、转换并预览。
4. 点击“另存为”保存当前选中的版本。转换前如果 Markdown 已编辑，工作台会询问是否替换。

`web/dist/` 是随仓库提供的构建产物。若从源码重新构建，请见下文。

### Chrome 扩展

1. 在 Chrome 打开 `chrome://extensions` 并启用“开发者模式”。
2. 选择“加载已解压的扩展程序”，然后选中项目的 `web/extension-dist/` 目录。
3. 点击工具栏中的 MMD 工作台图标，在当前网页打开浮层。浮层中的“打开工作台”会在新标签页打开完整工作台。

浏览器的内部页面或受限页面可能不允许扩展注入浮层。

### Python 命令行

需要 Python 3，无第三方 Python 依赖。

```bash
# 从标准输入读取，结果输出到标准输出
python3 mmd_to_markdown.py < input.mmd

# 为每个输入文件生成同目录的 .standard.md 副本
python3 mmd_to_markdown.py notes.md

# 指定单文件输出位置
python3 mmd_to_markdown.py notes.md -o notes-clean.md

# 显式覆盖源文件（谨慎使用）
python3 mmd_to_markdown.py --in-place notes.md
```

macOS 用户也可以双击 `convert.command`，通过文件选择器选择文件，再选择生成副本或覆盖源文件。

## 转换范围

转换器针对常见 Mathpix/AI Markdown 扩展做轻量规范化，包括 `\\[...\\]` / `\\(...\\)` 数学定界符、常见数学环境、部分未加定界符的公式写法、HTML 换行和提示块，以及部分表格包装命令。围栏代码块和行内代码会作为字面内容保留。

它不是完整的 LaTeX 转 Markdown 编译器。复杂表格、宏、任意 LaTeX 命令或不常见的 MMD 扩展仍可能需要手工检查。网页预览使用 Markdown 渲染器和 KaTeX，并不执行任意 HTML/LaTeX。

## 从源码构建

要求 Node.js（含 npm）、Python 3；构建脚本在 macOS 上使用系统 `sips` 生成扩展图标。

```bash
cd web
npm ci
npm test
npm run build
```

构建会生成或更新 `web/dist/`（本地工作台）和 `web/extension-dist/`（可加载的 Chrome 扩展）。

Python 测试：

```bash
python3 -m unittest discover -s tests -v
```

## 项目结构

- `web/dist/`：可直接打开的离线工作台。
- `web/extension-dist/`：Chrome“加载已解压的扩展程序”所需文件。
- `web/src/`：工作台源码与渲染逻辑。
- `web/extension-src/`：扩展源码。
- `mmd_to_markdown.py`：Python 转换器。
- `convert.command`：macOS Finder 交互入口。

## 隐私

转换、编辑和预览在本地浏览器或本地 Python 进程中完成；工作台不需要将文档上传到服务端。使用浏览器扩展时，它需要在当前网页中注入浮层，且 Chrome 扩展权限以 `web/extension-src/manifest.json` 为准。

## 许可证

当前仓库未声明项目许可证。公开可见不等于已授予他人复用、修改或分发代码的许可；如需开源许可，请由维护者选择并添加对应许可证文件。
