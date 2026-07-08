import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getOperatorSession } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const { token, visitorPage, visitorName, visitorEmail } = await req.json()

  const workspace = await db.workspace.findUnique({ where: { token } })
  if (!workspace) return NextResponse.json({ error: "Invalid token" }, { status: 404 })

  const session = await db.chatSession.create({
    data: {
      workspaceId: workspace.id,
      visitorPage,
      visitorName,
      visitorEmail,
      status: "waiting",
    },
  })

  return NextResponse.json({ id: session.id, workspaceId: workspace.id })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get("workspaceId")
  const status = searchParams.get("status") || "waiting"
  const channel = searchParams.get("channel")
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
  const offset = parseInt(searchParams.get("offset") || "0")

  if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 })

  const externalChannels = ["vk", "avito"]
  const op = await getOperatorSession()

  const where = channel
    ? { workspaceId, channel, NOT: { status: "closed" } }
    : status === "active"
      ? { workspaceId, status: { in: ["active", "postponed"] }, NOT: { channel: { in: externalChannels } }, ...(op ? { operatorId: op.id } : {}) }
      : { workspaceId, status, NOT: { channel: { in: externalChannels } } }

  const [sessions, total] = await Promise.all([
    db.chatSession.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        operator: { select: { id: true, name: true, avatar: true } },
      },
    }),
    db.chatSession.count({ where }),
  ])

  // Считаем unread одним запросом вместо N запросов
  const sessionIds = sessions.map(s => s.id)
  const unreadRows = await db.chatMessage.groupBy({
    by: ["sessionId"],
    where: { sessionId: { in: sessionIds }, sender: "visitor", isRead: false },
    _count: { id: true },
  })
  const unreadMap = Object.fromEntries(unreadRows.map(r => [r.sessionId, r._count.id]))

  const withUnread = sessions.map(s => ({ ...s, unreadCount: unreadMap[s.id] ?? 0 }))

  return NextResponse.json({ sessions: withUnread, total, limit, offset })
}
