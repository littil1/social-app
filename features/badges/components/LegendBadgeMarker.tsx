type LegendBadgeMarkerProps = {
  className?: string;
};

export default function LegendBadgeMarker({
  className = "",
}: LegendBadgeMarkerProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center text-base leading-none ${className}`}
      aria-hidden="true"
    >
      👑
    </span>
  );
}
