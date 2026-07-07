import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendPushToWorkspace } from "@/lib/push"
import { sendTelegram, sendVk, sendAvito } from "@/lib/channels"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get("sessionId")
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })

  const messages = await db.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(messages)
}

export async function POST(req: NextRequest) {
  const { sessionId, text, sender, attachmentUrl } = await req.json()
  if (!sessionId || !sender || (!text && !attachmentUrl)) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const message = await db.chatMessage.create({ data: { sessionId, text: text || "", sender, attachmentUrl } })

  await db.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } })

  if (sender === "operator") {
    await db.chatMessage.updateMany({
      where: { sessionId, sender: "visitor", isRead: false },
      data: { isRead: true },
    })

    // Route reply back to external channel
    const session = await db.chatSession.findUnique({
      where: { id: sessionId },
      select: { channel: true, externalId: true },
    })
    if (session?.externalId) {
      if (session.channel === "telegram") {
        sendTelegram(session.externalId, text).catch(() => {})
      } else if (session.channel === "vk") {
        sendVk(session.externalId, text).catch(() => {})
      } else if (session.channel === "avito") {
        sendAvito(session.externalId, text).catch(() => {})
      }
    }
  }

  if (sender === "visitor") {
    const session = await db.chatSession.findUnique({
      where: { id: sessionId },
      select: { workspaceId: true, visitorName: true, channel: true },
    })
    if (session) {
      const channelLabel = session.channel === "telegram" ? " (TG)" : session.channel === "vk" ? " (VK)" : session.channel === "avito" ? " (Авито)" : ""
      const visitorName = (session.visitorName || "Посетитель") + channelLabel
      sendPushToWorkspace(session.workspaceId, {
        title: `💬 ${visitorName}`,
        body: text.length > 80 ? text.slice(0, 80) + "…" : text,
        sessionId,
        url: "/",
      }).catch(() => {})
    }
  }

  return NextResponse.json(message)
}
