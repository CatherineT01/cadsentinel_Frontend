import { NextResponse } from "next/server"
import { getRevisions } from "@/lib/mock-data"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return NextResponse.json({ revisions: getRevisions(id) })
}
