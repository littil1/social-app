type LegendBadgeMarkerProps = {
  className?: string;
};

export default function LegendBadgeMarker({
  className = "",
}: LegendBadgeMarkerProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center align-middle text-base leading-none ${className}`}
      aria-hidden="true"
    >
      👑
    </span>
  );
}
