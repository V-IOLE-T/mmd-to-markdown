#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

if [ "$#" -eq 0 ]; then
  # When launched by double-click, Finder does not pass dropped files as arguments.
  # Open a native multi-select dialog so the same script works without Terminal.
  set +e
  selected_files="$(osascript <<'APPLESCRIPT' 2>/dev/null
set selectedFiles to choose file with prompt "请选择一个或多个 Markdown 文件：" with multiple selections allowed
set pathList to {}
repeat with selectedFile in selectedFiles
  set end of pathList to POSIX path of selectedFile
end repeat
set text item delimiters to (ASCII character 31)
return pathList as text
APPLESCRIPT
)"
  set -e

  if [ -z "$selected_files" ]; then
    echo "已取消。"
    exit 0
  fi

  IFS=$'\037' read -r -a selected_array <<< "$selected_files"
  set -- "${selected_array[@]}"
fi

file_count="$#"
set +e
choice="$(osascript <<APPLESCRIPT 2>/dev/null
button returned of (display dialog "已选择 ${file_count} 个文件。请选择处理方式：" buttons {"取消", "生成副本", "覆盖源文件"} default button "生成副本" cancel button "取消")
APPLESCRIPT
)"
set -e

case "$choice" in
  "覆盖源文件")
    python3 "$SCRIPT_DIR/mmd_to_markdown.py" --in-place "$@"
    ;;
  "生成副本")
    python3 "$SCRIPT_DIR/mmd_to_markdown.py" "$@"
    ;;
  *)
    echo "已取消。"
    exit 0
    ;;
esac
echo
read -r -p "转换完成，按回车退出..." _
