import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboard, useGenerate, useJob, usePublish } from "@/hooks/queries";
import { downloadAsset } from "@/api/endpoints";
import { useConversionStore } from "@/store/conversion";
import { apiError } from "@/api/client";
import { Button, Card, HeroAction, ProgressBar, Spinner, StatusBadge } from "@/components/ui";
import WorkbookHeader from "@/components/WorkbookHeader";
import type { GeneratedAssetOut } from "@/types";

const DOWNLOADABLE = new Set(["hyper", "twb", "twbx"]);

const FILE_TINT: Record<string, string> = {
  twbx: "bg-brand-50 text-brand-700 ring-brand-100",
  twb: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  hyper: "bg-emerald-50 text-emerald-700 ring-emerald-100",
};

const TYPE_LABEL: Record<string, string> = {
  worksheet: "Worksheets",
  dashboard: "Dashboards",
  story: "Stories",
  data_source: "Data Sources",
  parameter: "Parameters",
  calculated_field: "Calculated Fields",
  filter: "Filters",
};

const typeLabel = (t: string) =>
  TYPE_LABEL[t] ?? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function AssetsPage() {
  const { id } = useParams();
  const workbookId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useDashboard(workbookId);
  const stored = useConversionStore((s) => s.byWorkbook[workbookId]);
  const generate = useGenerate();
  const publish = usePublish();
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const job = useJob(jobId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (job.data?.status === "completed") {
      qc.invalidateQueries({ queryKey: ["dashboard", workbookId] });
      setJobId(undefined);
    }
    if (job.data?.status === "failed") {
      setError(job.data.error || "Generation failed.");
      setJobId(undefined);
    }
  }, [job.data?.status, job.data?.error, qc, workbookId]);

  if (isLoading) return <Spinner label="Loading…" />;
  const wb = data?.workbook;
  const runs = data?.runs ?? [];
  const latest = runs[0];

  function runGenerate() {
    setError(null);
    generate.mutate(
      {
        workbook_id: workbookId,
        mappings: stored?.mappings ?? null,
        recommendations: stored?.analysis ?? null,
        package_twbx: true,
      },
      { onSuccess: (j) => setJobId(j.id), onError: (e) => setError(apiError(e)) },
    );
  }

  const byType: Record<string, GeneratedAssetOut[]> = {};
  for (const a of latest?.assets ?? []) {
    (byType[a.asset_type] ||= []).push(a);
  }

  return (
    <div>
      <WorkbookHeader
        workbookId={workbookId}
        title={wb?.original_filename}
        status={wb?.status}
        actions={
          latest ? (
            <div className="flex items-center gap-2">
              <Button onClick={runGenerate} disabled={generate.isPending || !!jobId || !wb?.ir_json}>
                Re-generate
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/workbook/${workbookId}/validation`)}>
                Next: Validate →
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="space-y-5">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        )}

        {jobId && job.data && (
          <Card title="Generating">
            <ProgressBar value={job.data.progress} />
            <p className="mt-2 text-xs text-ink-500">{job.data.message}</p>
          </Card>
        )}

        {!latest ? (
          generate.isPending || jobId ? null : (
            <HeroAction
              icon={
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              }
              title="Generate the Tableau workbook"
              description="Build the .hyper extract, .twb workbook, and packaged .twbx from your analyzed data and AI recommendations."
            >
              <Button size="lg" onClick={runGenerate} disabled={generate.isPending || !!jobId || !wb?.ir_json}>
                Generate Tableau workbook
              </Button>
            </HeroAction>
          )
        ) : (
          <>
            <Card
              title={`Run #${latest.id} — Downloads`}
              actions={
                <div className="flex items-center gap-2">
                  <StatusBadge status={latest.status} />
                  <Button
                    variant="secondary"
                    disabled={publish.isPending}
                    onClick={() => publish.mutate({ runId: latest.id }, { onError: (e) => setError(apiError(e)) })}
                  >
                    Publish to Tableau Server
                  </Button>
                </div>
              }
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {latest.assets
                  .filter((a) => DOWNLOADABLE.has(a.asset_type))
                  .map((a) => (
                    <button
                      key={a.id}
                      onClick={() => downloadAsset(a.id, a.name)}
                      className="group flex items-center gap-3 rounded-xl border border-ink-100 bg-white px-4 py-3 text-left transition hover:border-brand-300 hover:shadow-cardhover"
                    >
                      <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-[10px] font-bold uppercase ring-1 ${FILE_TINT[a.asset_type] ?? "bg-ink-100 text-ink-600 ring-ink-100"}`}>
                        {a.asset_type}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink-800">{a.name}</span>
                        <span className="text-xs text-ink-400 group-hover:text-brand-600">Download ↓</span>
                      </span>
                    </button>
                  ))}
              </div>
            </Card>

            <div className="grid gap-5 md:grid-cols-2">
              {Object.entries(byType)
                .filter(([t]) => !DOWNLOADABLE.has(t))
                .map(([type, assets]) => (
                  <Card key={type} title={`${typeLabel(type)} · ${assets.length}`}>
                    <ul className="text-sm">
                      {assets.map((a) => (
                        <li key={a.id} className="flex items-center gap-2 border-b border-ink-50 py-1.5 last:border-0 text-ink-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                          {a.name}
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
            </div>

            {latest.explanations && (
              <Card title="Explanations">
                <p className="text-sm leading-relaxed text-ink-700">{latest.explanations.overview}</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {latest.explanations.assets.map((a, i) => (
                    <li key={i} className="rounded-lg bg-ink-50 px-3 py-2">
                      <span className="font-semibold text-ink-800">{a.asset_name}</span>{" "}
                      <span className="text-ink-500">— {a.description}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
