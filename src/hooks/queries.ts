import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  analyzeApi,
  generateApi,
  jobApi,
  lineageApi,
  publishApi,
  validateApi,
  workbookApi,
} from "@/api/endpoints";
import type { GenerateRequest } from "@/types";

export function useHistory() {
  return useQuery({ queryKey: ["history"], queryFn: workbookApi.history });
}

export function useDashboard(id: number | undefined) {
  return useQuery({
    queryKey: ["dashboard", id],
    queryFn: () => workbookApi.dashboard(id as number),
    enabled: !!id,
  });
}

export function useLineage(id: number | undefined) {
  return useQuery({
    queryKey: ["lineage", id],
    queryFn: () => lineageApi.lineage(id as number),
    enabled: !!id,
  });
}

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: jobApi.list,
    refetchInterval: (query) => {
      const data = query.state.data;
      const active = data?.some((j) => j.status === "running" || j.status === "pending");
      return active ? 2000 : false;
    },
  });
}

/** Poll a single job until it reaches a terminal state. */
export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ["job", id],
    queryFn: () => jobApi.get(id as string),
    enabled: !!id,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === "running" || s === "pending" ? 1500 : false;
    },
  });
}

export function useUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (p: number) => void }) =>
      workbookApi.upload(file, onProgress),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["history"] }),
  });
}

export function useAnalyze() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workbookId, runAi }: { workbookId: number; runAi?: boolean }) =>
      analyzeApi.analyze(workbookId, runAi ?? true),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

export function useGenerate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateRequest) => generateApi.generate(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

export function usePublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, project }: { runId: number; project?: string }) =>
      publishApi.publish(runId, project ?? "default"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

export function useValidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workbookId: number) => validateApi.validate(workbookId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}
