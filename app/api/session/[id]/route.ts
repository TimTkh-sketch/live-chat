import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const allowed = ["status", "operatorId", "visitorName", "visitorEmail", "visitorPhone", "postponedUntil"]
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }
  if (body.status === "closed") data.closedAt = new Date()

  const session = await db.chatSession.update({ where: { id }, data, include: { operator: true } })
  return NextResponse.json(session)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await db.chatSession.findUnique({
    where: { id },
    include: {
      operator: { select: { id: true, name: true, avatar: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  })
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(session)
}
