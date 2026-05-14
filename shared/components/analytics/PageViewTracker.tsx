"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/shared/lib/analytics";

export default function PageViewTracker() {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastPathRef.current === pathname) return;

    lastPathRef.current = pathname;
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
