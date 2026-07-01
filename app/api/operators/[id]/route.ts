import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getOperatorSession } from "@/lib/auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getOperatorSession()
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const allowed = ["name", "email", "avatar", "isOnline"]
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  if (body.password) {
    const bcrypt = await import("bcryptjs")
    data.password = await bcrypt.hash(body.password, 10)
  }

  const op = await db.operator.update({
    where: { id, workspaceId: me.workspaceId },
    data,
    select: { id: true, name: true, email: true, avatar: true, isOnline: true },
  })
  return NextResponse.json(op)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getOperatorSession()
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (id === me.id) return NextResponse.json({ error: "Нельзя удалить себя" }, { status: 400 })

  await db.operator.delete({ where: { id, workspaceId: me.workspaceId } })
  return NextResponse.json({ ok: true })
}
