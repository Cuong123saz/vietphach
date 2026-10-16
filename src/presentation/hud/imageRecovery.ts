/** Retry transient HUD image failures; timers are bounded and owned by this UI. */
export function bindHudImageRecovery(root: HTMLElement): () => void {
  const attempts = new WeakMap<HTMLImageElement, number>();
  const timers = new Map<HTMLImageElement, ReturnType<typeof setTimeout>>();
  const onError = (event: Event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || timers.has(img)) return;
    const attempt = (attempts.get(img) ?? 0) + 1;
    attempts.set(img, attempt);
    if (attempt > 3) { console.warn(`[HUD] Image failed after retries: ${img.getAttribute('src')}`); return; }
    timers.set(img, setTimeout(() => {
      timers.delete(img);
      if (!img.isConnected) return;
      const url = new URL(img.src); url.searchParams.set('assetRetry', String(attempt)); img.src = url.href;
    }, attempt * 500));
  };
  const onLoad = (event: Event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    const timer = timers.get(img); if (timer) clearTimeout(timer);
    timers.delete(img); attempts.delete(img);
  };
  root.addEventListener('error', onError, true); root.addEventListener('load', onLoad, true);
  return () => {
    root.removeEventListener('error', onError, true); root.removeEventListener('load', onLoad, true);
    for (const timer of timers.values()) clearTimeout(timer); timers.clear();
  };
}
