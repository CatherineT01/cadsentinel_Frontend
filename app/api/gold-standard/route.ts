import { NextResponse } from "next/server"
import { getGoldStandard } from "@/lib/mock-data"

export async function GET() {
  return NextResponse.json({ entries: getGoldStandard() })
}
