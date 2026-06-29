// TypeScript types mirroring the backend Pydantic schemas.

export type UserRole = "admin" | "analyst" | "viewer";

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export type WorkbookStatus =
  | "uploaded"
  | "analyzing"
  | "analyzed"
  | "generating"
  | "generated"
  | "published"
  | "failed";

export interface WorkbookOut {
  id: number;
  filename: string;
  original_filename: string;
  content_type: string | null;
  size_bytes: number;
  sheet_count: number;
  status: WorkbookStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type JobType = "analyze" | "generate" | "publish";
export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface JobOut {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  message: string | null;
  error: string | null;
  result: Record<string, unknown> | null;
  workbook_id: number | null;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  created_at: string;
}

// ---- Intermediate Representation (subset used by the UI) ----
export type DataType =
  | "string" | "number" | "integer" | "float" | "boolean"
  | "date" | "datetime" | "currency" | "percentage" | "unknown";
export type FieldRole = "dimension" | "measure";

export interface ColumnIR {
  name: string;
  index: number;
  data_type: DataType;
  role: FieldRole;
  nullable: boolean;
  sample_values: unknown[];
  distinct_count: number | null;
  number_format: string | null;
}
export interface TableIR {
  name: string;
  sheet: string;
  ref: string;
  header_row: number;
  row_count: number;
  columns: ColumnIR[];
  is_excel_table_object: boolean;
}
export interface WorksheetIR {
  name: string;
  index: number;
  visible: boolean;
  max_row: number;
  max_column: number;
  used_range: string | null;
  has_data: boolean;
}
export interface ChartIR {
  id: string;
  sheet: string;
  chart_type: string;
  title: string | null;
  categories_ref: string | null;
  series: { name: string | null; values_ref: string | null }[];
}
export interface PivotTableIR {
  name: string;
  sheet: string;
  rows: { name: string }[];
  columns: { name: string }[];
  values: { name: string; aggregation: string }[];
  filters: { name: string }[];
}
export interface KpiIR {
  id: string;
  sheet: string;
  label: string;
  value: unknown;
  number_format: string | null;
}
export interface NamedRangeIR { name: string; refers_to: string; scope: string }
export interface ConditionalFormatIR { sheet: string; range: string; rule_type: string }
export interface FormulaIR {
  sheet: string;
  cell: string;
  formula: string;
  functions: string[];
  dependencies: string[];
  result_type: DataType;
}
export interface RelationshipIR { from_sheet: string; to_sheet: string; kind: string }
export interface FilterIR { sheet: string; range: string; columns: string[]; kind: string }
export interface CalculationIR { name: string; expression: string; source: string | null }

export interface WorkbookIR {
  workbook: { filename: string; sheet_count: number };
  worksheets: WorksheetIR[];
  tables: TableIR[];
  charts: ChartIR[];
  pivot_tables: PivotTableIR[];
  kpis: KpiIR[];
  named_ranges: NamedRangeIR[];
  conditional_formats: ConditionalFormatIR[];
  formulas: FormulaIR[];
  relationships: RelationshipIR[];
  filters: FilterIR[];
  calculations: CalculationIR[];
  warnings: string[];
}

// ---- AI analysis ----
export type TableauVizType =
  | "bar" | "line" | "pie" | "scatter" | "heatmap" | "treemap" | "kpi_card" | "text_table";
export type LayoutDirection = "horizontal" | "vertical" | "grid";

export interface WorkbookUnderstanding {
  summary: string;
  business_domain: string;
  intent: string;
  key_metrics: string[];
  key_dimensions: string[];
  suggested_dashboard_titles: string[];
  data_quality_notes: string[];
}
export interface VizRecommendation {
  source_name: string;
  worksheet_name: string;
  viz_type: TableauVizType;
  measures: string[];
  dimensions: string[];
  filters: string[];
  parameters: string[];
  rationale: string;
}
export interface DashboardZone {
  title: string | null;
  direction: LayoutDirection;
  worksheets: string[];
  width_ratio: number;
}
export interface DashboardLayout {
  title: string;
  description: string;
  layout_direction: LayoutDirection;
  zones: DashboardZone[];
  global_filters: string[];
  parameters: string[];
}
export interface StoryPoint { title: string; worksheet: string; caption: string }
export interface Story { title: string; description: string; points: StoryPoint[] }
export interface FormulaTranslation {
  source_formula: string;
  source_location: string | null;
  tableau_calculation: string;
  explanation: string;
  functions_used: string[];
  supported: boolean;
  needs_review: boolean;
  fallback_note: string | null;
}
// ---- Excel → Tableau field lineage ----
export type LineageNodeKind = "formula" | "base_column" | "parameter" | "constant";
export type LineageFieldKind = "measure" | "calculated_field";
export type LineageStatus = "supported" | "unsupported" | "not_translated";

export interface LineageNodeRef {
  id: string;
  label: string;
  kind: LineageNodeKind;
}
export interface LineageField {
  id: string;
  sheet: string;
  cell: string;
  name: string;
  kind: LineageFieldKind;
  excel_formula: string;
  functions: string[];
  tableau_calculation: string | null;
  status: LineageStatus;
  direct_dependencies: LineageNodeRef[];
  root_sources: LineageNodeRef[];
  depth: number;
  paths: string[][];
  used_by: string[];
  generated?: boolean | null;
  twb_field?: string | null;
}
export interface LineageFunctionMap { excel_fn: string; tableau_fn: string; count: number }
export interface LineageSummary {
  measures: number;
  calculated_fields: number;
  supported: number;
  unsupported: number;
  not_translated: number;
  base_columns: number;
  max_depth: number;
  functions: LineageFunctionMap[];
}
export interface LineageReport {
  workbook_id: number;
  has_formulas: boolean;
  summary: LineageSummary;
  fields: LineageField[];
  base_columns: LineageNodeRef[];
  twb_available?: boolean;
  twb_name?: string | null;
  twb_generated_count?: number;
  twb_measure_count?: number;
  twb_calc_field_count?: number;
}

export interface AssetExplanation { asset_name: string; asset_type: string; description: string }
export interface ExplanationSet { overview: string; assets: AssetExplanation[] }
export type ValidationSeverity = "info" | "warning" | "critical";
export interface ValidationIssue {
  area: string;
  severity: ValidationSeverity;
  detail: string;
  recommendation: string;
}
export interface AIValidationReport {
  fidelity_score: number;
  verdict: string;
  summary: string;
  strengths: string[];
  issues: ValidationIssue[];
}
export interface AIAnalysis {
  understanding: WorkbookUnderstanding;
  visualizations: { recommendations: VizRecommendation[] };
  layout: DashboardLayout;
  story: Story;
  formula_translations: { translations: FormulaTranslation[] };
  explanation: ExplanationSet;
  degraded?: string[];
}

// ---- Conversions / assets ----
export type AssetType =
  | "hyper" | "twb" | "twbx" | "worksheet" | "dashboard" | "story"
  | "calculated_field" | "parameter" | "filter" | "data_source";

export interface GeneratedAssetOut {
  id: number;
  asset_type: AssetType;
  name: string;
  file_path: string | null;
  asset_metadata: Record<string, unknown> | null;
  created_at: string;
}
export interface ConversionRunOut {
  id: number;
  workbook_id: number;
  job_id: string | null;
  status: JobStatus;
  mappings: ObjectMapping[] | null;
  recommendations: AIAnalysis | null;
  explanations: ExplanationSet | null;
  error_message: string | null;
  created_at: string;
  assets: GeneratedAssetOut[];
}
export interface WorkbookDetail extends WorkbookOut {
  ir_json: WorkbookIR | null;
  analysis_summary: AIAnalysis | null;
}
export interface DashboardResponse {
  workbook: WorkbookDetail;
  runs: ConversionRunOut[];
}
export interface HistoryItem {
  workbook_id: number;
  filename: string;
  status: string;
  created_at: string;
  duration_seconds: number | null;
  asset_count: number;
}

export interface ObjectMapping {
  source_type: string;
  source_id: string;
  target_type: AssetType;
  target_name: string;
  enabled: boolean;
  options: Record<string, unknown>;
}
export interface GenerateRequest {
  workbook_id: number;
  mappings?: ObjectMapping[] | null;
  recommendations?: AIAnalysis | null;
  package_twbx: boolean;
}
