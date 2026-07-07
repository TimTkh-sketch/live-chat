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

  const { clientId, clientSecret, userId } = await req.json()

  const envPath = path.join(process.cwd(), ".env")
  let content = ""
  try { content = fs.readFileSync(envPath, "utf8") } catch {}

  if (clientId)     content = setEnvVar(content, "AVITO_CLIENT_ID", clientId)
  if (clientSecret) content = setEnvVar(content, "AVITO_CLIENT_SECRET", clientSecret)
  if (userId)       content = setEnvVar(content, "AVITO_USER_ID", userId)

  fs.writeFileSync(envPath, content)

  // Register webhook with Avito
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
    const tokenData = await r.json()
    const token = tokenData.access_token as string

    if (token) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://live-chat.shop"
      await fetch("https://api.avito.ru/messenger/v3/webhook", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: `${appUrl}/api/avito/webhook` }),
      })
      return NextResponse.json({ ok: true })
    }
  } catch {}

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const clientId = process.env.AVITO_CLIENT_ID
  const clientSecret = process.env.AVITO_CLIENT_SECRET
  if (!clientId || !clientSecret) return NextResponse.json({ connected: false })

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
    const connected = !!data.access_token
    return NextResponse.json({ connected })
  } catch {
    return NextResponse.json({ connected: false })
  }
}
