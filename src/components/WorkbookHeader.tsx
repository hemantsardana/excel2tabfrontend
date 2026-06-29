import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { StatusBadge } from "./ui";
import WorkbookStepper from "./WorkbookStepper";
import type { WorkbookStatus } from "@/types";

export default function WorkbookHeader({
  workbookId,
  title,
  status,
  actions,
}: {
  workbookId: number;
  title?: string;
  status?: WorkbookStatus;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6">
      <Link
        to="/history"
        className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 transition hover:text-brand-600"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Workbooks
      </Link>

      <div className="mt-3 flex min-w-0 items-center gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-brand">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <h1 className="truncate text-[1.4rem] font-bold tracking-tight text-ink-900">{title ?? "Workbook"}</h1>
        {status && <StatusBadge status={status} />}
      </div>

      <WorkbookStepper workbookId={workbookId} status={status} />

      {actions && (
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">{actions}</div>
      )}
    </div>
  );
}
