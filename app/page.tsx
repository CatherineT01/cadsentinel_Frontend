"use client"

import Link from "next/link"
import { FileCheck2, GaugeCircle, Award, Sparkles, ChevronRight } from "lucide-react"
import { useStats } from "@/lib/api"
import { PageBody, PageHeader, Card, LoadingState, ErrorState } from "@/components/shell"
import { StatCard } from "@/components/stat-card"
import { PassRateChart } from "@/components/pass-rate-chart"
import { GradeBadge, TypeBadge } from "@/components/badges"
import { GRADE_META } from "@/lib/ui"
import { formatDateTime, pct, ragasColor } from "@/lib/ui"
import type { Grade } from "@/lib/types"

export default function DashboardPage() {
  const { data, error, isLoading } = useStats()

  return (
    <>
      <PageHeader
        title="Compliance Dashboard"
        description="Automated validation overview across all processed hydraulic cylinder drawings."
      />
      <PageBody className="flex flex-col gap-6">
        {isLoading ? (
          <LoadingState />
        ) : error || !data ? (
          <ErrorState />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Drawings Processed"
                value={String(data.stats.total_drawings)}
                sub={`${data.stats.total_runs} total validation runs`}
                icon={FileCheck2}
              />
              <StatCard
                label="Overall Pass Rate"
                value={pct(data.stats.overall_pass_rate)}
                sub="Mean across all drawings"
                icon={GaugeCircle}
                valueClassName={
                  data.stats.overall_pass_rate >= 0.85
                    ? "text-emerald-600"
                    : data.stats.overall_pass_rate >= 0.6
                      ? "text-amber-600"
                      : "text-red-600"
                }
              />
              <StatCard
                label="Avg RAGAS Composite"
                value={data.stats.avg_ragas_composite.toFixed(2)}
                sub="Retrieval · evidence · decision · faithfulness"
                icon={Sparkles}
                valueClassName={ragasColor(data.stats.avg_ragas_composite)}
              />
              <GradeDistributionCard distribution={data.stats.grade_distribution} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <Card
                className="lg:col-span-3"
                title="Pass Rate by Drawing Type"
                description="Compliance performance across the 9 classified drawing types"
              >
                <PassRateChart data={data.stats.by_drawing_type} />
              </Card>

              <Card
                className="lg:col-span-2"
                title="Recent Runs"
                action={
                  <Link
                    href="/runs"
                    className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                  >
                    View all <ChevronRight className="size-3.5" />
                  </Link>
                }
              >
                <ul className="divide-y divide-border">
                  {data.recent_runs.map((run) => (
                    <li key={run.id}>
                      <Link
                        href={`/drawings/${run.drawing_id}`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
                      >
                        <GradeBadge grade={run.grade} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-xs font-medium text-foreground">
                            {run.drawing_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDateTime(run.timestamp)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-xs tabular-nums">
                          <span className="text-emerald-600">{run.pass_count}P</span>
                          <span className="text-red-600">{run.fail_count}F</span>
                          <span className="text-amber-600">{run.warning_count}W</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </>
        )}
      </PageBody>
    </>
  )
}

function GradeDistributionCard({
  distribution,
}: {
  distribution: { grade: Grade; count: number }[]
}) {
  const max = Math.max(1, ...distribution.map((d) => d.count))
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Grade Distribution
        </p>
        <div className="flex size-8 items-center justify-center rounded-md bg-accent text-primary">
          <Award className="size-4" />
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-1.5" style={{ height: 56 }}>
        {distribution.map((d) => (
          <div key={d.grade} className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[11px] font-semibold tabular-nums text-foreground">
              {d.count}
            </span>
            <div
              className={`w-full rounded-t ${GRADE_META[d.grade].split(" ")[0]}`}
              style={{ height: `${Math.max(6, (d.count / max) * 100)}%` }}
            />
            <span className="text-[11px] font-medium text-muted-foreground">{d.grade}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
