import api from "./client";
import type {
  DashboardResponse,
  GenerateRequest,
  HistoryItem,
  JobOut,
  LineageReport,
  Token,
  User,
  WorkbookOut,
} from "@/types";

// Upload returns { workbook, message }.
export interface UploadResponseLike {
  workbook: WorkbookOut;
  message: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<Token>("/auth/login", { email, password }).then((r) => r.data),
  me: () => api.get<User>("/auth/me").then((r) => r.data),
};

export const workbookApi = {
  upload: (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<UploadResponseLike>("/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      })
      .then((r) => r.data);
  },
  dashboard: (id: number) =>
    api.get<DashboardResponse>(`/dashboard/${id}`).then((r) => r.data),
  history: () => api.get<HistoryItem[]>("/history").then((r) => r.data),
};

export const lineageApi = {
  lineage: (id: number) =>
    api.get<LineageReport>(`/lineage/${id}`).then((r) => r.data),
};

export const jobApi = {
  list: () => api.get<JobOut[]>("/jobs").then((r) => r.data),
  get: (id: string) => api.get<JobOut>(`/jobs/${id}`).then((r) => r.data),
};

export const analyzeApi = {
  analyze: (workbook_id: number, run_ai = true) =>
    api.post<JobOut>("/analyze", { workbook_id, run_ai }).then((r) => r.data),
};

export const generateApi = {
  generate: (payload: GenerateRequest) =>
    api.post<JobOut>("/generate", payload).then((r) => r.data),
};

export const publishApi = {
  publish: (run_id: number, project_name = "default") =>
    api.post<JobOut>("/publish", { run_id, project_name }).then((r) => r.data),
};

export const validateApi = {
  validate: (workbook_id: number) =>
    api.post<JobOut>("/validate", { workbook_id }).then((r) => r.data),
};

/** Download a generated asset through the JWT-protected endpoint and save it. */
export async function downloadAsset(assetId: number, filename: string): Promise<void> {
  const res = await api.get(`/assets/${assetId}/download`, { responseType: "blob" });
  const url = window.URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
