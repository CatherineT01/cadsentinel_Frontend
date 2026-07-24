import useSWR from "swr"
import type {
  Drawing,
  DrawingDetail,
  DrawingType,
  GoldStandardEntry,
  Rule,
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

/*
 * Swap-friendly API layer. Each hook maps 1:1 to a REST endpoint so the
 * mock routes can be replaced with real backend endpoints without touching
 * the components that consume them.
 */

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

export function useGoldStandard() {
  return useSWR<{ entries: GoldStandardEntry[] }>("/api/gold-standard", fetcher)
}
