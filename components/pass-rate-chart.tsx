import type { DrawingTypeStat } from "@/lib/types"
import { cn } from "@/lib/utils"

function barColor(rate: number) {
  if (rate >= 0.85) return "bg-emerald-500"
  if (rate >= 0.6) return "bg-amber-500"
  return "bg-red-500"
}

export function PassRateChart({ data }: { data: DrawingTypeStat[] }) {
  return (
    <div className="px-4 py-5">
      <div className="flex items-end justify-between gap-2 sm:gap-3" style={{ height: 200 }}>
        {data.map((d) => {
          const heightPct = Math.max(4, Math.round(d.pass_rate * 100))
          return (
            <div key={d.drawing_type} className="flex h-full min-w-0 flex-1 flex-col items-center gap-2">
              <span className="text-xs font-medium tabular-nums text-foreground">
                {Math.round(d.pass_rate * 100)}%
              </span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className={cn("w-full rounded-t transition-all", barColor(d.pass_rate))}
                  style={{ height: `${heightPct}%` }}
                  title={`${d.drawing_type}: ${Math.round(d.pass_rate * 100)}% pass rate`}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between gap-2 sm:gap-3">
        {data.map((d) => (
          <div key={d.drawing_type} className="min-w-0 flex-1 text-center">
            <span className="block truncate text-[11px] font-medium text-muted-foreground">
              {d.drawing_type}
            </span>
            <span className="text-[10px] text-muted-foreground/70">n={d.total}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
