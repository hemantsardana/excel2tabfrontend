import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDashboard } from "@/hooks/queries";
import { useConversionStore } from "@/store/conversion";
import { Button, Card, Empty, Spinner } from "@/components/ui";
import WorkbookHeader from "@/components/WorkbookHeader";
import type { AIAnalysis } from "@/types";

export default function DesignerPage() {
  const { id } = useParams();
  const workbookId = Number(id);
  const navigate = useNavigate();
  const { data, isLoading } = useDashboard(workbookId);
  const stored = useConversionStore((s) => s.byWorkbook[workbookId]);
  const setAnalysis = useConversionStore((s) => s.setAnalysis);
  const [drag, setDrag] = useState<{ zone: number; ws: string } | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const wb = data?.workbook;

  if (isLoading) return <Spinner label="Loading…" />;
  const base: AIAnalysis | null = stored?.analysis ?? wb?.analysis_summary ?? null;
  if (!base) {
    return (
      <div>
        <WorkbookHeader workbookId={workbookId} title={wb?.original_filename} status={wb?.status} />
        <Empty message="No layout yet. Run AI analysis first." />
      </div>
    );
  }

  const zones = base.layout.zones;

  function moveTo(targetZone: number) {
    setOver(null);
    if (!drag) return;
    const next: AIAnalysis = JSON.parse(JSON.stringify(base));
    next.layout.zones[drag.zone].worksheets = next.layout.zones[drag.zone].worksheets.filter(
      (w) => w !== drag.ws,
    );
    if (!next.layout.zones[targetZone].worksheets.includes(drag.ws)) {
      next.layout.zones[targetZone].worksheets.push(drag.ws);
    }
    setAnalysis(workbookId, next);
    setDrag(null);
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
      <Card title={base.layout.title || "Dashboard layout"}>
        <p className="mb-4 text-xs text-ink-500">
          Drag worksheets between containers to rearrange the dashboard layout.
        </p>
        <div className="space-y-3">
          {zones.map((zone, zi) => (
            <div
              key={zi}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(zi);
              }}
              onDragLeave={() => setOver((v) => (v === zi ? null : v))}
              onDrop={() => moveTo(zi)}
              className={`rounded-xl border-2 border-dashed p-4 transition ${
                over === zi ? "border-brand-400 bg-brand-50/50" : "border-ink-100 bg-ink-50/40"
              }`}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                  {zone.title || `Zone ${zi + 1}`}
                </span>
                <span className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-ink-500">
                  {zone.direction}
                </span>
              </div>
              <div className={`flex gap-2 ${zone.direction === "vertical" ? "flex-col" : "flex-row flex-wrap"}`}>
                {zone.worksheets.length === 0 && (
                  <span className="text-xs italic text-ink-300">drop worksheets here</span>
                )}
                {zone.worksheets.map((ws) => (
                  <div
                    key={ws}
                    draggable
                    onDragStart={() => setDrag({ zone: zi, ws })}
                    className="flex cursor-move items-center gap-2 rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm font-medium text-ink-700 shadow-card transition hover:border-brand-300 hover:shadow-cardhover"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-300" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" />
                      <circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" />
                      <circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" />
                    </svg>
                    {ws}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
