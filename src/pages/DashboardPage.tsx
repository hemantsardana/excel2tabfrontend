import { Link } from "react-router-dom";
import { useHistory, useJobs } from "@/hooks/queries";
import { Card, Empty, HeaderIcon, PageHeader, ProgressBar, Spinner, StatusBadge } from "@/components/ui";

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-ink-100 bg-white p-5 shadow-card">
      <span className={`absolute left-0 top-0 h-full w-1 ${tone}`} />
      <div className="text-3xl font-bold text-ink-900">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wider text-ink-500">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const history = useHistory();
  const jobs = useJobs();

  const items = history.data ?? [];
  const jobList = jobs.data ?? [];
  const running = jobList.filter((j) => j.status === "running" || j.status === "pending");
  const completed = items.filter((i) => i.status === "generated" || i.status === "published").length;
  const failed = items.filter((i) => i.status === "failed").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Convert Excel workbooks into Tableau dashboards with AI."
        icon={<HeaderIcon><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></HeaderIcon>}
        actions={
          <Link to="/upload" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-600">
            Upload workbook
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Workbooks" value={items.length} tone="bg-brand-500" />
        <Stat label="Completed" value={completed} tone="bg-emerald-500" />
        <Stat label="Running" value={running.length} tone="bg-amber-500" />
        <Stat label="Failed" value={failed} tone="bg-rose-500" />
      </div>

      <Card title="Running jobs">
        {jobs.isLoading ? (
          <Spinner label="Loading jobs…" />
        ) : running.length === 0 ? (
          <Empty message="No active jobs." />
        ) : (
          <ul className="space-y-3">
            {running.map((j) => (
              <li key={j.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize text-slate-700">
                    {j.type} · workbook #{j.workbook_id}
                  </span>
                  <StatusBadge status={j.status} />
                </div>
                <ProgressBar value={j.progress} />
                {j.message && <p className="text-xs text-slate-500">{j.message}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Recent workbooks">
        {history.isLoading ? (
          <Spinner label="Loading…" />
        ) : items.length === 0 ? (
          <Empty message="No workbooks yet. Upload one to get started." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400">
                <th className="pb-2">File</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Assets</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 8).map((i) => (
                <tr key={i.workbook_id} className="border-t border-slate-100">
                  <td className="py-2 font-medium text-slate-700">{i.filename}</td>
                  <td className="py-2"><StatusBadge status={i.status} /></td>
                  <td className="py-2 text-slate-500">{i.asset_count}</td>
                  <td className="py-2 text-right">
                    <Link to={`/workbook/${i.workbook_id}/analysis`} className="text-brand-600 hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
