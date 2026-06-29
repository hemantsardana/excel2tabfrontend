import { Link } from "react-router-dom";
import { useHistory } from "@/hooks/queries";
import { Card, Empty, HeaderIcon, PageHeader, Spinner, StatusBadge } from "@/components/ui";

export default function HistoryPage() {
  const { data, isLoading } = useHistory();
  const items = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="History"
        subtitle="Every workbook you've uploaded and its conversion status."
        icon={<HeaderIcon><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></HeaderIcon>}
      />
      <Card>
        {isLoading ? (
          <Spinner label="Loading…" />
        ) : items.length === 0 ? (
          <Empty message="No conversions yet." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400">
                <th className="pb-2">File</th>
                <th className="pb-2">Uploaded</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Duration</th>
                <th className="pb-2">Assets</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.workbook_id} className="border-t border-slate-100">
                  <td className="py-2 font-medium text-slate-700">{i.filename}</td>
                  <td className="py-2 text-slate-500">{new Date(i.created_at).toLocaleString()}</td>
                  <td className="py-2"><StatusBadge status={i.status} /></td>
                  <td className="py-2 text-slate-500">
                    {i.duration_seconds != null ? `${i.duration_seconds.toFixed(1)}s` : "—"}
                  </td>
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
