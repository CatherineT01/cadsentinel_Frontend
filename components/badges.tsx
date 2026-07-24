import { cn } from "@/lib/utils"
import { GRADE_META, STATUS_META, TYPE_META } from "@/lib/ui"
import type { DrawingType, Grade, RuleStatus } from "@/lib/types"

export function StatusBadge({ status, className }: { status: RuleStatus; className?: string }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        meta.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </span>
  )
}

export function GradeBadge({ grade, className }: { grade: Grade; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-md text-xs font-bold tabular-nums",
        GRADE_META[grade],
        className,
      )}
      title={`Grade ${grade}`}
    >
      {grade}
    </span>
  )
}

export function TypeBadge({ type, className }: { type: DrawingType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        TYPE_META[type],
        className,
      )}
    >
      {type}
    </span>
  )
}
