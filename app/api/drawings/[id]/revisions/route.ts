import { NextResponse } from "next/server"
import { getRevisions } from "@/lib/mock-data"

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  return NextResponse.json({ revisions: getRevisions(params.id) })
}
