import { NextRequest, NextResponse } from "next/server"
import { getOperatorSession } from "@/lib/auth"
import fs from "fs"
import path from "path"

// Saves VK settings to .env file on server
export async function POST(req: NextRequest) {
  const op = await getOperatorSession()
  if (!op) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { token, groupId, secret, confirmCode } = await req.json()

  const envPath = path.join(process.cwd(), ".env")
  let content = ""
  try { content = fs.readFileSync(envPath, "utf8") } catch {}

  function setEnvVar(src: string, key: string, value: string) {
    const re = new RegExp(`^${key}=.*$`, "m")
    const line = `${key}="${value}"`
    return re.test(src) ? src.replace(re, line) : src + `\n${line}`
  }

  if (token)       content = setEnvVar(content, "VK_GROUP_TOKEN", token)
  if (groupId)     content = setEnvVar(content, "VK_GROUP_ID", groupId)
  if (secret)      content = setEnvVar(content, "VK_SECRET", secret)
  if (confirmCode) content = setEnvVar(content, "VK_CONFIRMATION_CODE", confirmCode)

  fs.writeFileSync(envPath, content)

  return NextResponse.json({ ok: true })
}
