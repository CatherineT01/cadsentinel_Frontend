import { NextResponse } from "next/server"
import { getRules } from "@/lib/mock-data"
import { DRAWING_TYPES, SECTIONS } from "@/lib/rules"

export async function GET() {
  return NextResponse.json({
    rules: getRules(),
    drawing_types: DRAWING_TYPES,
    sections: SECTIONS,
  })
}
