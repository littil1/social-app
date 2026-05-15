type LegendBadgeMarkerProps = {
  className?: string;
  variant?: "inline" | "nameOverlay" | "nameOverlayLarge" | "avatarOverlay";
};

export default function LegendBadgeMarker({
  className = "",
  variant = "inline",
}: LegendBadgeMarkerProps) {
  if (variant === "nameOverlay") {
    return (
      <span
        className={`pointer-events-none absolute right-[0.75em] top-[-0.35em] z-10 inline-flex h-[1em] w-[1em] items-center justify-center leading-none text-[0.9em] drop-shadow-[0_2px_6px_rgba(15,23,42,0.35)] rotate-[25deg] ${className}`}
        aria-hidden="true"
      >
        {"\u{1F451}"}
      </span>
    );
  }

  if (variant === "nameOverlayLarge") {
    return (
      <span
        className={`pointer-events-none absolute right-[0em] top-[0em] z-10 inline-flex h-[1em] w-[1em] items-center justify-center leading-none text-[1em] drop-shadow-[0_2px_6px_rgba(15,23,42,0.35)] rotate-[25deg] ${className}`}
        aria-hidden="true"
      >
        {"\u{1F451}"}
      </span>
    );
  }

  if (variant === "avatarOverlay") {
    return (
      <span
        className={`pointer-events-none absolute right-0 top-0 z-20 inline-flex h-[1em] w-[1em] -translate-y-[8%] translate-x-[8%] items-center justify-center leading-none rotate-[8deg] drop-shadow-[0_6px_9px_rgba(15,23,42,0.34)] ${className}`}
        aria-hidden="true"
      >
        {"\u{1F451}"}
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex h-[1em] w-[1em] shrink-0 items-end justify-center align-[0em] leading-none ${className}`}
      aria-hidden="true"
    >
      <span className="block -translate-y-[0.5em] leading-none">{"\u{1F451}"}</span>
    </span>
  );
}
