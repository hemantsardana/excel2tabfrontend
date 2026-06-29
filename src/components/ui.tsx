import { useState, type ReactNode } from "react";
import type { JobStatus, WorkbookStatus } from "@/types";

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-ink-100 pb-5">
      <div className="flex items-center gap-3.5">
        {icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-brand">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-ink-900">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A 22px stroke icon wrapper for page headers / nav. */
export function HeaderIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export function Card({
  title,
  children,
  actions,
  collapsible = false,
  defaultCollapsed = false,
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const showHeader = title || actions;
  const heading = title && (
    <h3 className="flex items-center gap-2 text-[0.95rem] font-bold tracking-tight text-ink-900">
      {collapsible ? (
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 text-ink-400 transition-transform ${collapsed ? "" : "rotate-90"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      ) : (
        <span className="h-4 w-1 rounded-full bg-brand-500" />
      )}
      {title}
    </h3>
  );

  return (
    <div className="rounded-xl border border-ink-100 bg-white shadow-card transition hover:shadow-cardhover">
      {showHeader && (
        <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-3.5">
          {collapsible ? (
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-expanded={!collapsed}
              className="flex flex-1 items-center text-left"
            >
              {heading}
            </button>
          ) : (
            heading
          )}
          {actions}
        </div>
      )}
      {!collapsed && <div className="p-5">{children}</div>}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  uploaded: "bg-slate-100 text-slate-700",
  analyzing: "bg-amber-100 text-amber-800",
  analyzed: "bg-blue-100 text-blue-800",
  generating: "bg-amber-100 text-amber-800",
  generated: "bg-emerald-100 text-emerald-800",
  published: "bg-violet-100 text-violet-800",
  failed: "bg-rose-100 text-rose-800",
  pending: "bg-slate-100 text-slate-700",
  running: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-600",
};

export function StatusBadge({ status }: { status: WorkbookStatus | JobStatus | string }) {
  const cls = STATUS_COLORS[status] || "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  size = "md",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
  type?: "button" | "submit";
}) {
  const base = "inline-flex items-center gap-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = {
    md: "px-3.5 py-2 text-sm",
    lg: "px-7 py-3.5 text-base shadow-brand",
  };
  const styles = {
    primary: "bg-brand-500 text-white shadow-sm hover:bg-brand-600",
    secondary: "border border-ink-100 bg-white text-ink-700 hover:bg-ink-50",
    ghost: "text-brand-600 hover:bg-brand-50",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${styles[variant]}`}>
      {children}
    </button>
  );
}

/**
 * A large, centered call-to-action used for the first action on a page
 * (e.g. "Run analysis" before anything has been generated). Once output
 * exists, pages switch to the compact button in the header instead.
 */
export function HeroAction({
  icon,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-20 text-center shadow-card">
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-brand">
          {icon}
        </div>
      )}
      <div className="max-w-md">
        <h2 className="text-xl font-bold tracking-tight text-ink-900">{title}</h2>
        {description && <p className="mt-2 text-sm leading-relaxed text-ink-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-brand-500 transition-all"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  );
}

export function Empty({ message }: { message: string }) {
  return <p className="py-6 text-center text-sm text-slate-400">{message}</p>;
}
