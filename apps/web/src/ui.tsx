import type { ReactNode } from "react";

export const buttonClass =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-line bg-canvas px-3 py-2 text-xs whitespace-nowrap enabled:hover:border-fg";
export const primaryClass = `${buttonClass} border-fg bg-fg text-canvas enabled:hover:border-fg enabled:hover:bg-fg/85`;
export const iconButtonClass =
  "inline-grid size-8 shrink-0 place-items-center rounded-md text-muted enabled:hover:bg-soft enabled:hover:text-fg";
export const inputClass =
  "min-h-10 w-full rounded-md border border-line bg-canvas px-3 py-2.5 text-sm text-fg placeholder:text-muted/70";
export const fieldClass = "grid min-w-0 gap-2 text-xs text-muted";
export const panelClass = "rounded-xl border border-line bg-canvas";
export const headingClass =
  "text-2xl leading-tight tracking-[-0.035em] lg:text-[28px]";

export function EmptyState({
  icon,
  title,
  detail,
  action,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 px-6 py-8 text-center">
      <span className="text-muted" aria-hidden="true">
        {icon}
      </span>
      <h3 className="text-sm">{title}</h3>
      <p className="max-w-sm text-xs leading-relaxed text-muted">{detail}</p>
      {action}
    </div>
  );
}
export function LoadingRows() {
  return (
    <div
      role="status"
      aria-label="Loading Content"
      className="min-h-0 overflow-hidden"
    >
      <span className="sr-only">Loading…</span>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-20 border-t border-line bg-soft motion-safe:animate-pulse"
        />
      ))}
    </div>
  );
}

export type StatusTone = "info" | "error" | "warning" | "success";
const statusDotClass = {
  info: "bg-status-blue",
  error: "bg-status-red",
  warning: "bg-status-yellow",
  success: "bg-status-green",
} satisfies Record<StatusTone, string>;

export function StatusDot({ tone }: { tone: StatusTone }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-1.5 shrink-0 rounded-full ${statusDotClass[tone]}`}
    />
  );
}
