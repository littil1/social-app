function getScrollableParent(element: HTMLElement) {
  let parent = element.parentElement;

  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    const canScroll =
      (overflowY === "auto" || overflowY === "scroll") &&
      parent.scrollHeight > parent.clientHeight;

    if (canScroll) return parent;

    parent = parent.parentElement;
  }

  return null;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function scrollIntoViewIfNeeded(element: HTMLElement) {
  if (typeof window === "undefined") return;

  const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";
  const isMobile = window.matchMedia("(max-width: 639px)").matches;
  const topOffset = 20;
  const bottomOffset = isMobile ? 128 : 40;
  const rect = element.getBoundingClientRect();
  const scrollParent = getScrollableParent(element);

  if (!scrollParent) {
    const isVisible =
      rect.top >= topOffset && rect.bottom <= window.innerHeight - bottomOffset;

    if (isVisible) return;

    window.scrollTo({
      top: Math.max(0, window.scrollY + rect.top - topOffset),
      behavior,
    });
    return;
  }

  const parentRect = scrollParent.getBoundingClientRect();
  const isVisible =
    rect.top >= parentRect.top + topOffset &&
    rect.bottom <= parentRect.bottom - 24;

  if (isVisible) return;

  scrollParent.scrollTo({
    top: Math.max(
      0,
      scrollParent.scrollTop + rect.top - parentRect.top - topOffset
    ),
    behavior,
  });
}

export function scheduleScrollIntoViewIfNeeded(
  element: HTMLElement | null
) {
  if (!element || typeof window === "undefined") return;

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      scrollIntoViewIfNeeded(element);
    });
  });
}
