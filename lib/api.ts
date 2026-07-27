import useSWR, { mutate } from "swr"
import type {
  BatchRun,
  Drawing,
  DrawingDetail,
  DrawingType,
  DuplicateInfo,
  Revision,
  Rule,
  RuleNote,
  RuleStatus,
  Run,
  Section,
  Stats,
} from "./types"

export const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const err = new Error("Request failed")
    throw err
  }
  return res.json()
}

export const api = {
  async post<T>(url: string, body?: unknown): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) throw new Error("Request failed")
    return res.json() as Promise<T>
  },
  async patch<T>(url: string, body?: unknown): Promise<T> {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) throw new Error("Request failed")
    return res.json() as Promise<T>
  },
  async del<T>(url: string): Promise<T> {
    const res = await fetch(url, { method: "DELETE" })
    if (!res.ok) throw new Error("Request failed")
    return res.json() as Promise<T>
  },
}

/* ------------------------------------------------------------------ */
/* SWR data hooks                                                      */
/* ------------------------------------------------------------------ */

export function useDrawings() {
  return useSWR<{ drawings: Drawing[] }>("/api/drawings", fetcher)
}

export function useDrawing(id: string) {
  return useSWR<DrawingDetail>(id ? `/api/drawings/${id}` : null, fetcher)
}

export function useRuns() {
  return useSWR<{ runs: Run[] }>("/api/runs", fetcher)
}

export function useRules() {
  return useSWR<{
    rules: (Rule & { pass_rate: number | null; evaluations: number })[]
    drawing_types: DrawingType[]
    sections: Section[]
  }>("/api/rules", fetcher)
}

export function useStats() {
  return useSWR<{ stats: Stats; recent_runs: Run[] }>("/api/stats", fetcher)
}

export function useRevisions(drawingId: string) {
  return useSWR<{ revisions: Revision[] }>(
    drawingId ? `/api/drawings/${drawingId}/revisions` : null,
    fetcher,
  )
}

export function useDrawingsByRule(ruleId: string) {
  return useSWR<{ drawings: { drawing_id: string; drawing_name: string; drawing_type: DrawingType; grade: string; status: RuleStatus }[] }>(
    ruleId ? `/api/rules/${ruleId}/drawings` : null,
    fetcher,
  )
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

export async function checkDuplicates(filenames: string[]): Promise<{ duplicates: DuplicateInfo[] }> {
  return api.post("/api/upload/check-duplicates", { filenames })
}

export async function toggleFlag(runId: string, ruleId: string, flagged: boolean) {
  const res = await api.post<{ flagged: boolean }>(
    `/api/rule-results/${encodeURIComponent(runId)}/${encodeURIComponent(ruleId)}/flag`,
    { flagged },
  )
  await mutate(`/api/drawings/${runId.split("-")[0]}`)
  return res
}

export async function addNoteApi(runId: string, ruleId: string, text: string, author: string): Promise<RuleNote> {
  return api.post(`/api/rule-results/${encodeURIComponent(runId)}/${encodeURIComponent(ruleId)}/notes`, {
    text,
    author,
  })
}

export async function logReview(drawingId: string, reviewer: string) {
  return api.post(`/api/drawings/${encodeURIComponent(drawingId)}/review-log`, { reviewer })
}

export async function overrideType(drawingId: string, type: DrawingType) {
  return api.patch(`/api/drawings/${encodeURIComponent(drawingId)}/type`, { type })
}

export async function deleteDrawing(drawingId: string) {
  return api.del(`/api/drawings/${encodeURIComponent(drawingId)}`)
}

export async function uploadDrawing(filename: string): Promise<{ drawing: Drawing; run: Run }> {
  return api.post("/api/upload", { filename })
}

export async function generateBatchReport(runId: string): Promise<{ ok: boolean }> {
  return api.post(`/api/runs/${encodeURIComponent(runId)}/report`)
}

export { mutate }
