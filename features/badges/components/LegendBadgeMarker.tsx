type LegendBadgeMarkerProps = {
  className?: string;
};

export default function LegendBadgeMarker({
  className = "",
}: LegendBadgeMarkerProps) {
  return (
    <span
      className={`relative inline-flex h-[1em] w-[1em] shrink-0 items-end justify-center align-[0em] leading-none ${className}`}
      aria-hidden="true"
    >
      <span className="block -translate-y-[0.5em] leading-none">{"\u{1F451}"}</span>
    </span>
  );
}
