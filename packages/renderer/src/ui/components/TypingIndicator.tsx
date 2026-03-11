type TypingIndicatorProps = {
  label?: string;
  className?: string;
  compact?: boolean;
  tone?: "default" | "accent";
};

export function TypingIndicator({
  label = "응답 생성 중",
  className,
  compact = false,
  tone = "default",
}: TypingIndicatorProps) {
  const classes = [
    "ui-typing-indicator",
    compact ? "compact" : "",
    tone === "accent" ? "accent" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} role="status" aria-live="polite">
      <div className="ui-typing-indicator-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      {label ? <span className="ui-typing-indicator-label">{label}</span> : null}
    </div>
  );
}
