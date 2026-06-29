import { Fragment, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDashboard } from "@/hooks/queries";
import { useConversionStore } from "@/store/conversion";
import { Button, Card, Empty, Spinner } from "@/components/ui";
import WorkbookHeader from "@/components/WorkbookHeader";
import LineageSection from "@/components/LineageSection";
import type { AssetType, DashboardResponse, ObjectMapping } from "@/types";

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
        on ? "bg-brand-500" : "bg-ink-100"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          on ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/**
 * Excel chart type → Tableau mark class, mirroring backend
 * `tableau/twb_builder.py::_CHART_MARK` so the Process step explains the
 * conversion exactly as the engine performs it.
 */
const CHART_MARK: Record<string, string> = {
  line: "Line",
  bar: "Bar",
  column: "Bar",
  area: "Area",
  pie: "Pie",
  doughnut: "Pie",
  scatter: "Circle",
  radar: "Line",
};

function deriveMappings(data: DashboardResponse): ObjectMapping[] {
  const analysis = data.workbook.analysis_summary;
  const ir = data.workbook.ir_json;
  const out: ObjectMapping[] = [];

  // Faithful mode: when the workbook contains native Excel charts, the engine
  // reproduces each one 1:1 as a Tableau worksheet and generates nothing else
  // (see backend/tableau/engine.py::_generate_from_charts — no KPI cards, calc
  // fields or standalone filters). Mirror that here so the Process step shows
  // exactly what gets built, keyed by each chart's real title rather than the
  // generic underlying data-sheet name.
  if (ir && ir.charts.length > 0) {
    ir.charts.forEach((c) => {
      // Match the worksheet name the engine generates: title, then id, then "Chart".
      const name = c.title?.trim() || c.id || "Chart";
      out.push({
        source_type: "visualization",
        source_id: name,
        target_type: "worksheet",
        target_name: name,
        enabled: true,
        options: {
          viz_type: c.chart_type,
          sheet: c.sheet,
          series_count: c.series.length,
          mark: CHART_MARK[c.chart_type?.toLowerCase()] ?? "Line",
          category_ref: c.categories_ref ?? null,
          series: c.series.map((s) => ({ name: s.name, values_ref: s.values_ref })),
        },
      });
    });
    return out;
  }

  // AI mode: no native charts, so fall back to the AI's recommended
  // visualizations plus carried-over filters, formulas and KPIs.
  if (analysis) {
    for (const v of analysis.visualizations.recommendations) {
      out.push({
        source_type: "visualization",
        source_id: v.source_name,
        target_type: "worksheet",
        target_name: v.worksheet_name,
        enabled: true,
        options: { viz_type: v.viz_type },
      });
    }
    for (const f of analysis.layout.global_filters) {
      out.push({ source_type: "filter", source_id: f, target_type: "filter" as AssetType, target_name: f, enabled: true, options: {} });
    }
    for (const t of analysis.formula_translations.translations.filter((x) => x.supported)) {
      out.push({
        source_type: "formula",
        source_id: t.source_location ?? t.source_formula,
        target_type: "calculated_field",
        target_name: t.source_location ?? "Calculation",
        enabled: true,
        options: { tableau_calculation: t.tableau_calculation },
      });
    }
  }
  if (ir) {
    for (const k of ir.kpis) {
      out.push({ source_type: "kpi", source_id: k.label, target_type: "worksheet", target_name: k.label, enabled: true, options: { kind: "kpi_card" } });
    }
  }
  return out;
}

/** Visual metadata + ordering for each kind of Excel object we map. */
const GROUP_META: Record<
  string,
  { label: string; blurb: string; accent: string; icon: JSX.Element }
> = {
  visualization: {
    label: "Charts & visualizations",
    blurb: "Each Excel chart becomes a Tableau worksheet.",
    accent: "text-brand-600",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
      </svg>
    ),
  },
  kpi: {
    label: "KPIs",
    blurb: "Headline metrics rendered as KPI worksheets.",
    accent: "text-emerald-600",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" />
      </svg>
    ),
  },
  formula: {
    label: "Formulas → calculated fields",
    blurb: "Excel formulas translated into Tableau calculations.",
    accent: "text-violet-600",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="2" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="12" y2="16" />
      </svg>
    ),
  },
  filter: {
    label: "Filters",
    blurb: "Global filters carried over to the dashboard.",
    accent: "text-amber-600",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>
    ),
  },
};

const GROUP_ORDER = ["visualization", "kpi", "formula", "filter"];

