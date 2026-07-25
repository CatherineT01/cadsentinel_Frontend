import { RULES, ruleById } from "./rules"
import type {
  BatchRun,
  Drawing,
  DrawingDetail,
  DrawingType,
  DuplicateInfo,
  GoldStandardEntry,
  Grade,
  RagasScores,
  Revision,
  Rule,
  RuleNote,
  RuleResult,
  RuleStatus,
  Run,
  Stats,
} from "./types"

/* ------------------------------------------------------------------ */
/* Deterministic pseudo-random helpers (stable across restarts)        */
/* ------------------------------------------------------------------ */

function makeRng(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function gradeFromRate(rate: number): Grade {
  if (rate >= 0.95) return "A"
  if (rate >= 0.85) return "B"
  if (rate >= 0.75) return "C"
  if (rate >= 0.6) return "D"
  return "F"
}

function round(n: number, dp = 2) {
  const f = Math.pow(10, dp)
  return Math.round(n * f) / f
}

/* ------------------------------------------------------------------ */
/* Seed drawings                                                       */
/* ------------------------------------------------------------------ */

interface DrawingSeed {
  name: string
  type: DrawingType
  confidence: number
}

const DRAWING_SEEDS: DrawingSeed[] = [
  { name: "JIT-204518-A1 Rod End Head", type: "REH", confidence: 0.97 },
  { name: "JIT-204519-B2 Cap End Head", type: "CEH", confidence: 0.94 },
  { name: "JIT-204520-A0 Gland Assembly", type: "Gland", confidence: 0.91 },
  { name: "JIT-204521-C1 Piston 4.00 Bore", type: "Piston", confidence: 0.98 },
  { name: "JIT-204522-A3 Barrel Tube 4x24", type: "Barrel", confidence: 0.96 },
  { name: "JIT-204523-A1 Piston Rod 1.75", type: "Rod", confidence: 0.99 },
  { name: "JIT-204524-B0 Mounting Bracket", type: "Acc/Misc", confidence: 0.82 },
  { name: "JIT-204525-D2 Hydraulic Cylinder Assy", type: "Assy", confidence: 0.95 },
  { name: "JIT-204526-A0 Weld Procedure PRO-14", type: "PRO", confidence: 0.88 },
  { name: "JIT-204527-A1 Rod End Head 6.00", type: "REH", confidence: 0.93 },
  { name: "JIT-204528-A2 Barrel Tube 5x36", type: "Barrel", confidence: 0.9 },
  { name: "JIT-204529-B1 Cushion Gland", type: "Gland", confidence: 0.86 },
  { name: "JIT-204530-A0 Clevis Accessory", type: "Acc/Misc", confidence: 0.79 },
  { name: "JIT-204531-C0 Tie-Rod Cylinder Assy", type: "Assy", confidence: 0.97 },
]

const EVIDENCE_BANK: Record<
  RuleStatus,
  { evidence: string; issue: string; fix: string }
> = {
  pass: {
    evidence:
      "Text entity matched at title-block region (0.94 confidence). Extracted value conforms to the JIT specification.",
    issue: "No issue detected. Requirement satisfied.",
    fix: "No action required.",
  },
  fail: {
    evidence:
      "Expected annotation not found within the searched drawing region. Nearest candidate scored below the acceptance threshold.",
    issue: "Required content is missing or does not conform to the JIT specification for this drawing type.",
    fix: "Add the missing annotation using the approved JIT template block and re-run validation.",
  },
  warning: {
    evidence:
      "Annotation located but value is partially non-conforming. Formatting deviates from the standard pattern.",
    issue: "Content is present but does not fully match the expected format or tolerance convention.",
    fix: "Update the annotation to match the standard format (e.g. correct decimal precision or unit suffix).",
  },
  needs_review: {
    evidence:
      "Low-confidence extraction. Multiple candidate entities detected with overlapping bounding boxes.",
    issue: "Automated verdict is uncertain and requires a human reviewer to confirm compliance.",
    fix: "Route to a compliance engineer for manual verification against the source DWG.",
  },
}

function buildRagas(rng: () => number, status: RuleStatus): RagasScores {
  const base =
    status === "pass" ? 0.9 : status === "warning" ? 0.78 : status === "needs_review" ? 0.62 : 0.7
  const jitter = () => round(Math.min(0.99, Math.max(0.4, base + (rng() - 0.5) * 0.18)), 2)
  const retrieval_relevance = jitter()
  const evidence_coverage = jitter()
  const decision_correctness = jitter()
  const faithfulness = jitter()
  // false positive risk is inverse: lower is better
  const false_positive_risk = round(
    Math.min(0.6, Math.max(0.02, (1 - base) * 0.6 + (rng() - 0.5) * 0.1)),
    2,
  )
  const composite = round(
    (retrieval_relevance +
      evidence_coverage +
      decision_correctness +
      faithfulness +
      (1 - false_positive_risk)) /
      5,
    2,
  )
  return {
    retrieval_relevance,
    evidence_coverage,
    decision_correctness,
    faithfulness,
    false_positive_risk,
    composite,
  }
}

/* ------------------------------------------------------------------ */
/* Build dataset                                                       */
/* ------------------------------------------------------------------ */

interface Dataset {
  drawings: Drawing[]
  runs: Run[]
  ruleResults: RuleResult[]
  goldStandard: GoldStandardEntry[]
  classifications: Record<string, { drawing_type: DrawingType; confidence: number }>
}

function applicableRules(type: DrawingType): Rule[] {
  return RULES.filter((r) => r.applicable_drawing_types.includes(type))
}

function pickStatus(rng: () => number, quality: number): RuleStatus {
  const r = rng()
  // quality 0..1 controls how likely a pass is
  if (r < quality) return "pass"
  if (r < quality + (1 - quality) * 0.45) return "fail"
  if (r < quality + (1 - quality) * 0.75) return "warning"
  return "needs_review"
}

function buildDataset(): Dataset {
  const drawings: Drawing[] = []
  const runs: Run[] = []
  const ruleResults: RuleResult[] = []
  const goldStandard: GoldStandardEntry[] = []
  const classifications: Dataset["classifications"] = {}

  const now = Date.now()
  const reviewers = ["A. Okafor", "M. Reyes", "S. Kowalski", "J. Whitfield"]

  DRAWING_SEEDS.forEach((seed, di) => {
    const drawingId = `DWG-${String(di + 1).padStart(3, "0")}`
    const rng = makeRng((di + 1) * 7919)
    const rules = applicableRules(seed.type)
    // baseline quality per drawing
    const quality = 0.62 + rng() * 0.34

    classifications[drawingId] = { drawing_type: seed.type, confidence: seed.confidence }

    // Build 1-3 historical runs; the last is the "latest"
    const runCount = 1 + Math.floor(rng() * 3)
    let latestRun: Run | null = null

    for (let ri = 0; ri < runCount; ri++) {
      const runId = `RUN-${String(di + 1).padStart(3, "0")}-${ri + 1}`
      const isLatest = ri === runCount - 1
      // earlier runs are slightly worse (improvement over time)
      const runQuality = Math.min(0.98, quality - (runCount - 1 - ri) * 0.08)
      const daysAgo = (runCount - ri) * 4 + Math.floor(rng() * 3)
      const timestamp = new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString()

      let pass = 0
      let fail = 0
      let warning = 0
      let review = 0
      let ragasSum = 0
      const perRun: RuleResult[] = []

      rules.forEach((rule) => {
        const status = pickStatus(rng, runQuality)
        const ragas = buildRagas(rng, status)
        ragasSum += ragas.composite
        if (status === "pass") pass++
        else if (status === "fail") fail++
        else if (status === "warning") warning++
        else review++

        const bank = EVIDENCE_BANK[status]
        perRun.push({
          rule_id: rule.id,
          run_id: runId,
          status,
          evidence: `[${rule.rule_code}] ${bank.evidence}`,
          issue_description: bank.issue,
          suggested_fix: bank.fix,
          ragas_composite: ragas.composite,
        })
      })

      const total = rules.length
      const passRate = round(pass / total, 3)
      const ragasComposite = round(ragasSum / total, 2)
      const grade = gradeFromRate(passRate)

      const run: Run = {
        id: runId,
        drawing_id: drawingId,
        drawing_name: seed.name,
        timestamp,
        pass_count: pass,
        fail_count: fail,
        warning_count: warning,
        review_count: review,
        grade,
        ragas_composite: ragasComposite,
        ragas: buildRagas(rng, passRate >= 0.85 ? "pass" : "warning"),
      }
      run.ragas.composite = ragasComposite

      runs.push(run)
      // Only keep rule results for the latest run to keep the dataset lean
      if (isLatest) {
        ruleResults.push(...perRun)
        latestRun = run
      }
    }

    if (latestRun) {
      drawings.push({
        id: drawingId,
        name: seed.name,
        drawing_type: seed.type,
        last_run_date: latestRun.timestamp,
        pass_rate: round(latestRun.pass_count / rules.length, 3),
        grade: latestRun.grade,
      })

      // Gold-standard entries: sample a few rules from the latest run
      const sample = rules.slice(0, Math.min(4, rules.length))
      sample.forEach((rule, si) => {
        const sysResult = ruleResults.find(
          (rr) => rr.run_id === latestRun!.id && rr.rule_id === rule.id,
        )
        if (!sysResult) return
        const systemVerdict = sysResult.status
        // Gold verdict mostly agrees, occasionally differs
        const disagree = rng() < 0.28
        let goldVerdict: RuleStatus = systemVerdict
        if (disagree) {
          const options: RuleStatus[] = ["pass", "fail", "warning", "needs_review"]
          goldVerdict = options[Math.floor(rng() * options.length)]
        }
        if (systemVerdict === "needs_review" && goldVerdict === "needs_review") {
          goldVerdict = rng() < 0.5 ? "pass" : "fail"
        }
        goldStandard.push({
          id: `GS-${drawingId}-${rule.id}`,
          drawing_id: drawingId,
          drawing_name: seed.name,
          rule_id: rule.id,
          rule_code: rule.rule_code,
          section: rule.section,
          system_verdict: systemVerdict,
          gold_verdict: goldVerdict,
          reviewer: reviewers[(di + si) % reviewers.length],
          reviewed_at: new Date(now - (di + 2) * 24 * 60 * 60 * 1000).toISOString(),
          note:
            systemVerdict === goldVerdict
              ? "System verdict confirmed against source DWG."
              : "Reviewer overrode automated verdict after manual inspection.",
        })
      })
    }
  })

  return { drawings, runs, ruleResults, goldStandard, classifications }
}

// Build once per server process
const DATA = buildDataset()

/* ------------------------------------------------------------------ */
/* Mutable state for client-driven mutations (flags, notes, reviews,  */
/* type override, revisions). Stored in module scope so the mock API  */
/* routes can read/write it.                                           */
/* ------------------------------------------------------------------ */

interface MutableState {
  flags: Set<string> // key: `${runId}:${ruleId}`
  notes: Map<string, RuleNote[]> // key: `${runId}:${ruleId}`
  reviewLog: Map<string, { reviewer: string; reviewed_at: string }> // drawingId
  typeOverrides: Map<string, DrawingType> // drawingId
  revisions: Map<string, Revision[]> // drawingId (extra revisions beyond built-in runs)
  batches: BatchRun[]
  uploadedDrawings: Drawing[] // drawings created via upload
  uploadedRuns: Run[] // runs created via upload
  uploadedResults: RuleResult[] // rule results created via upload
  deletedDrawingIds: Set<string>
}

const MUT: MutableState = {
  flags: new Set(),
  notes: new Map(),
  reviewLog: new Map(),
  typeOverrides: new Map(),
  revisions: new Map(),
  batches: [],
  uploadedDrawings: [],
  uploadedRuns: [],
  uploadedResults: [],
  deletedDrawingIds: new Set(),
}

function resultKey(runId: string, ruleId: string) {
  return `${runId}:${ruleId}`
}

export function getFlaggedKeys(): string[] {
  return Array.from(MUT.flags)
}

export function isFlagged(runId: string, ruleId: string): boolean {
  return MUT.flags.has(resultKey(runId, ruleId))
}

export function setFlag(runId: string, ruleId: string, flagged: boolean) {
  const key = resultKey(runId, ruleId)
  if (flagged) MUT.flags.add(key)
  else MUT.flags.delete(key)
}

export function getNotes(runId: string, ruleId: string): RuleNote[] {
  return MUT.notes.get(resultKey(runId, ruleId)) ?? []
}

export function addNote(runId: string, ruleId: string, text: string, author: string): RuleNote {
  const key = resultKey(runId, ruleId)
  const note: RuleNote = {
    id: `NOTE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    author,
    created_at: new Date().toISOString(),
  }
  const list = MUT.notes.get(key) ?? []
  list.push(note)
  MUT.notes.set(key, list)
  return note
}

export function getReviewLog(drawingId: string) {
  return MUT.reviewLog.get(drawingId) ?? null
}

export function setReviewLog(drawingId: string, reviewer: string) {
  MUT.reviewLog.set(drawingId, { reviewer, reviewed_at: new Date().toISOString() })
}

export function getTypeOverride(drawingId: string): DrawingType | null {
  return MUT.typeOverrides.get(drawingId) ?? null
}

export function setTypeOverride(drawingId: string, type: DrawingType) {
  MUT.typeOverrides.set(drawingId, type)
}

export function getRevisions(drawingId: string): Revision[] {
  const builtInRuns = DATA.runs
    .filter((r) => r.drawing_id === drawingId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  const builtIn: Revision[] = builtInRuns.map((r, i) => ({
    run_id: r.id,
    timestamp: r.timestamp,
    grade: r.grade,
    pass_count: r.pass_count,
    fail_count: r.fail_count,
    warning_count: r.warning_count,
    review_count: r.review_count,
    is_current: i === 0,
  }))
  const extra = MUT.revisions.get(drawingId) ?? []
  return [...extra, ...builtIn]
}

export function addRevision(drawingId: string, run: Run) {
  const rev: Revision = {
    run_id: run.id,
    timestamp: run.timestamp,
    grade: run.grade,
    pass_count: run.pass_count,
    fail_count: run.fail_count,
    warning_count: run.warning_count,
    review_count: run.review_count,
    is_current: true,
  }
  const existing = MUT.revisions.get(drawingId) ?? []
  // mark previous as not current
  MUT.revisions.set(drawingId, existing.map((r) => ({ ...r, is_current: false })).concat(rev))
}

export function getBatches(): BatchRun[] {
  return [...MUT.batches].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
  )
}

export function addBatch(batch: BatchRun) {
  MUT.batches.push(batch)
}

/* ------------------------------------------------------------------ */
/* Upload simulation helpers                                           */
/* ------------------------------------------------------------------ */

export function findDuplicates(filenames: string[]): DuplicateInfo[] {
  const all = [...DATA.drawings, ...MUT.uploadedDrawings]
  return filenames
    .map((fn) => all.find((d) => d.name.toLowerCase() === fn.toLowerCase()))
    .filter((d): d is Drawing => Boolean(d))
    .map((d) => ({
      filename: d.name,
      processed_at: d.last_run_date,
      drawing_id: d.id,
    }))
}

export function deleteDrawingCompletely(drawingId: string) {
  MUT.deletedDrawingIds.add(drawingId)
  // remove from uploaded store if present
  MUT.uploadedDrawings = MUT.uploadedDrawings.filter((d) => d.id !== drawingId)
}

export function createUploadedDrawing(
  filename: string,
  type: DrawingType,
  run: Run,
  results: RuleResult[],
) {
  const drawingId = `DWG-UP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const drawing: Drawing = {
    id: drawingId,
    name: filename,
    drawing_type: type,
    last_run_date: run.timestamp,
    pass_rate: round(run.pass_count / results.length, 3),
    grade: run.grade,
    type_overridden: false,
    last_reviewed_by: null,
    last_reviewed_at: null,
  }
  MUT.uploadedDrawings.push(drawing)
  MUT.uploadedRuns.push(run)
  MUT.uploadedResults.push(...results)
  return drawing
}

export function simulateRunForDrawing(
  filename: string,
  type: DrawingType,
  seed: number,
): { run: Run; results: RuleResult[] } {
  const rng = makeRng(seed)
  const rules = applicableRules(type)
  const quality = 0.62 + rng() * 0.34
  const runId = `RUN-UP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const timestamp = new Date().toISOString()

  let pass = 0
  let fail = 0
  let warning = 0
  let review = 0
  const results: RuleResult[] = []

  rules.forEach((rule) => {
    const status = pickStatus(rng, quality)
    const ragas = buildRagas(rng, status)
    if (status === "pass") pass++
    else if (status === "fail") fail++
    else if (status === "warning") warning++
    else review++
    const bank = EVIDENCE_BANK[status]
    results.push({
      rule_id: rule.id,
      run_id: runId,
      status,
      evidence: `[${rule.rule_code}] ${bank.evidence}`,
      issue_description: bank.issue,
      suggested_fix: bank.fix,
      ragas_composite: ragas.composite,
    })
  })

  const passRate = round(pass / rules.length, 3)
  const run: Run = {
    id: runId,
    drawing_id: "",
    drawing_name: filename,
    timestamp,
    pass_count: pass,
    fail_count: fail,
    warning_count: warning,
    review_count: review,
    grade: gradeFromRate(passRate),
    ragas_composite: round(results.reduce((s, r) => s + r.ragas_composite, 0) / results.length, 2),
    ragas: buildRagas(rng, passRate >= 0.85 ? "pass" : "warning"),
  }
  return { run, results }
}

export function reprocessDrawing(
  drawingId: string,
  newType: DrawingType,
): { run: Run; results: RuleResult[] } {
  const drawing = getDrawingById(drawingId)
  const filename = drawing?.name ?? `Drawing-${drawingId}`
  const { run, results } = simulateRunForDrawing(filename, newType, Date.now() % 2147483647)
  run.drawing_id = drawingId
  // store the new run + results in uploaded store so detail reads them
  MUT.uploadedRuns.push(run)
  // remove old uploaded results for this drawing's previous run, add new
  MUT.uploadedResults = MUT.uploadedResults.filter((r) => r.run_id !== drawingId)
  MUT.uploadedResults.push(...results)
  // update the drawing's type + last run
  if (drawing) {
    drawing.drawing_type = newType
    drawing.type_overridden = true
    drawing.last_run_date = run.timestamp
    drawing.pass_rate = round(run.pass_count / results.length, 3)
    drawing.grade = run.grade
  }
  addRevision(drawingId, run)
  return { run, results }
}

export function getDrawingById(id: string): Drawing | undefined {
  if (MUT.deletedDrawingIds.has(id)) return undefined
  return (
    DATA.drawings.find((d) => d.id === id) ??
    MUT.uploadedDrawings.find((d) => d.id === id)
  )
}

/* ------------------------------------------------------------------ */
/* Drawings-by-rule query (Rules page + Drawings list search-by-rule)  */
/* ------------------------------------------------------------------ */

export interface DrawingVerdictForRule {
  drawing_id: string
  drawing_name: string
  drawing_type: DrawingType
  grade: Grade
  status: RuleStatus
  run_id: string
}

export function getDrawingsByRule(ruleId: string): DrawingVerdictForRule[] {
  const rule = ruleById(ruleId)
  if (!rule) return []
  const allResults = [...DATA.ruleResults, ...MUT.uploadedResults]
  const byRun = new Map<string, RuleResult[]>()
  allResults
    .filter((rr) => rr.rule_id === ruleId)
    .forEach((rr) => {
      const list = byRun.get(rr.run_id) ?? []
      list.push(rr)
      byRun.set(rr.run_id, list)
    })
  const out: DrawingVerdictForRule[] = []
  const drawings = getDrawings()
  drawings.forEach((d) => {
    // find the latest run for this drawing
    const runsForDrawing = [...DATA.runs, ...MUT.uploadedRuns]
      .filter((r) => r.drawing_id === d.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const latest = runsForDrawing[0]
    if (!latest) return
    const result = allResults.find(
      (rr) => rr.run_id === latest.id && rr.rule_id === ruleId,
    )
    if (!result) return
    out.push({
      drawing_id: d.id,
      drawing_name: d.name,
      drawing_type: d.drawing_type,
      grade: d.grade,
      status: result.status,
      run_id: latest.id,
    })
  })
  return out
}

export function getDrawingsByRuleCode(code: string): DrawingVerdictForRule[] {
  const rule = RULES.find((r) => r.rule_code.toLowerCase() === code.toLowerCase())
  if (!rule) return []
  return getDrawingsByRule(rule.id)
}

/* ------------------------------------------------------------------ */
/* Historical run detail (for "View" link on a revision)               */
/* ------------------------------------------------------------------ */

export function getHistoricalRunDetail(
  drawingId: string,
  runId: string,
): DrawingDetail | null {
  const drawing = getDrawingById(drawingId)
  if (!drawing) return null
  const run = [...DATA.runs, ...MUT.uploadedRuns].find((r) => r.id === runId)
  if (!run) return null
  const override = getTypeOverride(drawingId)
  const review = getReviewLog(drawingId)
  const classification = DATA.classifications[drawingId] ?? {
    drawing_type: drawing.drawing_type,
    confidence: 0.9,
  }
  let baseResults = [...DATA.ruleResults, ...MUT.uploadedResults].filter(
    (rr) => rr.run_id === runId,
  )
  const results = baseResults
    .map((rr) => {
      const rule = ruleById(rr.rule_id)!
      if (!rule) return null
      return {
        ...rr,
        rule,
        flagged: isFlagged(runId, rr.rule_id),
        notes: getNotes(runId, rr.rule_id),
      }
    })
    .filter((rr): rr is RuleResult & { rule: Rule } => Boolean(rr))
  return {
    drawing: {
      ...drawing,
      drawing_type: override ?? drawing.drawing_type,
      type_overridden: override ? true : drawing.type_overridden,
      last_reviewed_by: review?.reviewer ?? drawing.last_reviewed_by ?? null,
      last_reviewed_at: review?.reviewed_at ?? drawing.last_reviewed_at ?? null,
    },
    classification: {
      drawing_type: classification.drawing_type,
      confidence: classification.confidence,
    },
    latest_run: run,
    results,
    revisions: getRevisions(drawingId),
  }
}


/* ------------------------------------------------------------------ */
/* Query functions (single source of truth for API + pages)           */
/* ------------------------------------------------------------------ */

export function getDrawings(): Drawing[] {
  const all = [
    ...DATA.drawings.filter((d) => !MUT.deletedDrawingIds.has(d.id)),
    ...MUT.uploadedDrawings,
  ].map((d) => {
    const override = getTypeOverride(d.id)
    const review = getReviewLog(d.id)
    return {
      ...d,
      drawing_type: override ?? d.drawing_type,
      type_overridden: override ? true : d.type_overridden,
      last_reviewed_by: review?.reviewer ?? d.last_reviewed_by ?? null,
      last_reviewed_at: review?.reviewed_at ?? d.last_reviewed_at ?? null,
    }
  })
  return all.sort(
    (a, b) => new Date(b.last_run_date).getTime() - new Date(a.last_run_date).getTime(),
  )
}

export function getDrawingDetail(id: string): DrawingDetail | null {
  const drawing = getDrawingById(id)
  if (!drawing) return null
  // merge built-in runs + uploaded runs for this drawing
  const runsForDrawing = [
    ...DATA.runs,
    ...MUT.uploadedRuns,
  ]
    .filter((r) => r.drawing_id === id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  const latest = runsForDrawing[0]
  const override = getTypeOverride(id)
  const review = getReviewLog(id)
  const classification = DATA.classifications[id] ?? {
    drawing_type: drawing.drawing_type,
    confidence: 0.9,
  }
  // results: prefer uploaded results for the latest run, fall back to built-in
  let baseResults =
    MUT.uploadedResults.filter((rr) => rr.run_id === latest.id).length > 0
      ? MUT.uploadedResults.filter((rr) => rr.run_id === latest.id)
      : DATA.ruleResults.filter((rr) => rr.run_id === latest.id)
  const results = baseResults
    .map((rr) => {
      const rule = ruleById(rr.rule_id)!
      if (!rule) return null
      return {
        ...rr,
        rule,
        flagged: isFlagged(latest.id, rr.rule_id),
        notes: getNotes(latest.id, rr.rule_id),
      }
    })
    .filter((rr): rr is RuleResult & { rule: Rule } => Boolean(rr))
  return {
    drawing: {
      ...drawing,
      drawing_type: override ?? drawing.drawing_type,
      type_overridden: override ? true : drawing.type_overridden,
      last_reviewed_by: review?.reviewer ?? drawing.last_reviewed_by ?? null,
      last_reviewed_at: review?.reviewed_at ?? drawing.last_reviewed_at ?? null,
    },
    classification: {
      drawing_type: classification.drawing_type,
      confidence: classification.confidence,
    },
    latest_run: latest,
    results,
    revisions: getRevisions(id),
  }
}

export function getRuns(): Run[] {
  return [...DATA.runs, ...MUT.uploadedRuns]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function getRules() {
  const allResults = [...DATA.ruleResults, ...MUT.uploadedResults]
  return RULES.map((rule) => {
    const results = allResults.filter((rr) => rr.rule_id === rule.id)
    const total = results.length
    const pass = results.filter((r) => r.status === "pass").length
    const pass_rate = total > 0 ? round(pass / total, 3) : null
    return { ...rule, pass_rate, evaluations: total }
  })
}

export function getGoldStandard(): GoldStandardEntry[] {
  return [...DATA.goldStandard].sort((a, b) => a.drawing_name.localeCompare(b.drawing_name))
}

export function getStats(): Stats {
  const drawings = getDrawings()
  const totalDrawings = drawings.length
  const avgPassRate = round(
    totalDrawings > 0 ? drawings.reduce((s, d) => s + d.pass_rate, 0) / totalDrawings : 0,
    3,
  )
  const allRuns = [...DATA.runs, ...MUT.uploadedRuns]
  const avgRagas = round(
    allRuns.length > 0 ? allRuns.reduce((s, r) => s + r.ragas_composite, 0) / allRuns.length : 0,
    2,
  )

  const grades: Grade[] = ["A", "B", "C", "D", "F"]
  const gradeDistribution = grades.map((grade) => ({
    grade,
    count: drawings.filter((d) => d.grade === grade).length,
  }))

  const typeMap = new Map<DrawingType, { total: number; sum: number }>()
  drawings.forEach((d) => {
    const cur = typeMap.get(d.drawing_type) ?? { total: 0, sum: 0 }
    cur.total += 1
    cur.sum += d.pass_rate
    typeMap.set(d.drawing_type, cur)
  })
  const byType = Array.from(typeMap.entries()).map(([drawing_type, v]) => ({
    drawing_type,
    total: v.total,
    pass_rate: v.sum / v.total,
  }))

  return {
    total_drawings: totalDrawings,
    overall_pass_rate: avgPassRate,
    avg_ragas_composite: avgRagas,
    total_runs: allRuns.length,
    grade_distribution: gradeDistribution,
    by_drawing_type: byType,
  }
}
