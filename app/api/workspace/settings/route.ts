import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getOperatorSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")

  if (token) {
    const ws = await db.workspace.findUnique({
      where: { token },
      include: { settings: true, operators: { where: { isOnline: true }, select: { id: true, name: true, avatar: true, isOnline: true } } },
    })
    if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ settings: ws.settings, operators: ws.operators })
  }

  const op = await getOperatorSession()
  if (!op) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const ws = await db.workspace.findUnique({
    where: { id: op.workspaceId },
    include: { settings: true },
  })
  return NextResponse.json(ws?.settings ?? null)
}

export async function PATCH(req: NextRequest) {
  const op = await getOperatorSession()
  if (!op) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!op.canManageSettings) return NextResponse.json({ error: "Нет прав на изменение настроек" }, { status: 403 })

  const body = await req.json()
  const settings = await db.workspaceSettings.upsert({
    where: { workspaceId: op.workspaceId },
    create: { workspaceId: op.workspaceId, ...body },
    update: body,
  })
  return NextResponse.json(settings)
}
