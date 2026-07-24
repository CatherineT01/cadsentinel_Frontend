import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-card px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
      <div className="min-w-0">
        <h1 className="text-balance text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-pretty text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className={cn("flex-1 px-5 py-6 md:px-8", className)}>{children}</main>
  )
}

export function Card({
  children,
  className,
  title,
  description,
  action,
}: {
  children: ReactNode
  className?: string
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            {title ? (
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  )
}

export function ErrorState({ label = "Failed to load data." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-red-600">{label}</div>
  )
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      {label}
    </div>
  )
}
