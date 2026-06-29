import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAnalyze, useDashboard, useJob } from "@/hooks/queries";
import { Button, Card, Empty, HeroAction, ProgressBar, Spinner } from "@/components/ui";
import WorkbookHeader from "@/components/WorkbookHeader";
import type { FormulaIR, WorkbookIR } from "@/types";

const VOLATILE = new Set(["RAND", "RANDBETWEEN", "RANDARRAY", "NOW", "TODAY", "INDIRECT", "OFFSET"]);

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 text-ink-400 transition-transform ${open ? "rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function Section({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-ink-50"
      >
        <span className="flex items-center gap-2.5">
          <span className="h-4 w-1 rounded-full bg-brand-500" />
          <span className="text-[0.95rem] font-bold tracking-tight text-ink-900">{title}</span>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">{count}</span>
        </span>
        <Chevron open={open} />
      </button>
      {open && (
        <div className="border-t border-ink-100 p-5">
          {count === 0 ? <Empty message="None detected." /> : children}
        </div>
      )}
    </div>
  );
}

function StatStrip({ ir }: { ir: WorkbookIR }) {
  const stats = [
    { label: "Sheets", value: ir.worksheets.length },
    { label: "Tables", value: ir.tables.length },
    { label: "Charts", value: ir.charts.length },
    { label: "Pivots", value: ir.pivot_tables.length },
    { label: "Formulas", value: ir.formulas.length },
  ];
  return (
    <div className="mb-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-ink-100 bg-white px-4 py-3 shadow-card">
          <div className="text-2xl font-bold text-ink-900">{s.value}</div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-ink-500">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function FormulaGroups({ formulas }: { formulas: FormulaIR[] }) {
  const groups = useMemo(() => {
    const m = new Map<string, { text: string; count: number; functions: string[]; sample: string }>();
    for (const f of formulas) {
      const g = m.get(f.formula);
      if (g) g.count += 1;
      else m.set(f.formula, { text: f.formula, count: 1, functions: f.functions, sample: `${f.sheet}!${f.cell}` });
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [formulas]);

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink-500">
        {groups.length} distinct formula{groups.length === 1 ? "" : "s"} across {formulas.length} cell
        {formulas.length === 1 ? "" : "s"}.
      </p>
      {groups.map((g, i) => {
        const volatile = g.functions.some((fn) => VOLATILE.has(fn));
        return (
          <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 bg-ink-50/50 px-3 py-2">
            <div className="min-w-0">
              <code className="block truncate font-mono text-xs text-ink-800">{g.text}</code>
              <span className="text-[11px] text-ink-400">e.g. {g.sample}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {volatile && (
                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700 ring-1 ring-amber-100">
                  volatile
                </span>
              )}
              <span className="rounded-md bg-ink-800 px-2 py-0.5 text-xs font-semibold text-white">×{g.count}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IRView({ ir }: { ir: WorkbookIR }) {
  return (
    <div>
      <StatStrip ir={ir} />

      {ir.warnings.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          {ir.warnings.length} parser warning(s): {ir.warnings.join("; ")}
        </div>
      )}

      <div className="space-y-3">
        <Section title="Tables" count={ir.tables.length} defaultOpen>
          <div className="space-y-4">
            {ir.tables.map((t) => (
              <div key={`${t.sheet}-${t.name}`}>
                <div className="text-sm font-semibold text-ink-800">
                  {t.name}
                  <span className="ml-2 text-xs font-normal text-ink-500">{t.sheet} · {t.row_count} rows</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {t.columns.map((c) => (
                    <span
                      key={c.name}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                        c.role === "measure"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                          : "bg-brand-50 text-brand-700 ring-1 ring-brand-100"
                      }`}
                      title={`${c.role} · ${c.data_type}`}
                    >
                      {c.name}
                      <span className="opacity-60">{c.data_type}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Worksheets" count={ir.worksheets.length}>
          <ul className="text-sm text-ink-700">
            {ir.worksheets.map((w) => (
              <li key={w.index} className="flex justify-between border-b border-ink-50 py-1.5 last:border-0">
                <span className="font-medium">{w.name}</span>
                <span className="text-ink-300">{w.used_range ?? "empty"}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Charts" count={ir.charts.length}>
          <ul className="text-sm">
            {ir.charts.map((c) => (
              <li key={c.id} className="flex items-center justify-between border-b border-ink-50 py-1.5 last:border-0">
                <span className="text-ink-700">{c.title ?? c.id}</span>
                <span className="rounded-md bg-ink-100 px-2 py-0.5 text-xs capitalize text-ink-600">{c.chart_type}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Pivot tables" count={ir.pivot_tables.length}>
          <ul className="text-sm">
            {ir.pivot_tables.map((p) => (
              <li key={`${p.sheet}-${p.name}`} className="border-b border-ink-50 py-1.5 last:border-0">
                <span className="font-medium text-ink-700">{p.name}</span>{" "}
                <span className="text-xs text-ink-400">{p.sheet} · rows: {p.rows.map((r) => r.name).join(", ") || "—"}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Named ranges" count={ir.named_ranges.length}>
          <ul className="text-sm">
            {ir.named_ranges.map((n) => (
              <li key={n.name} className="border-b border-ink-50 py-1.5 last:border-0">
                <span className="font-medium text-ink-700">{n.name}</span>{" "}
                <span className="text-xs text-ink-400">{n.refers_to}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Relationships" count={ir.relationships.length}>
          <ul className="text-sm">
            {ir.relationships.map((r, i) => (
              <li key={i} className="border-b border-ink-50 py-1.5 last:border-0 text-ink-700">
                {r.from_sheet} → {r.to_sheet} <span className="text-xs text-ink-400">{r.kind}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Conditional formats" count={ir.conditional_formats.length}>
          <ul className="text-sm">
            {ir.conditional_formats.map((c, i) => (
              <li key={i} className="border-b border-ink-50 py-1.5 last:border-0 text-ink-700">
                {c.sheet}!{c.range} <span className="text-xs text-ink-400">{c.rule_type}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Formulas" count={ir.formulas.length}>
          <FormulaGroups formulas={ir.formulas} />
        </Section>
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  const { id } = useParams();
  const workbookId = Number(id);
  const qc = useQueryClient();
  const { data, isLoading } = useDashboard(workbookId);
  const analyze = useAnalyze();
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const job = useJob(jobId);

  useEffect(() => {
    if (job.data?.status === "completed") {
      qc.invalidateQueries({ queryKey: ["dashboard", workbookId] });
      setJobId(undefined);
    }
  }, [job.data?.status, qc, workbookId]);

  if (isLoading) return <Spinner label="Loading workbook…" />;
  const wb = data?.workbook;
  if (!wb) return <Empty message="Workbook not found." />;
  const ir = wb.ir_json;

  const running = analyze.isPending || !!jobId;
  const runAnalysis = () =>
    analyze.mutate({ workbookId, runAi: true }, { onSuccess: (j) => setJobId(j.id) });

  return (
    <div>
      <WorkbookHeader
        workbookId={workbookId}
        title={wb.original_filename}
        status={wb.status}
        actions={
          ir ? (
            <Button variant="secondary" disabled={running} onClick={runAnalysis}>
              Re-analyze
            </Button>
          ) : undefined
        }
      />

      {jobId && job.data && (
        <Card title="Analysis in progress">
          <ProgressBar value={job.data.progress} />
          <p className="mt-2 text-xs text-ink-500">{job.data.message}</p>
        </Card>
      )}

      {ir ? (
        <IRView ir={ir} />
      ) : running ? null : (
        <HeroAction
          icon={
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          }
          title="Extract this workbook"
          description="Run analysis to parse the Excel file into the canonical structure and generate AI recommendations."
        >
          <Button size="lg" disabled={running} onClick={runAnalysis}>
            Run analysis
          </Button>
        </HeroAction>
      )}
    </div>
  );
}
