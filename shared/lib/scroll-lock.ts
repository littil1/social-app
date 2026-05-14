"use client";

type ScrollLockSnapshot = {
  bodyOverflow: string;
  htmlOverflow: string;
};

let activeScrollLocks = 0;
let scrollLockSnapshot: ScrollLockSnapshot | null = null;

export function lockDocumentScroll() {
  if (typeof document === "undefined") {
    return () => {};
  }

  if (activeScrollLocks === 0) {
    scrollLockSnapshot = {
      bodyOverflow: document.body.style.overflow,
      htmlOverflow: document.documentElement.style.overflow,
    };
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }

  activeScrollLocks += 1;
  let released = false;

  return () => {
    if (released) return;

    released = true;
    activeScrollLocks = Math.max(0, activeScrollLocks - 1);

    if (activeScrollLocks > 0 || !scrollLockSnapshot) {
      return;
    }

    document.body.style.overflow = scrollLockSnapshot.bodyOverflow;
    document.documentElement.style.overflow = scrollLockSnapshot.htmlOverflow;
    scrollLockSnapshot = null;
  };
}
