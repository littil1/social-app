let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

export function scheduleRefresh(router: { refresh: () => void }) {
  if (refreshTimeout) return;

  refreshTimeout = setTimeout(() => {
    router.refresh();
    refreshTimeout = null;
  }, 1500);
}
