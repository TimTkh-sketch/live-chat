import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

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

  if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 })

  const externalChannels = ["vk", "avito"]

  const sessions = await db.chatSession.findMany({
    where: channel
      ? { workspaceId, channel, NOT: { status: "closed" } }
      : status === "active"
        ? { workspaceId, status: { in: ["active", "postponed"] }, NOT: { channel: { in: externalChannels } } }
        : { workspaceId, status, NOT: { channel: { in: externalChannels } } },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      operator: { select: { id: true, name: true, avatar: true } },
    },
  })

  const withUnread = await Promise.all(
    sessions.map(async (s) => {
      const unreadCount = await db.chatMessage.count({
        where: { sessionId: s.id, sender: "visitor", isRead: false },
      })
      return { ...s, unreadCount }
    })
  )

  return NextResponse.json(withUnread)
}
