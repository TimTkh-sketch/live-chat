import { NextRequest, NextResponse } from "next/server"
import { getOperatorSession } from "@/lib/auth"
import fs from "fs"
import path from "path"

function setEnvVar(src: string, key: string, value: string) {
  const re = new RegExp(`^${key}=.*$`, "m")
  const line = `${key}="${value}"`
  return re.test(src) ? src.replace(re, line) : src + `\n${line}`
}

export async function POST(req: NextRequest) {
  const op = await getOperatorSession()
  if (!op) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 })

  // Save token to .env
  const envPath = path.join(process.cwd(), ".env")
  let content = ""
  try { content = fs.readFileSync(envPath, "utf8") } catch {}
  content = setEnvVar(content, "TELEGRAM_BOT_TOKEN", token)
  fs.writeFileSync(envPath, content)

  // Register webhook with Telegram
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL not set" }, { status: 400 })

  const webhookUrl = `${appUrl}/api/telegram/webhook`
  const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl }),
  })
  const data = await r.json()

  if (!data.ok) return NextResponse.json({ ok: false, description: data.description })

  // Get bot info
  const rb = await fetch(`https://api.telegram.org/bot${token}/getMe`)
  const bot = await rb.json()

  return NextResponse.json({ ok: true, username: bot?.result?.username })
}

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ connected: false })

  const rb = await fetch(`https://api.telegram.org/bot${token}/getMe`)
  const bot = await rb.json()
  const rw = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)
  const wh = await rw.json()

  return NextResponse.json({
    connected: !!bot?.result?.username,
    username: bot?.result?.username,
    webhookUrl: wh?.result?.url,
  })
}
