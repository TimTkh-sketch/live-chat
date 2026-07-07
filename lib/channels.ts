export async function getAvitoToken(): Promise<string | null> {
  const clientId = process.env.AVITO_CLIENT_ID
  const clientSecret = process.env.AVITO_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  try {
    const r = await fetch("https://api.avito.ru/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })
    const data = await r.json()
    return (data.access_token as string) ?? null
  } catch {
    return null
  }
}

export async function sendAvito(chatId: string, text: string) {
  const userId = process.env.AVITO_USER_ID
  if (!userId) return
  const token = await getAvitoToken()
  if (!token) return
  await fetch(`https://api.avito.ru/messenger/v3/accounts/${userId}/chats/${chatId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { text }, type: "text" }),
  }).catch(() => {})
}

export async function sendTelegram(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch(() => {})
}

export async function sendVk(userId: string, text: string) {
  const token = process.env.VK_GROUP_TOKEN
  if (!token) return
  const randomId = Math.floor(Math.random() * 1e9)
  const params = new URLSearchParams({
    user_id: userId,
    message: text,
    random_id: String(randomId),
    access_token: token,
    v: "5.199",
  })
  await fetch(`https://api.vk.com/method/messages.send?${params}`).catch(() => {})
}
