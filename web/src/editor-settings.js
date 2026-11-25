const AUTO_WRAP_KEY = "mmd-workbench:auto-wrap";

export function loadAutoWrap(storage) {
  try {
    return storage?.getItem(AUTO_WRAP_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveAutoWrap(enabled, storage) {
  const value = Boolean(enabled);
  try {
    storage?.setItem(AUTO_WRAP_KEY, String(value));
  } catch {
    // Keep the in-memory choice even when file:// storage is unavailable.
  }
  return value;
}
