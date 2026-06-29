import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDashboard, useJob, useValidate } from "@/hooks/queries";
import { apiError } from "@/api/client";
import { Button, Card, Empty, ProgressBar, Spinner } from "@/components/ui";
import WorkbookHeader from "@/components/WorkbookHeader";
import type { AIValidationReport, GeneratedAssetOut, ValidationSeverity } from "@/types";

type Severity = "pass" | "warn" | "fail";

interface Check {
  title: string;
  detail: string;
  severity: Severity;
}

/** Safely read a numeric field from an asset's metadata bag. */
function metaNum(meta: Record<string, unknown> | null | undefined, key: string): number | undefined {
  const v = meta?.[key];
  return typeof v === "number" ? v : undefined;
}

function metaStrings(meta: Record<string, unknown> | null | undefined, key: string): string[] {
  const v = meta?.[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

const SEVERITY_WEIGHT: Record<Severity, number> = { pass: 1, warn: 0.5, fail: 0 };

/** Derive the validation checks for the latest conversion run from its assets. */
function buildChecks(assets: GeneratedAssetOut[], degraded: string[], needsReview: number): Check[] {
  const find = (t: string) => assets.find((a) => a.asset_type === t);
  const twb = find("twb");
  const hyper = find("hyper");
  const twbx = find("twbx");

  const datasources = metaNum(twb?.asset_metadata, "datasources");
  const worksheets =
    metaNum(twb?.asset_metadata, "worksheets") ?? assets.filter((a) => a.asset_type === "worksheet").length;
  const dashboards = metaNum(twb?.asset_metadata, "dashboards") ?? (find("dashboard") ? 1 : 0);
  const hyperRows = metaNum(hyper?.asset_metadata, "rows");

  const checks: Check[] = [];

  checks.push(
    twb && (datasources ?? 0) >= 1 && worksheets >= 1
      ? {
          title: "Tableau workbook (.twb) is structurally valid",
          detail: `${datasources ?? 0} datasource(s), ${worksheets} worksheet(s), ${dashboards} dashboard(s).`,
          severity: "pass",
        }
      : {
          title: "Tableau workbook (.twb) is structurally valid",
          detail: "No valid .twb was produced for this run.",
          severity: "fail",
        },
  );

  checks.push(
    hyper && (hyperRows ?? 0) > 0
      ? {
          title: "Data extract (.hyper) created",
          detail: `Extract contains ${hyperRows?.toLocaleString()} row(s).`,
          severity: "pass",
        }
      : hyper
        ? {
            title: "Data extract (.hyper) created",
            detail: "Extract was created but contains no rows.",
            severity: "warn",
          }
        : {
            title: "Data extract (.hyper) created",
            detail: "No .hyper extract was produced.",
            severity: "fail",
          },
  );

  checks.push(
    worksheets >= 1
      ? {
          title: "Worksheets generated",
          detail: `${worksheets} worksheet(s) ready in the workbook.`,
          severity: "pass",
        }
      : { title: "Worksheets generated", detail: "No worksheets were generated.", severity: "fail" },
  );

  checks.push(
    dashboards >= 1
      ? { title: "Dashboard assembled", detail: `${dashboards} dashboard(s) defined.`, severity: "pass" }
      : { title: "Dashboard assembled", detail: "No dashboard was assembled for this run.", severity: "warn" },
  );

  checks.push(
    twbx
      ? {
          title: "Packaged workbook (.twbx) ready for download",
          detail: "A self-contained .twbx is available on the Generated Assets step.",
          severity: "pass",
        }
      : {
          title: "Packaged workbook (.twbx) ready for download",
          detail: "No packaged .twbx was produced — only loose assets are available.",
          severity: "warn",
        },
  );

  checks.push(
    degraded.length === 0
      ? { title: "AI analysis completed without fallbacks", detail: "All AI agents ran successfully.", severity: "pass" }
      : {
          title: "AI analysis completed without fallbacks",
          detail: `Degraded to defaults for: ${degraded.join(", ")}.`,
          severity: "warn",
        },
  );

  checks.push(
    needsReview === 0
      ? {
          title: "Formula translations verified",
          detail: "No translated formulas were flagged for review.",
          severity: "pass",
        }
      : {
          title: "Formula translations verified",
          detail: `${needsReview} translated formula(s) flagged for manual review.`,
          severity: "warn",
        },
  );

  return checks;
}

function scoreFor(checks: Check[]): number {
  if (checks.length === 0) return 0;
  const total = checks.reduce((sum, c) => sum + SEVERITY_WEIGHT[c.severity], 0);
  return Math.round((total / checks.length) * 100);
}

function scoreTone(score: number): { ring: string; text: string; label: string } {
  if (score >= 90) return { ring: "text-emerald-500", text: "text-emerald-600", label: "Ready to publish" };
  if (score >= 70) return { ring: "text-brand-500", text: "text-brand-600", label: "Usable — review warnings" };
  return { ring: "text-rose-500", text: "text-rose-600", label: "Needs attention" };
}

function ScoreRing({ score }: { score: number }) {
  const tone = scoreTone(score);
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 36 36" className="h-32 w-32 -rotate-90">
        <path
          className="text-ink-100"
          d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className={tone.ring}
          d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${score}, 100`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold leading-none ${tone.text}`}>{score}</span>
        <span className="mt-0.5 text-[11px] font-medium text-ink-400">/ 100</span>
      </div>
    </div>
  );
}

