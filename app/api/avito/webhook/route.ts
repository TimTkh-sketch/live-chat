import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendPushToWorkspace } from "@/lib/push"
import { getAvitoToken } from "@/lib/channels"

async function resolveAvitoName(chatId: string, userId: string, token: string): Promise<string> {
  try {
    const r = await fetch(`https://api.avito.ru/messenger/v3/accounts/${userId}/chats/${chatId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await r.json()
    const users = data?.chat?.users as Array<{ id: number; name: string }> | undefined
    const sender = users?.find(u => String(u.id) !== userId)
    if (sender?.name) return sender.name
  } catch {}
  return `Авито #${chatId}`
}

async function getOrCreateSession(workspaceId: string, chatId: string, visitorName: string) {
  let session = await db.chatSession.findFirst({
    where: { channel: "avito", externalId: chatId, status: { not: "closed" } },
  })
  if (!session) {
    session = await db.chatSession.create({
      data: {
        workspaceId,
        channel: "avito",
        externalId: chatId,
        visitorName,
        visitorPage: "Авито",
        status: "active",
      },
    })
  }
  return session
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.payload?.type !== "message") return new NextResponse("ok")

  const val = body.payload?.value
  const msg = val?.message

  if (!msg || msg.type !== "text") return new NextResponse("ok")

  const chatId = String(val.chat_id)
  const text = msg.content?.text as string
  const msgId = String(msg.id)
  if (!text) return new NextResponse("ok")

  const workspace = await db.workspace.findFirst()
  if (!workspace) return new NextResponse("ok")

  const userId = process.env.AVITO_USER_ID ?? ""
  const token = await getAvitoToken()
  const visitorName = token ? await resolveAvitoName(chatId, userId, token) : `Авито #${chatId}`

  const session = await getOrCreateSession(workspace.id, chatId, visitorName)

  const isOutgoing = msg.direction === "out"
  const sender = isOutgoing ? "operator" : "visitor"

  await db.chatMessage.upsert({
    where: { externalId: `avito_${msgId}` },
    create: { sessionId: session.id, sender, text, externalId: `avito_${msgId}`, isRead: isOutgoing },
    update: {},
  })
  await db.chatSession.update({ where: { id: session.id }, data: { updatedAt: new Date() } })

  if (!isOutgoing) {
    sendPushToWorkspace(workspace.id, {
      title: `💬 ${visitorName} (Авито)`,
      body: text.length > 80 ? text.slice(0, 80) + "…" : text,
      sessionId: session.id,
      url: "/",
    }).catch(() => {})
  }

  return new NextResponse("ok")
}
