export type DrawingType =
  | "REH"
  | "CEH"
  | "Gland"
  | "Piston"
  | "Barrel"
  | "Rod"
  | "Acc/Misc"
  | "Assy"
  | "PRO"

export type Section =
  | "Title Block"
  | "Standard Notes"
  | "Cylinder Specifications"
  | "Dimension Units"
  | "Confidentiality"

export type RuleStatus = "pass" | "fail" | "warning" | "needs_review"

export type Grade = "A" | "B" | "C" | "D" | "F"

export interface Drawing {
  id: string
  name: string
  drawing_type: DrawingType
  last_run_date: string
  pass_rate: number
  grade: Grade
  type_overridden?: boolean
  last_reviewed_by?: string | null
  last_reviewed_at?: string | null
}

export interface Rule {
  id: string
  rule_code: string
  section: Section
  description: string
  applicable_drawing_types: DrawingType[]
}

export interface RagasScores {
  retrieval_relevance: number
  evidence_coverage: number
  decision_correctness: number
  faithfulness: number
  false_positive_risk: number
  composite: number
}

export interface Run {
  id: string
  drawing_id: string
  drawing_name: string
  timestamp: string
  pass_count: number
  fail_count: number
  warning_count: number
  review_count: number
  grade: Grade
  ragas_composite: number
  ragas: RagasScores
}

export interface RuleResult {
  rule_id: string
  run_id: string
  status: RuleStatus
  evidence: string
  issue_description: string
  suggested_fix: string
  ragas_composite: number
  flagged?: boolean
  notes?: RuleNote[]
}

export interface RuleNote {
  id: string
  text: string
  author: string
  created_at: string
}

export interface Classification {
  drawing_type: DrawingType
  confidence: number
}

export interface GoldStandardEntry {
  id: string
  drawing_id: string
  drawing_name: string
  rule_id: string
  rule_code: string
  section: Section
  system_verdict: RuleStatus
  gold_verdict: RuleStatus
  reviewer: string
  reviewed_at: string
  note: string
}

export interface DrawingTypeStat {
  drawing_type: DrawingType
  total: number
  pass_rate: number
}

export interface GradeDistribution {
  grade: Grade
  count: number
}

export interface Stats {
  total_drawings: number
  overall_pass_rate: number
  avg_ragas_composite: number
  total_runs: number
  grade_distribution: GradeDistribution[]
  by_drawing_type: DrawingTypeStat[]
}

export interface DrawingDetail {
  drawing: Drawing
  classification: Classification
  latest_run: Run
  results: (RuleResult & { rule: Rule })[]
  revisions: Revision[]
}

export interface Revision {
  run_id: string
  timestamp: string
  grade: Grade
  pass_count: number
  fail_count: number
  warning_count: number
  review_count: number
  is_current: boolean
}

export interface DuplicateInfo {
  filename: string
  processed_at: string
  drawing_id: string
}

export interface UploadQueueItem {
  id: string
  filename: string
  status: "queued" | "uploading" | "parsing" | "running_checks" | "complete" | "failed"
  progress: number
  sections: { name: Section; status: "pending" | "running" | "pass" | "fail" }[]
  error?: string
  result?: {
    drawing_id: string
    grade: Grade
    pass_count: number
    fail_count: number
    warning_count: number
  }
}

export interface BatchRun {
  id: string
  started_at: string
  completed_at: string | null
  total: number
  passed: number
  failed: number
  errors: number
  drawing_ids: string[]
}
