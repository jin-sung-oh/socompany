import type { ReactNode } from "react";

type EmptyStateProps = {
  title?: string;
  description: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
};

export function EmptyState({ title, description, action, className, compact = false }: EmptyStateProps) {
  const classes = ["ui-empty-state", compact ? "compact" : "", className ?? ""].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      {title && <strong>{title}</strong>}
      <p>{description}</p>
      {action ? <div className="ui-empty-state-action">{action}</div> : null}
    </div>
  );
}
