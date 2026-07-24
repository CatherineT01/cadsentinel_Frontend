import { RULES, ruleById } from "./rules"
import type {
  Drawing,
  DrawingDetail,
  DrawingType,
  GoldStandardEntry,
  Grade,
  RagasScores,
  Rule,
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
/* Query functions (single source of truth for API + pages)           */
/* ------------------------------------------------------------------ */

export function getDrawings(): Drawing[] {
  return [...DATA.drawings].sort(
    (a, b) => new Date(b.last_run_date).getTime() - new Date(a.last_run_date).getTime(),
  )
}

export function getDrawingDetail(id: string): DrawingDetail | null {
  const drawing = DATA.drawings.find((d) => d.id === id)
  if (!drawing) return null
  const runsForDrawing = DATA.runs
    .filter((r) => r.drawing_id === id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  const latest = runsForDrawing[0]
  const classification = DATA.classifications[id]
  const results = DATA.ruleResults
    .filter((rr) => rr.run_id === latest.id)
    .map((rr) => ({ ...rr, rule: ruleById(rr.rule_id)! }))
    .filter((rr) => rr.rule)
  return {
    drawing,
    classification: {
      drawing_type: classification.drawing_type,
      confidence: classification.confidence,
    },
    latest_run: latest,
    results,
  }
}

export function getRuns(): Run[] {
  return [...DATA.runs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
}

export function getRules() {
  // include pass-rate per rule across latest results
  return RULES.map((rule) => {
    const results = DATA.ruleResults.filter((rr) => rr.rule_id === rule.id)
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
  const drawings = DATA.drawings
  const totalDrawings = drawings.length
  const avgPassRate = round(
    drawings.reduce((s, d) => s + d.pass_rate, 0) / totalDrawings,
    3,
  )
  const avgRagas = round(
    DATA.runs.reduce((s, r) => s + r.ragas_composite, 0) / DATA.runs.length,
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
    pass_rate: round(v.sum / v.total, 3),
  }))

  return {
    total_drawings: totalDrawings,
    overall_pass_rate: avgPassRate,
    avg_ragas_composite: avgRagas,
    total_runs: DATA.runs.length,
    grade_distribution: gradeDistribution,
    by_drawing_type: byType,
  }
}
