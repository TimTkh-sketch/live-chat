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
