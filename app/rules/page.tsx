"use client"

import { useState } from "react"
import { Search, Check, ArrowLeft } from "lucide-react"
import { useRules, useDrawingsByRule } from "@/lib/api"
import { PageBody, PageHeader, Card, LoadingState, ErrorState } from "@/components/shell"
import { SECTIONS } from "@/lib/rules"
import { passRateColor, pct } from "@/lib/ui"
import type { DrawingType, Rule, RuleStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { StatusBadge, TypeBadge, GradeBadge } from "@/components/badges"

type MatrixRule = Rule & { pass_rate: number | null; evaluations: number }

export default function RulesPage() {
  const { data, error, isLoading } = useRules()
  const [activeCol, setActiveCol] = useState<DrawingType | null>(null)
  const [query, setQuery] = useState("")
  const [selectedRule, setSelectedRule] = useState<string | null>(null)

  const filteredRules = (data?.rules ?? []).filter((r) => {
    const q = query.toLowerCase()
    return (
      r.rule_code.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.section.toLowerCase().includes(q)
    )
  })

  if (selectedRule) {
    return (
      <DrawingsByRuleView
        ruleId={selectedRule}
        rules={data?.rules ?? []}
        onBack={() => setSelectedRule(null)}
      />
    )
  }

  return (
    <>
      <PageHeader
        title="Rule Matrix"
        description="Which of the 21 specification rules apply to each of the 9 drawing types, with live pass rates."
      />
      <PageBody className="flex flex-col gap-4">
        {isLoading ? (
          <LoadingState />
        ) : error || !data ? (
          <ErrorState />
        ) : (
          <>
            <div className="relative sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by rule code, description, or section…"
                className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="flex size-4 items-center justify-center rounded bg-primary text-primary-foreground">
                  <Check className="size-3" />
                </span>
                Rule applies
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-4 rounded border border-border bg-muted" />
                Not applicable
              </span>
              <span>Tip: hover a column header to highlight a drawing type. Click a rule row to see drawings.</span>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="sticky left-0 z-10 bg-muted/40 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Rule
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Pass Rate
                      </th>
                      {data.drawing_types.map((t) => (
                        <th
                          key={t}
                          onMouseEnter={() => setActiveCol(t)}
                          onMouseLeave={() => setActiveCol(null)}
                          className={cn(
                            "px-2 py-3 text-center text-xs font-semibold transition-colors",
                            activeCol === t ? "bg-primary/10 text-primary" : "text-foreground",
                          )}
                        >
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SECTIONS.map((section) => {
                      const sectionRules = filteredRules.filter((r) => r.section === section)
                      if (sectionRules.length === 0) return null
                      return (
                        <SectionRows
                          key={section}
                          section={section}
                          rules={sectionRules}
                          types={data.drawing_types}
                          activeCol={activeCol}
                          onSelectRule={(id) => setSelectedRule(id)}
                        />
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </PageBody>
    </>
  )
}

function SectionRows({
  section,
  rules,
  types,
  activeCol,
  onSelectRule,
}: {
  section: string
  rules: MatrixRule[]
  types: DrawingType[]
  activeCol: DrawingType | null
  onSelectRule: (id: string) => void
}) {
  return (
    <>
      <tr>
        <td
          colSpan={2 + types.length}
          className="sticky left-0 bg-secondary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-secondary-foreground"
        >
          {section}
        </td>
      </tr>
      {rules.map((rule) => (
        <tr
          key={rule.id}
          className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/50"
          onClick={() => onSelectRule(rule.id)}
        >
          <th
            scope="row"
            className="sticky left-0 z-10 bg-card px-4 py-2.5 text-left align-middle font-normal"
          >
            <span className="font-mono text-xs font-semibold text-foreground">
              {rule.rule_code}
            </span>
            <span className="ml-2 hidden text-xs text-muted-foreground lg:inline">
              {rule.description}
            </span>
          </th>
          <td className="px-3 py-2.5">
            {rule.pass_rate === null ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      rule.pass_rate >= 0.85
                        ? "bg-emerald-500"
                        : rule.pass_rate >= 0.6
                          ? "bg-amber-500"
                          : "bg-red-500",
                    )}
                    style={{ width: `${Math.round(rule.pass_rate * 100)}%` }}
                  />
                </div>
                <span className={cn("text-xs tabular-nums", passRateColor(rule.pass_rate))}>
                  {pct(rule.pass_rate)}
                </span>
              </div>
            )}
          </td>
          {types.map((t) => {
            const applies = rule.applicable_drawing_types.includes(t)
            return (
              <td
                key={t}
                className={cn(
                  "px-2 py-2.5 text-center",
                  activeCol === t && "bg-primary/5",
                )}
              >
                {applies ? (
                  <span className="inline-flex size-5 items-center justify-center rounded bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                ) : (
                  <span className="inline-block size-5 rounded border border-border bg-muted/60" />
                )}
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Drawings by Rule view                                                */
/* ------------------------------------------------------------------ */

function DrawingsByRuleView({
  ruleId,
  rules,
  onBack,
}: {
  ruleId: string
  rules: MatrixRule[]
  onBack: () => void
}) {
  const { data, error, isLoading } = useDrawingsByRule(ruleId)
  const [sortBy, setSortBy] = useState<"status" | "name" | "grade">("status")

  const rule = rules.find((r) => r.id === ruleId)
  const drawings = data?.drawings ?? []

  const sorted = [...drawings].sort((a, b) => {
    if (sortBy === "name") return a.drawing_name.localeCompare(b.drawing_name)
    if (sortBy === "grade") return a.grade.localeCompare(b.grade)
    const order: Record<RuleStatus, number> = { fail: 0, warning: 1, needs_review: 2, pass: 3 }
    return order[a.status] - order[b.status]
  })

  return (
    <>
      <PageHeader
        title={rule ? `Drawings by Rule — ${rule.rule_code}` : "Drawings by Rule"}
        description={rule?.description ?? ""}
        actions={
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            <ArrowLeft className="size-4" /> Back to Matrix
          </button>
        }
      />
      <PageBody className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Sort by:</span>
          <button onClick={() => setSortBy("status")} className={cn("rounded px-2 py-1", sortBy === "status" ? "bg-primary text-primary-foreground" : "bg-card border border-border")}>Status</button>
          <button onClick={() => setSortBy("name")} className={cn("rounded px-2 py-1", sortBy === "name" ? "bg-primary text-primary-foreground" : "bg-card border border-border")}>Name</button>
          <button onClick={() => setSortBy("grade")} className={cn("rounded px-2 py-1", sortBy === "grade" ? "bg-primary text-primary-foreground" : "bg-card border border-border")}>Grade</button>
        </div>
        <Card className="overflow-hidden">
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState />
          ) : sorted.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No drawings found for this rule.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Drawing</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium">Grade</th>
                    <th className="px-4 py-2.5 font-medium">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.map((d) => (
                    <tr key={d.drawing_id} className="hover:bg-accent">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">{d.drawing_name}</td>
                      <td className="px-4 py-3"><TypeBadge type={d.drawing_type as DrawingType} /></td>
                      <td className="px-4 py-3"><GradeBadge grade={d.grade as any} /></td>
                      <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </PageBody>
    </>
  )
}
