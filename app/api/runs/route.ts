import { NextResponse } from "next/server"
import { getRuns } from "@/lib/mock-data"

export async function GET() {
  return NextResponse.json({ runs: getRuns() })
}
