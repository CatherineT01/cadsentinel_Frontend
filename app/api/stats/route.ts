import { NextResponse } from "next/server"
import { getRuns, getStats } from "@/lib/mock-data"

export async function GET() {
  return NextResponse.json({ stats: getStats(), recent_runs: getRuns().slice(0, 8) })
}
