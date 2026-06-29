import { Fragment, useMemo, useState } from "react";
import { useLineage } from "@/hooks/queries";
import { Card, Empty, Spinner } from "@/components/ui";
import LineageGraph from "@/components/LineageGraph";
import type { LineageField, LineageStatus } from "@/types";

const STATUS_STYLE: Record<LineageStatus, { label: string; cls: string }> = {
  supported: { label: "Supported", cls: "bg-emerald-100 text-emerald-800" },
  unsupported: { label: "Needs review", cls: "bg-rose-100 text-rose-800" },
  not_translated: { label: "Not translated", cls: "bg-slate-100 text-slate-600" },
};

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white px-4 py-3 shadow-card">
      <div className={`text-2xl font-bold leading-none ${accent ?? "text-ink-900"}`}>{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-ink-400">{label}</div>
    </div>
  );
}

function LegendDot({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />
      {label}
    </span>
  );
}

function NodeChip({ label, kind }: { label: string; kind: string }) {
  const tone =
    kind === "base_column"
      ? "bg-violet-50 text-violet-700 ring-violet-100"
      : kind === "parameter"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : kind === "formula"
          ? "bg-brand-50 text-brand-700 ring-brand-100"
          : "bg-ink-50 text-ink-600 ring-ink-100";
  return <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ${tone}`}>{label}</span>;
}

function FieldDetail({ field }: { field: LineageField }) {
  return (
    <div className="animate-fade-in rounded-lg border border-ink-100 bg-ink-50/60 p-4 text-xs leading-relaxed">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Direct dependencies
          </div>
          {field.direct_dependencies.length === 0 ? (
            <span className="text-ink-400">—</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {field.direct_dependencies.map((d) => (
                <NodeChip key={d.id} label={d.label} kind={d.kind} />
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Root sources (base columns / inputs)
          </div>
          {field.root_sources.length === 0 ? (
            <span className="text-ink-400">—</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {field.root_sources.map((d) => (
                <NodeChip key={d.id} label={d.label} kind={d.kind} />
              ))}
            </div>
          )}
        </div>
      </div>

      {field.paths.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            <span>Translation journey (depth {field.depth})</span>
            <span className="flex flex-wrap items-center gap-2 text-[10px] font-medium normal-case tracking-normal text-ink-400">
              <LegendDot cls="bg-violet-400" label="base column" />
              <LegendDot cls="bg-amber-400" label="parameter" />
              <LegendDot cls="bg-blue-400" label="Excel formula" />
              <LegendDot cls="bg-indigo-400" label="Excel field" />
              <LegendDot cls="bg-cyan-600" label="Tableau calc" />
            </span>
          </div>
          <LineageGraph field={field} />
          <details className="mt-2">
            <summary className="cursor-pointer text-[11px] font-medium text-brand-600 hover:text-brand-700">
              Show chains as text
            </summary>
            <ul className="mt-1.5 space-y-1">
              {field.paths.map((p, i) => (
                <li key={i} className="font-mono text-[11px] text-ink-600">
                  {p.join("  →  ")}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}

      {field.used_by.length > 0 && (
        <div className="mt-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Used by: </span>
          <span className="text-[11px] text-ink-600">{field.used_by.join(", ")}</span>
        </div>
      )}
    </div>
  );
}

/** Reconciliation chip: was this calc actually written to the generated .twb? */
function TwbBadge({ field }: { field: LineageField }) {
  if (field.generated === true) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-100"
        title={field.twb_field ? `In .twb as "${field.twb_field}"` : "Present in generated .twb"}
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        in .twb
      </span>
    );
  }
  if (field.generated === false && field.status === "supported") {
    return (
      <span
        className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-100"
        title="Supported, but not found in the generated .twb (regenerate, or this workbook converts charts only)"
      >
        not in .twb
      </span>
    );
  }
  return null;
}

function FieldRow({
  f,
  rowOpen,
  onToggle,
  twbAvailable,
}: {
  f: LineageField;
  rowOpen: boolean;
  onToggle: () => void;
  twbAvailable: boolean;
}) {
  const st = STATUS_STYLE[f.status];
  return (
    <Fragment>
      <tr className={`border-b border-ink-50 ${rowOpen ? "" : "last:border-0"}`}>
        <td className="py-2.5 pr-3 align-top">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink-800">{f.name || f.id}</span>
            {f.name && f.name !== f.id && (
              <code className="rounded bg-ink-50 px-1.5 py-0.5 text-[10px] text-ink-400">{f.id}</code>
            )}
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize ${
                f.kind === "measure" ? "bg-brand-50 text-brand-700" : "bg-violet-50 text-violet-700"
              }`}
            >
              {f.kind === "measure" ? "measure" : "calc field"}
            </span>
          </div>
          <code className="mt-0.5 block whitespace-pre-wrap text-[11px] text-ink-500">{f.excel_formula}</code>
          <button
            type="button"
            onClick={onToggle}
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700"
          >
            <svg viewBox="0 0 24 24" className={`h-3 w-3 transition-transform ${rowOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {rowOpen ? "Hide lineage" : "Show lineage"}
          </button>
        </td>
        <td className="py-2.5 pr-3 align-top">
          {f.tableau_calculation ? (
            <code className="block whitespace-pre-wrap text-[11px] text-ink-700">{f.tableau_calculation}</code>
          ) : (
            <span className="text-[11px] text-ink-400">— not translated —</span>
          )}
        </td>
        <td className="py-2.5 align-top">
          <div className="flex flex-col items-start gap-1">
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>
              {st.label}
            </span>
            {twbAvailable && <TwbBadge field={f} />}
          </div>
        </td>
      </tr>
      {rowOpen && (
        <tr className="border-b border-ink-50 last:border-0">
          <td colSpan={3} className="pb-4">
            <FieldDetail field={f} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

export default function LineageSection({ workbookId }: { workbookId: number }) {
  const { data, isLoading } = useLineage(workbookId);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const fields = useMemo(() => {
    const all = data?.fields ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (f) =>
        f.id.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.excel_formula.toLowerCase().includes(q) ||
        (f.tableau_calculation ?? "").toLowerCase().includes(q),
    );
  }, [data, query]);

  if (isLoading) {
    return (
      <Card title="Field lineage & formula mapping">
        <Spinner label="Tracing lineage…" />
      </Card>
    );
  }
  if (!data) return null;

  if (!data.has_formulas) {
    return (
      <Card title="Field lineage & formula mapping">
        <Empty message="No Excel formulas detected — this workbook converts charts only, so there are no calculated-field mappings to trace." />
      </Card>
    );
  }

  const s = data.summary;
  const total = s.measures + s.calculated_fields;
  const supportedPct = total ? Math.round((s.supported / total) * 100) : 0;

  // The "created in Tableau" set = supported translations (exactly the rule the
  // engine uses to write calc fields into the .twb). The rest (needs-review +
  // not-translated) are auto-hidden until the user expands.
  const created = fields.filter((f) => f.status === "supported");
  const hidden = fields.filter((f) => f.status !== "supported");
  const searching = query.trim().length > 0;
  const revealHidden = showHidden || searching;
  const twbAvailable = !!data.twb_available;
  const chartsOnly = twbAvailable && (data.twb_generated_count ?? 0) === 0;

  return (
    <Card title="Field lineage & formula mapping" collapsible defaultCollapsed>
      <p className="mb-4 text-sm leading-relaxed text-ink-500">
        How each Excel formula (measure / calculated field) maps to a Tableau calculated field, traced down
        to the base columns it depends on. Showing the {created.length} field
        {created.length === 1 ? "" : "s"} that become Tableau calculated fields; {hidden.length} more
        (needs review / not translated) are hidden.
      </p>

      {twbAvailable && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-xs leading-relaxed ${
            chartsOnly
              ? "border-amber-100 bg-amber-50/60 text-amber-800"
              : "border-emerald-100 bg-emerald-50/60 text-emerald-800"
          }`}
        >
          <span className="font-semibold">Extracted from {data.twb_name}: </span>
          {chartsOnly ? (
            <>no calculated fields were found in the generated workbook.</>
          ) : (
            <>
              <b>{data.twb_measure_count ?? 0}</b> Tableau measure
              {(data.twb_measure_count ?? 0) === 1 ? "" : "s"}
              {(data.twb_calc_field_count ?? 0) > 0 && (
                <> and <b>{data.twb_calc_field_count}</b> calculated field{data.twb_calc_field_count === 1 ? "" : "s"}</>
              )}{" "}
              read directly from the .twb · <b>{data.twb_generated_count}</b> matched to the fields below
              {created.length > (data.twb_generated_count ?? 0) && (
                <> · {created.length - (data.twb_generated_count ?? 0)} supported but not found in the .twb</>
              )}
              .
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Measures" value={s.measures} accent="text-brand-600" />
        <StatCard label="Calculated fields" value={s.calculated_fields} accent="text-violet-600" />
        <StatCard label="Supported" value={`${supportedPct}%`} accent="text-emerald-600" />
        <StatCard label="Base columns" value={s.base_columns} accent="text-ink-900" />
        <StatCard label="Max depth" value={s.max_depth} accent="text-ink-900" />
      </div>

      {s.functions.length > 0 && (
        <div className="mt-4 rounded-lg border border-ink-100 bg-ink-50/60 p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Function mapping (Excel → Tableau)
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {s.functions.map((f) => (
              <span key={f.excel_fn} className="rounded-md bg-white px-2.5 py-1 shadow-card">
                <span className="font-mono font-semibold text-ink-700">{f.excel_fn}</span>
                <span className="text-brand-400"> → </span>
                <span className="font-mono text-ink-600">{f.tableau_fn}</span>
                <span className="ml-1 text-ink-400">·{f.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search ${data.fields.length} formulas…`}
        className="mt-4 w-full max-w-xs rounded-lg border border-ink-100 bg-ink-50 px-3 py-1.5 text-sm text-ink-800 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
      />

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-[11px] uppercase tracking-wider text-ink-400">
              <th className="pb-2 pr-3 font-semibold">Excel field</th>
              <th className="pb-2 pr-3 font-semibold">Tableau calculated field</th>
              <th className="pb-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {created.map((f) => (
              <FieldRow
                key={f.id}
                f={f}
                rowOpen={open.has(f.id)}
                onToggle={() => toggle(f.id)}
                twbAvailable={twbAvailable}
              />
            ))}

            {hidden.length > 0 && (
              <tr className="border-b border-ink-50">
                <td colSpan={3} className="py-2">
                  <button
                    type="button"
                    onClick={() => setShowHidden((v) => !v)}
                    disabled={searching}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-ink-50 px-3 py-1.5 text-[12px] font-medium text-ink-600 transition hover:bg-ink-100 disabled:opacity-60"
                  >
                    <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition-transform ${revealHidden ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    {revealHidden
                      ? "Hide not-created fields"
                      : `Show ${hidden.length} not-created field${hidden.length === 1 ? "" : "s"} (needs review / not translated)`}
                  </button>
                </td>
              </tr>
            )}

            {revealHidden &&
              hidden.map((f) => (
                <FieldRow
                  key={f.id}
                  f={f}
                  rowOpen={open.has(f.id)}
                  onToggle={() => toggle(f.id)}
                  twbAvailable={twbAvailable}
                />
              ))}

            {fields.length === 0 && (
              <tr>
                <td colSpan={3}>
                  <Empty message="No formulas match your search." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