const ICONS: Record<Severity, JSX.Element> = {
  pass: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  warn: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  fail: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

const ROW_TONE: Record<Severity, string> = {
  pass: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  warn: "bg-amber-50 text-amber-600 ring-amber-100",
  fail: "bg-rose-50 text-rose-600 ring-rose-100",
};

const ISSUE_TONE: Record<ValidationSeverity, { badge: string; dot: string }> = {
  info: { badge: "bg-ink-100 text-ink-600", dot: "bg-ink-300" },
  warning: { badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-100", dot: "bg-amber-400" },
  critical: { badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-100", dot: "bg-rose-500" },
};

/** The LLM's qualitative review of the conversion. */
function AIReview({ report }: { report: AIValidationReport }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <ScoreRing score={report.fidelity_score} />
        <div className="flex-1">
          <p className={`text-lg font-semibold ${scoreTone(report.fidelity_score).text}`}>
            {report.verdict}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">{report.summary}</p>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-ink-400">
            AI fidelity score
          </p>
        </div>
      </div>

      {report.strengths.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-ink-800">Strengths</h4>
          <ul className="space-y-1.5 text-sm text-ink-700">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h4 className="mb-2 text-sm font-semibold text-ink-800">
          Issues &amp; recommendations · {report.issues.length}
        </h4>
        {report.issues.length === 0 ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            No issues flagged by the AI reviewer.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {report.issues.map((issue, i) => {
              const tone = ISSUE_TONE[issue.severity] ?? ISSUE_TONE.info;
              return (
                <li key={i} className="rounded-xl border border-ink-50 px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                    <span className="text-sm font-medium text-ink-800">{issue.area}</span>
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${tone.badge}`}>
                      {issue.severity}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-ink-600">{issue.detail}</p>
                  {issue.recommendation && (
                    <p className="mt-1 text-xs text-brand-700">
                      <span className="font-semibold">Fix:</span> {issue.recommendation}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function ValidationPage() {
  const { id } = useParams();
  const workbookId = Number(id);
  const { data, isLoading } = useDashboard(workbookId);
  const validate = useValidate();
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const job = useJob(jobId);
  const [report, setReport] = useState<AIValidationReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (job.data?.status === "completed") {
      const r = (job.data.result as { report?: AIValidationReport } | null)?.report;
      if (r) setReport(r);
      setJobId(undefined);
    }
    if (job.data?.status === "failed") {
      setError(job.data.error || "AI validation failed.");
      setJobId(undefined);
    }
  }, [job.data?.status, job.data?.error, job.data?.result]);

  if (isLoading) return <Spinner label="Loading…" />;

  const wb = data?.workbook;
  const latest = (data?.runs ?? [])[0];

  if (!latest) {
    return (
      <div>
        <WorkbookHeader workbookId={workbookId} title={wb?.original_filename} status={wb?.status} />
        <Empty message="Nothing to validate yet. Generate the Tableau workbook on the Generated Assets step first." />
      </div>
    );
  }

  const running = !!jobId || validate.isPending;
  function runAiReview() {
    setError(null);
    validate.mutate(workbookId, {
      onSuccess: (j) => setJobId(j.id),
      onError: (e) => setError(apiError(e)),
    });
  }

  const assets = latest.assets ?? [];
  const degraded = latest.recommendations?.degraded ?? [];
  const needsReview =
    latest.recommendations?.formula_translations?.translations?.filter((t) => t.needs_review).length ?? 0;

  const checks = buildChecks(assets, degraded, needsReview);
  const score = scoreFor(checks);
  const tone = scoreTone(score);

  const twb = assets.find((a) => a.asset_type === "twb");
  const worksheetNames = metaStrings(twb?.asset_metadata, "worksheet_names");

  const counts = checks.reduce(
    (acc, c) => ({ ...acc, [c.severity]: acc[c.severity] + 1 }),
    { pass: 0, warn: 0, fail: 0 } as Record<Severity, number>,
  );

  return (
    <div>
      <WorkbookHeader
        workbookId={workbookId}
        title={wb?.original_filename}
        status={wb?.status}
        actions={
          <Button onClick={runAiReview} disabled={running}>
            {running ? "Reviewing…" : report ? "Re-run AI review" : "Run AI review"}
          </Button>
        }
      />

      <div className="space-y-5">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        )}

        <Card title="AI validation review">
          {running && job.data ? (
            <>
              <ProgressBar value={job.data.progress} />
              <p className="mt-2 text-xs text-ink-500">{job.data.message || "Running AI review…"}</p>
            </>
          ) : report ? (
            <AIReview report={report} />
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-sm text-ink-500">
                Run an AI review to assess how faithfully the Tableau output represents the
                original Excel workbook.
              </p>
              <Button onClick={runAiReview} disabled={running}>
                Run AI review
              </Button>
            </div>
          )}
        </Card>

        <Card title={`Structural validation · Run #${latest.id}`}>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <ScoreRing score={score} />
            <div className="flex-1">
              <p className={`text-lg font-semibold ${tone.text}`}>{tone.label}</p>
              <p className="mt-1 text-sm text-ink-500">
                {counts.pass} passed · {counts.warn} warning(s) · {counts.fail} failed across{" "}
                {checks.length} checks.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 ring-1 ring-emerald-100">
                  {counts.pass} Pass
                </span>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700 ring-1 ring-amber-100">
                  {counts.warn} Warn
                </span>
                <span className="rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-700 ring-1 ring-rose-100">
                  {counts.fail} Fail
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Checks">
          <ul className="space-y-2.5">
            {checks.map((c, i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl border border-ink-50 px-3.5 py-3">
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${ROW_TONE[c.severity]}`}>
                  {ICONS[c.severity]}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink-800">{c.title}</span>
                  <span className="mt-0.5 block text-xs text-ink-500">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {worksheetNames.length > 0 && (
          <Card title={`Validated worksheets · ${worksheetNames.length}`}>
            <div className="flex flex-wrap gap-2">
              {worksheetNames.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-700"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                  {name}
                </span>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
