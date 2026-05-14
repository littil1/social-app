"use client";

import { useEffect } from "react";
import { trackEvent } from "@/shared/lib/analytics";

export default function RoadAnalyticsEvents() {
  useEffect(() => {
    trackEvent("road_viewed", { source: "direct" });

    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const element = target.closest<HTMLElement>("[data-analytics-event]");
      const eventName = element?.dataset.analyticsEvent;
      if (!eventName) return;

      if (eventName === "road_cta_clicked") {
        trackEvent(eventName, {
          target: element.dataset.analyticsTarget ?? "input",
        });
        return;
      }

      trackEvent(eventName);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
