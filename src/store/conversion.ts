import { create } from "zustand";
import type { AIAnalysis, ObjectMapping } from "@/types";

interface PerWorkbook {
  mappings?: ObjectMapping[];
  analysis?: AIAnalysis;
}

interface ConversionState {
  byWorkbook: Record<number, PerWorkbook>;
  setMappings: (id: number, mappings: ObjectMapping[]) => void;
  setAnalysis: (id: number, analysis: AIAnalysis) => void;
  get: (id: number) => PerWorkbook;
}

export const useConversionStore = create<ConversionState>((set, getState) => ({
  byWorkbook: {},
  setMappings: (id, mappings) =>
    set((s) => ({ byWorkbook: { ...s.byWorkbook, [id]: { ...s.byWorkbook[id], mappings } } })),
  setAnalysis: (id, analysis) =>
    set((s) => ({ byWorkbook: { ...s.byWorkbook, [id]: { ...s.byWorkbook[id], analysis } } })),
  get: (id) => getState().byWorkbook[id] ?? {},
}));