/** Collapse groups by default once they grow past this many rows. */
const COLLAPSE_THRESHOLD = 12;
/** Show an in-group search box once a group grows past this many rows. */
const SEARCH_THRESHOLD = 8;

type IndexedMapping = ObjectMapping & { _index: number };

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white px-4 py-3 shadow-card">
      <div className={`text-2xl font-bold leading-none ${accent ?? "text-ink-900"}`}>{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-ink-400">{label}</div>
    </div>
  );
}

type ChartSeriesOpt = { name: string | null; values_ref: string | null };

/** Strip $ anchors so refs read like A3:A16 rather than $A$3:$A$16. */
function prettyRef(ref: unknown): string {
  return typeof ref === "string" && ref ? ref.replace(/\$/g, "") : "—";
}

/** A single Excel→Tableau line in the conversion-detail panel. */
function MapRow({ from, to }: { from: ReactNode; to: ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <div className="flex-1 text-ink-600">{from}</div>
      <span className="mt-0.5 shrink-0 text-brand-400">→</span>
      <div className="flex-1 font-medium text-ink-800">{to}</div>
    </div>
  );
}

/**
 * Per-chart breakdown of exactly how the Excel chart becomes a Tableau
 * worksheet — the field→shelf mapping the engine performs in
 * `ChartsTWBBuilder._build_worksheet`.
 */
function ChartConversionDetail({ mapping }: { mapping: IndexedMapping }) {
  const o = mapping.options ?? {};
  const series = (Array.isArray(o.series) ? o.series : []) as ChartSeriesOpt[];
  const mark = String(o.mark ?? "Line");
  const vizType = String(o.viz_type ?? "chart");

  return (
    <div className="animate-fade-in rounded-lg border border-ink-100 bg-ink-50/60 p-4 text-xs leading-relaxed">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        Excel → Tableau field mapping
      </div>
      <MapRow
        from={<>Category axis <span className="text-ink-400">({prettyRef(o.category_ref)})</span></>}
        to={<><b>Period</b> · dimension on Columns</>}
      />
      <MapRow
        from={
          <>
            {series.length} value series
            {series.length > 0 && (
              <span className="text-ink-400">
                {" "}({series.map((s, i) => s.name?.trim() || `Series ${i + 1}`).join(", ")})
              </span>
            )}
          </>
        }
        to={<><b>SUM(Value)</b> · measure on Rows, split by <b>Series</b> on Color</>}
      />
      <MapRow
        from={<>Chart type <span className="text-ink-400">({vizType})</span></>}
        to={<>Mark type <b>{mark}</b></>}
      />
      <MapRow
        from={<>This chart only</>}
        to={<>Worksheet filter <span className="font-mono">Chart = "{mapping.source_id}"</span></>}
      />
      <p className="mt-2 border-t border-ink-100 pt-2 text-[11px] text-ink-400">
        All charts share one Hyper extract with columns <b>Chart, Period, Series, Value</b>; the worksheets
        are assembled into a dashboard and packaged as a <b>.twbx</b>.
      </p>
    </div>
  );
}

