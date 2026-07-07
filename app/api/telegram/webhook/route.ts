import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendPushToWorkspace } from "@/lib/push"

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token")
  if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  const body = await req.json()
  const msg = body?.message
  if (!msg?.text || !msg?.chat?.id) return NextResponse.json({ ok: true })

  const chatId   = String(msg.chat.id)
  const text     = msg.text as string
  const fromName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ") || "Telegram"
  const username = msg.from?.username ? `@${msg.from.username}` : null

  const workspace = await db.workspace.findFirst()
  if (!workspace) return NextResponse.json({ ok: true })

  let session = await db.chatSession.findFirst({
    where: { channel: "telegram", externalId: chatId, status: { not: "closed" } },
  })

  if (!session) {
    session = await db.chatSession.create({
      data: {
        workspaceId: workspace.id,
        channel: "telegram",
        externalId: chatId,
        visitorName: username ?? fromName,
        visitorPage: "Telegram",
        status: "waiting",
      },
    })
  }

  await db.chatMessage.create({
    data: { sessionId: session.id, sender: "visitor", text },
  })
  await db.chatSession.update({
    where: { id: session.id },
    data: { updatedAt: new Date() },
  })

  sendPushToWorkspace(workspace.id, {
    title: `✈️ ${username ?? fromName} (Telegram)`,
    body: text.length > 80 ? text.slice(0, 80) + "…" : text,
    sessionId: session.id,
    url: "/",
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
