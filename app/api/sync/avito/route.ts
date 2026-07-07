import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getOperatorSession } from "@/lib/auth"
import { getAvitoToken } from "@/lib/channels"

export async function POST() {
  const op = await getOperatorSession()
  if (!op) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = process.env.AVITO_USER_ID
  if (!userId) return NextResponse.json({ error: "Avito not configured" }, { status: 400 })

  const token = await getAvitoToken()
  if (!token) return NextResponse.json({ error: "Cannot get Avito token" }, { status: 400 })

  const workspace = await db.workspace.findFirst()
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 400 })

  let synced = 0
  let page = 1

  while (true) {
    const r = await fetch(
      `https://api.avito.ru/messenger/v3/accounts/${userId}/chats?limit=50&offset=${(page - 1) * 50}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await r.json()
    const chats = data?.chats as Array<{ id: string; users: Array<{ id: number; name: string }> }> | undefined
    if (!chats?.length) break

    for (const chat of chats) {
      const chatId = chat.id
      const visitor = chat.users?.find(u => String(u.id) !== userId)
      const visitorName = visitor?.name ?? `Авито #${chatId}`

      let session = await db.chatSession.findFirst({
        where: { channel: "avito", externalId: chatId },
        orderBy: { createdAt: "desc" },
      })
      if (!session) {
        session = await db.chatSession.create({
          data: {
            workspaceId: workspace.id,
            channel: "avito",
            externalId: chatId,
            visitorName,
            visitorPage: "Авито",
            status: "active",
          },
        })
      }

      // Load messages
      const freshToken = await getAvitoToken()
      if (!freshToken) continue

      const mr = await fetch(
        `https://api.avito.ru/messenger/v3/accounts/${userId}/chats/${chatId}/messages?limit=100`,
        { headers: { Authorization: `Bearer ${freshToken}` } }
      )
      const md = await mr.json()
      const messages = md?.messages as Array<{
        id: string; type: string; direction: string; created: number
        content?: { text?: string }
      }> | undefined
      if (!messages?.length) continue

      for (const msg of messages) {
        if (msg.type !== "text" || !msg.content?.text) continue
        const sender = msg.direction === "out" ? "operator" : "visitor"
        const extId = `avito_${msg.id}`

        try {
          await db.chatMessage.upsert({
            where: { externalId: extId },
            create: {
              sessionId: session.id,
              sender,
              text: msg.content.text,
              externalId: extId,
              isRead: true,
              createdAt: new Date(msg.created * 1000),
            },
            update: {},
          })
          synced++
        } catch {}
      }
    }

    if (chats.length < 50) break
    page++
  }

  return NextResponse.json({ ok: true, synced })
}
