import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  valueClassName,
}: {
  label: string
  value: string
  sub?: string
  icon: LucideIcon
  valueClassName?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="flex size-8 items-center justify-center rounded-md bg-accent text-primary">
          <Icon className="size-4" />
        </div>
      </div>
      <p className={cn("mt-3 text-2xl font-semibold tabular-nums text-foreground", valueClassName)}>
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  )
}
