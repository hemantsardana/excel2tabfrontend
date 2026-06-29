import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUpload } from "@/hooks/queries";
import { apiError } from "@/api/client";
import { Button, Card, HeaderIcon, PageHeader, ProgressBar } from "@/components/ui";
import type { WorkbookOut } from "@/types";

const ACCEPT = ".xlsx,.xlsm,.xls";

export default function UploadPage() {
  const navigate = useNavigate();
  const upload = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploaded, setUploaded] = useState<WorkbookOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);
    setProgress(0);
    upload.mutate(
      { file, onProgress: setProgress },
      {
        onSuccess: (data) => setUploaded(data.workbook),
        onError: (err) => setError(apiError(err)),
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload workbook"
        subtitle="Drag in an Excel file to begin the Tableau conversion."
        icon={<HeaderIcon><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></HeaderIcon>}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition ${
          dragging ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-white hover:border-brand-400"
        }`}
      >
        <p className="text-sm font-medium text-slate-700">
          Drag & drop an Excel file here, or click to browse
        </p>
        <p className="mt-1 text-xs text-slate-400">Supports .xlsx, .xlsm, .xls</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {upload.isPending && (
        <Card title="Uploading">
          <ProgressBar value={progress / 100} />
          <p className="mt-2 text-xs text-slate-500">{progress}%</p>
        </Card>
      )}

      {error && <div className="rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      {uploaded && (
        <Card
          title="Upload complete"
          actions={
            <Button onClick={() => navigate(`/workbook/${uploaded.id}/analysis`)}>
              Analyze →
            </Button>
          }
        >
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">File</dt>
            <dd className="text-slate-800">{uploaded.original_filename}</dd>
            <dt className="text-slate-500">Sheets</dt>
            <dd className="text-slate-800">{uploaded.sheet_count}</dd>
            <dt className="text-slate-500">Size</dt>
            <dd className="text-slate-800">{(uploaded.size_bytes / 1024).toFixed(1)} KB</dd>
          </dl>
        </Card>
      )}
    </div>
  );
}
