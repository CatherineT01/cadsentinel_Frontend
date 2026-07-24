import { NextResponse } from "next/server"
import { getDrawings } from "@/lib/mock-data"

export async function GET() {
  return NextResponse.json({ drawings: getDrawings() })
}
