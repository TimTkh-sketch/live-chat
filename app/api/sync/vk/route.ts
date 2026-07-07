import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getOperatorSession } from "@/lib/auth"

export async function POST() {
  const op = await getOperatorSession()
  if (!op) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = process.env.VK_GROUP_TOKEN
  const groupId = process.env.VK_GROUP_ID
  if (!token || !groupId) return NextResponse.json({ error: "VK not configured" }, { status: 400 })

  const workspace = await db.workspace.findFirst()
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 400 })

  let synced = 0
  let offset = 0
  const count = 200

  // Enable message_reply callback event
  try {
    const serversR = await fetch(
      `https://api.vk.com/method/groups.getCallbackServers?group_id=${groupId}&access_token=${token}&v=5.199`
    )
    const serversData = await serversR.json()
    const serverId = serversData?.response?.items?.[0]?.id
    if (serverId) {
      await fetch(
        `https://api.vk.com/method/groups.setCallbackSettings?group_id=${groupId}&server_id=${serverId}&message_new=1&message_reply=1&access_token=${token}&v=5.199`
      )
    }
  } catch {}

  // Paginate through all conversations
  while (true) {
    const r = await fetch(
      `https://api.vk.com/method/messages.getConversations?group_id=${groupId}&access_token=${token}&v=5.199&count=${count}&offset=${offset}`
    )
    const data = await r.json()
    const items = data?.response?.items as Array<{ conversation: { peer: { id: number } } }> | undefined
    if (!items?.length) break

    for (const item of items) {
      const peerId = item.conversation.peer.id
      if (peerId < 0) continue // skip group chats

      const userId = String(peerId)

      // Resolve user name
      let visitorName = `VK #${userId}`
      try {
        const ur = await fetch(`https://api.vk.com/method/users.get?user_ids=${userId}&access_token=${token}&v=5.199`)
        const ud = await ur.json()
        const u = ud?.response?.[0]
        if (u) visitorName = `${u.first_name} ${u.last_name}`.trim()
      } catch {}

      // Find or create session (any status — including closed for history)
      let session = await db.chatSession.findFirst({
        where: { channel: "vk", externalId: userId },
        orderBy: { createdAt: "desc" },
      })
      if (!session) {
        session = await db.chatSession.create({
          data: {
            workspaceId: workspace.id,
            channel: "vk",
            externalId: userId,
            visitorName,
            visitorPage: "ВКонтакте",
            status: "active",
          },
        })
      }

      // Load message history (newest first, then we reverse)
      const hr = await fetch(
        `https://api.vk.com/method/messages.getHistory?peer_id=${userId}&group_id=${groupId}&access_token=${token}&v=5.199&count=200&rev=0`
      )
      const hd = await hr.json()
      const msgs = (hd?.response?.items as Array<{ id: number; from_id: number; text: string; date: number }> | undefined)?.reverse() ?? []

      for (const msg of msgs) {
        if (!msg.text) continue
        const isGroup = msg.from_id < 0
        const sender = isGroup ? "operator" : "visitor"
        const extId = `vk_${msg.id}`

        try {
          await db.chatMessage.upsert({
            where: { externalId: extId },
            create: {
              sessionId: session.id,
              sender,
              text: msg.text,
              externalId: extId,
              isRead: true,
              createdAt: new Date(msg.date * 1000),
            },
            update: {},
          })
          synced++
        } catch {}
      }
    }

    if (items.length < count) break
    offset += count
  }

  return NextResponse.json({ ok: true, synced })
}