function MappingGroup({
  type,
  rows,
  onUpdate,
  onToggleAll,
}: {
  type: string;
  rows: IndexedMapping[];
  onUpdate: (index: number, patch: Partial<ObjectMapping>) => void;
  onToggleAll: (indices: number[], enabled: boolean) => void;
}) {
  const meta = GROUP_META[type] ?? {
    label: type,
    blurb: "",
    accent: "text-ink-600",
    icon: null as unknown as JSX.Element,
  };
  const [open, setOpen] = useState(rows.length <= COLLAPSE_THRESHOLD);
  const [query, setQuery] = useState("");
  const [openRows, setOpenRows] = useState<Set<number>>(new Set());

  const toggleRow = (i: number) =>
    setOpenRows((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const enabledCount = rows.filter((r) => r.enabled).length;
  const allOn = enabledCount === rows.length;

  // Charts carry conversion metadata (mark, series count) we can explain.
  const isCharts = type === "visualization" && rows.some((r) => r.options?.series_count !== undefined);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.source_id.toLowerCase().includes(q) || r.target_name.toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-3.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-3 text-left"
        >
          <span
            className={`flex h-5 w-5 items-center justify-center text-ink-400 transition-transform ${open ? "rotate-90" : ""}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
          <span className={meta.accent}>{meta.icon}</span>
          <span>
            <span className="flex items-center gap-2 text-[0.95rem] font-bold tracking-tight text-ink-900">
              {meta.label}
              <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-500">
                {enabledCount}/{rows.length}
              </span>
            </span>
            {meta.blurb && <span className="mt-0.5 block text-xs text-ink-400">{meta.blurb}</span>}
          </span>
        </button>
        <Button variant="secondary" onClick={() => onToggleAll(rows.map((r) => r._index), !allOn)}>
          {allOn ? "Disable all" : "Enable all"}
        </Button>
      </div>

      {open && (
        <div className="px-5 py-4">
          {isCharts && (
            <div className="mb-4 rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-3 text-xs leading-relaxed text-ink-600">
              <span className="font-semibold text-brand-700">How each chart converts:</span>{" "}
              the chart's data is loaded into a tidy extract and rebuilt as a Tableau worksheet —
              <span className="font-medium text-ink-700"> Period</span> on Columns,
              <span className="font-medium text-ink-700"> SUM(Value)</span> on Rows,
              <span className="font-medium text-ink-700"> Series</span> on Color, filtered to that chart.
              The Excel chart type sets the Tableau mark (e.g. line → Line, column → Bar, pie → Pie).
            </div>
          )}
          {rows.length > SEARCH_THRESHOLD && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${rows.length} items…`}
              className="mb-3 w-full max-w-xs rounded-lg border border-ink-100 bg-ink-50 px-3 py-1.5 text-sm text-ink-800 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
            />
          )}
          {visible.length === 0 ? (
            <Empty message="No items match your search." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-[11px] uppercase tracking-wider text-ink-400">
                    <th className="pb-2 pr-3 font-semibold">Use</th>
                    <th className="pb-2 pr-3 font-semibold">Excel object</th>
                    <th className="pb-2 pr-3 font-semibold">Tableau target</th>
                    <th className="pb-2 font-semibold">Name</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((m) => {
                    const hasDetail = m.options?.series_count !== undefined;
                    const rowOpen = openRows.has(m._index);
                    return (
                      <Fragment key={m._index}>
                        <tr className={`border-b border-ink-50 ${rowOpen ? "" : "last:border-0"} ${m.enabled ? "" : "opacity-50"}`}>
                          <td className="py-2.5 pr-3 align-top">
                            <Toggle on={m.enabled} onChange={(v) => onUpdate(m._index, { enabled: v })} />
                          </td>
                          <td className="py-2.5 pr-3 align-top">
                            <span className="text-ink-700">{m.source_id}</span>
                            {hasDetail && (
                              <span className="mt-0.5 block text-[11px] text-ink-400">
                                {String(m.options.viz_type ?? "chart")} chart · {String(m.options.series_count)}{" "}
                                series{m.options.sheet ? ` · sheet "${String(m.options.sheet)}"` : ""}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pr-3 align-top">
                            <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium capitalize text-brand-700 ring-1 ring-brand-100">
                              {m.target_type.replace("_", " ")}
                            </span>
                            {m.options?.mark !== undefined && (
                              <span className="mt-0.5 block text-[11px] text-ink-400">{String(m.options.mark)} mark</span>
                            )}
                          </td>
                          <td className="py-2.5 align-top">
                            <input
                              value={m.target_name}
                              onChange={(e) => onUpdate(m._index, { target_name: e.target.value })}
                              className="w-full rounded-lg border border-ink-100 bg-ink-50 px-2.5 py-1.5 text-sm text-ink-800 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
                            />
                            {hasDetail && (
                              <button
                                type="button"
                                onClick={() => toggleRow(m._index)}
                                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700"
                              >
                                <svg viewBox="0 0 24 24" className={`h-3 w-3 transition-transform ${rowOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                                {rowOpen ? "Hide conversion details" : "Show conversion details"}
                              </button>
                            )}
                          </td>
                        </tr>
                        {hasDetail && rowOpen && (
                          <tr className="border-b border-ink-50 last:border-0">
                            <td />
                            <td colSpan={3} className="pb-4 pr-3">
                              <ChartConversionDetail mapping={m} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MappingPage() {
  const { id } = useParams();
  const workbookId = Number(id);
  const navigate = useNavigate();
  const { data, isLoading } = useDashboard(workbookId);
  const stored = useConversionStore((s) => s.byWorkbook[workbookId]);
  const setMappings = useConversionStore((s) => s.setMappings);

  const derived = useMemo(() => (data ? deriveMappings(data) : []), [data]);

  useEffect(() => {
    if (data && !stored?.mappings && derived.length > 0) {
      setMappings(workbookId, derived);
    }
  }, [data, derived, stored?.mappings, setMappings, workbookId]);

  const wb = data?.workbook;
  const mappings = stored?.mappings ?? derived;

  // Group mappings by source_type while remembering each row's original index,
  // so toggles/renames still write back to the correct entry in the flat list.
  const groups = useMemo(() => {
    const byType = new Map<string, IndexedMapping[]>();
    mappings.forEach((m, i) => {
      const list = byType.get(m.source_type) ?? [];
      list.push({ ...m, _index: i });
      byType.set(m.source_type, list);
    });
    const ordered = [...byType.keys()].sort(
      (a, b) => (GROUP_ORDER.indexOf(a) + 1 || 99) - (GROUP_ORDER.indexOf(b) + 1 || 99),
    );
    return ordered.map((type) => ({ type, rows: byType.get(type)! }));
  }, [mappings]);

  if (isLoading) return <Spinner label="Loading…" />;
  if (!wb?.analysis_summary && !wb?.ir_json) {
    return (
      <div>
        <WorkbookHeader workbookId={workbookId} title={wb?.original_filename} status={wb?.status} />
        <Empty message="Analyze the workbook first to generate mappings." />
      </div>
    );
  }

  const enabledCount = mappings.filter((m) => m.enabled).length;

  // Charts-mode conversion stats for the overview panel.
  const chartRows = mappings.filter((m) => m.options?.series_count !== undefined);
  const markCounts = chartRows.reduce<Record<string, number>>((acc, m) => {
    const mark = String(m.options?.mark ?? "Line");
    acc[mark] = (acc[mark] ?? 0) + 1;
    return acc;
  }, {});
  const totalSeries = chartRows.reduce((n, m) => n + Number(m.options?.series_count ?? 0), 0);

  function update(index: number, patch: Partial<ObjectMapping>) {
    const next = mappings.map((m, i) => (i === index ? { ...m, ...patch } : m));
    setMappings(workbookId, next);
  }

  function toggleAll(indices: number[], enabled: boolean) {
    const set = new Set(indices);
    setMappings(
      workbookId,
      mappings.map((m, i) => (set.has(i) ? { ...m, enabled } : m)),
    );
  }

  return (
    <div>
      <WorkbookHeader
        workbookId={workbookId}
        title={wb?.original_filename}
        status={wb?.status}
        actions={
          <Button onClick={() => navigate(`/workbook/${workbookId}/assets`)}>
            Next: Generated Assets →
          </Button>
        }
      />

      <Card title="What we'll build in Tableau">
        <p className="mb-4 text-sm leading-relaxed text-ink-500">
          We grouped every object found in your workbook by what it becomes in Tableau. Toggle anything off
          to skip it, rename a target, or collapse a section to focus. {enabledCount} of {mappings.length}{" "}
          objects are currently included.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {GROUP_ORDER.map((type) => {
            const rows = groups.find((g) => g.type === type)?.rows ?? [];
            if (rows.length === 0) return null;
            return (
              <StatCard
                key={type}
                label={GROUP_META[type]?.label ?? type}
                value={rows.length}
                accent={GROUP_META[type]?.accent}
              />
            );
          })}
          {chartRows.length > 0 && <StatCard label="Data series" value={totalSeries} accent="text-brand-600" />}
        </div>

        {chartRows.length > 0 && (
          <div className="mt-4 rounded-lg border border-ink-100 bg-ink-50/60 p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              Conversion pipeline
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-ink-600">
              {["Read Excel charts", "Consolidate into one Hyper extract", "Build a worksheet per chart", "Assemble dashboard", "Package .twbx"].map(
                (step, i, arr) => (
                  <Fragment key={step}>
                    <span className="rounded-md bg-white px-2.5 py-1 shadow-card">{step}</span>
                    {i < arr.length - 1 && <span className="text-brand-400">→</span>}
                  </Fragment>
                ),
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-ink-500">
              <span>
                Extract schema:{" "}
                <span className="font-mono text-ink-700">Chart · Period · Series · Value</span>
              </span>
              <span>
                Marks used:{" "}
                {Object.entries(markCounts)
                  .map(([mark, n]) => `${mark} ×${n}`)
                  .join(", ")}
              </span>
            </div>
          </div>
        )}
      </Card>

      <div className="mt-5">
        <LineageSection workbookId={workbookId} />
      </div>

      <div className="mt-5 space-y-4">
        {groups.map(({ type, rows }) => (
          <MappingGroup key={type} type={type} rows={rows} onUpdate={update} onToggleAll={toggleAll} />
        ))}
      </div>
    </div>
  );
}
