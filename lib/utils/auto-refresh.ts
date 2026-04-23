export function setAutoRefreshPaused(value: boolean) {
  if (typeof window === "undefined") return;
  window.__APP_PAUSE_AUTO_REFRESH__ = value;
}

export function isAutoRefreshPaused() {
  if (typeof window === "undefined") return false;
  return !!window.__APP_PAUSE_AUTO_REFRESH__;
}