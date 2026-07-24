import type { DrawingType, Grade, RuleStatus } from "./types"

/* Status color coding — used consistently everywhere */
export const STATUS_META: Record<
  RuleStatus,
  { label: string; badge: string; dot: string; bar: string; text: string }
> = {
  pass: {
    label: "Pass",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    text: "text-emerald-600",
  },
  fail: {
    label: "Fail",
    badge: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
    dot: "bg-red-500",
    bar: "bg-red-500",
    text: "text-red-600",
  },
  warning: {
    label: "Warning",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    text: "text-amber-600",
  },
  needs_review: {
    label: "Needs Review",
    badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
    dot: "bg-blue-500",
    bar: "bg-blue-500",
    text: "text-blue-600",
  },
}

/* Grade badge colors A–F */
export const GRADE_META: Record<Grade, string> = {
  A: "bg-emerald-500 text-white",
  B: "bg-teal-500 text-white",
  C: "bg-amber-500 text-white",
  D: "bg-orange-500 text-white",
  F: "bg-red-500 text-white",
}

/* Distinct badge color per drawing type */
export const TYPE_META: Record<DrawingType, string> = {
  REH: "bg-sky-50 text-sky-700 ring-1 ring-sky-600/20",
  CEH: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20",
  Gland: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-600/20",
  Piston: "bg-violet-50 text-violet-700 ring-1 ring-violet-600/20",
  Barrel: "bg-teal-50 text-teal-700 ring-1 ring-teal-600/20",
  Rod: "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-600/20",
  "Acc/Misc": "bg-stone-100 text-stone-700 ring-1 ring-stone-500/20",
  Assy: "bg-blue-50 text-blue-800 ring-1 ring-blue-700/20",
  PRO: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20",
}

export function ragasColor(score: number): string {
  if (score >= 0.85) return "text-emerald-600"
  if (score >= 0.7) return "text-amber-600"
  return "text-red-600"
}

export function passRateColor(rate: number): string {
  if (rate >= 0.85) return "text-emerald-600"
  if (rate >= 0.6) return "text-amber-600"
  return "text-red-600"
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}
