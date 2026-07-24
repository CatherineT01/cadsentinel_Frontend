"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { useRules } from "@/lib/api"
import { PageBody, PageHeader, Card, LoadingState, ErrorState } from "@/components/shell"
import { SECTIONS } from "@/lib/rules"
import { passRateColor, pct } from "@/lib/ui"
import type { DrawingType, Rule } from "@/lib/types"
import { cn } from "@/lib/utils"

type MatrixRule = Rule & { pass_rate: number | null; evaluations: number }

export default function RulesPage() {
  const { data, error, isLoading } = useRules()
  const [activeCol, setActiveCol] = useState<DrawingType | null>(null)

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
              <span>Tip: hover a column header to highlight a drawing type.</span>
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
                      const sectionRules = data.rules.filter((r) => r.section === section)
                      return (
                        <SectionRows
                          key={section}
                          section={section}
                          rules={sectionRules}
                          types={data.drawing_types}
                          activeCol={activeCol}
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
}: {
  section: string
  rules: MatrixRule[]
  types: DrawingType[]
  activeCol: DrawingType | null
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
        <tr key={rule.id} className="border-b border-border last:border-0 hover:bg-accent/50">
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
