export async function renderPreviewPng(preview, toBlob) {
  const blob = await toBlob(preview, {
    pixelRatio: 2,
    backgroundColor: "#fff",
  });
  if (!blob) throw new Error("无法生成 PNG 图片");
  return blob;
}

export async function copyPngToClipboard(blob, clipboard, ClipboardItemType) {
  if (!clipboard?.write || !ClipboardItemType) {
    throw new Error("当前页面不支持复制图片，请下载 PNG 文件");
  }
  await clipboard.write([new ClipboardItemType({ "image/png": blob })]);
}
