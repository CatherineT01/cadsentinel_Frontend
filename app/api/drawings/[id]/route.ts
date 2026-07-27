import { NextResponse } from "next/server"
import { deleteDrawingCompletely, getDrawingDetail } from "@/lib/mock-data"

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const detail = getDrawingDetail(params.id)
  if (!detail) {
    return NextResponse.json({ error: "Drawing not found" }, { status: 404 })
  }
  return NextResponse.json(detail)
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  deleteDrawingCompletely(params.id)
  return NextResponse.json({ ok: true })
}
