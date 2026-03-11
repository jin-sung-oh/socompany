type LoadingSkeletonProps = {
  lines?: number;
  className?: string;
  compact?: boolean;
  showBlock?: boolean;
};

const lineWidths = ["100%", "88%", "72%", "94%"];

export function LoadingSkeleton({
  lines = 3,
  className,
  compact = false,
  showBlock = false,
}: LoadingSkeletonProps) {
  const classes = ["ui-loading-skeleton", compact ? "compact" : "", className ?? ""].filter(Boolean).join(" ");

  return (
    <div className={classes} aria-hidden="true">
      {showBlock ? <div className="ui-loading-skeleton-block" /> : null}
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={`${lines}-${index}`}
          className="ui-loading-skeleton-line"
          style={{ width: lineWidths[index % lineWidths.length] }}
        />
      ))}
    </div>
  );
}
