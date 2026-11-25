export function nextPanelAction(isOpen) {
  return isOpen ? "close" : "open";
}

export function shouldDismissPanel({ pinned, targetInside }) {
  return !pinned && !targetInside;
}

export function panelControllerAction(existingVersion, currentVersion) {
  if (!existingVersion) return "mount";
  return existingVersion === currentVersion ? "toggle" : "replace";
}

export function shouldRefreshPreviewForFontLoad({ mounted, fontLoaded }) {
  return mounted && fontLoaded;
}
