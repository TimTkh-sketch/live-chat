"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Send, Smile, Paperclip, ChevronDown } from "lucide-react"

interface Message { id: string; sender: string; text: string; createdAt: string }
interface Settings {
  greeting: string; primaryColor: string; quickReplies: string[]
  operatorName: string; operatorAvatar: string | null; offlineText: string
}
interface Operator { id: string; name: string; avatar: string | null; isOnline: boolean }

const SESSION_KEY = "lc_session_id"

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
}

function formatDate(d: string) {
  const date = new Date(d)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return "Сегодня"
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return "Вчера"
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })
}

export function ChatWidgetPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [operators, setOperators] = useState<Operator[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [visitorName, setVisitorName] = useState("")
  const [showNameForm, setShowNameForm] = useState(false)
  const [nameSubmitted, setNameSubmitted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  const token = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("token") ?? (window.parent as Window & { __lc_token?: string }).__lc_token ?? null
    : null

  const primaryColor = settings?.primaryColor ?? "#F26522"
  const anyOnline    = operators.some(o => o.isOnline)
  const onlineOp     = operators.find(o => o.isOnline)

  /* ── Load settings + session ── */
  useEffect(() => {
    if (!token) return
    fetch(`/api/workspace/settings?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.settings) setSettings(data.settings)
        if (data.operators) setOperators(data.operators)
      })
      .catch(() => {})

    const sid = localStorage.getItem(SESSION_KEY + "_" + token)
    if (sid) setSessionId(sid)
  }, [token])

  /* ── Poll messages ── */
  const fetchMessages = useCallback(async (sid: string) => {
    const r = await fetch(`/api/messages?sessionId=${sid}`)
    const data = await r.json()
    if (Array.isArray(data)) setMessages(data)
  }, [])

  useEffect(() => {
    if (!sessionId) return
    fetchMessages(sessionId)
    const t = setInterval(() => fetchMessages(sessionId), 2000)
    return () => clearInterval(t)
  }, [sessionId, fetchMessages])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages.length])

  async function createSession() {
    if (!token) return null
    const page = document.referrer || window.location.href
    const r = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, visitorPage: page }),
    })
    const s = await r.json()
    localStorage.setItem(SESSION_KEY + "_" + token, s.id)
    setSessionId(s.id)
    return s.id as string
  }

  async function updateVisitorName(name: string, sid: string) {
    await fetch(`/api/session/${sid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorName: name }),
    })
  }

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      let sid = sessionId
      if (!sid) sid = await createSession()
      if (!sid) return

      if (!nameSubmitted && !visitorName) {
        setShowNameForm(true)
        setSending(false)
        return
      }

      setMessages(prev => [...prev, { id: "tmp_" + Date.now(), sender: "visitor", text, createdAt: new Date().toISOString() }])
      setInput("")

      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, text, sender: "visitor" }),
      })
      await fetchMessages(sid)
    } finally { setSending(false) }
  }

  async function submitName() {
    if (!visitorName.trim()) return
    let sid = sessionId
    if (!sid) sid = await createSession()
    if (sid && visitorName) await updateVisitorName(visitorName, sid)
    setNameSubmitted(true)
    setShowNameForm(false)
    inputRef.current?.focus()
  }

  /* ── Group messages by date ── */
  const grouped: { date: string; messages: Message[] }[] = []
  const allMessages = settings
    ? [{ id: "__greeting__", sender: "operator", text: settings.greeting, createdAt: new Date().toISOString() }, ...messages]
    : messages

  for (const m of allMessages) {
    const d = formatDate(m.createdAt)
    const last = grouped[grouped.length - 1]
    if (!last || last.date !== d) grouped.push({ date: d, messages: [m] })
    else last.messages.push(m)
  }

  if (!settings) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div style={{ width: 24, height: 24, border: "2px solid #F26522", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      </div>
    )
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#fff", position: "relative" }}>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}CC)`,
        padding: "16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative dots */}
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: 6, height: 6,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            top: `${10 + i * 8}%`,
            right: `${5 + i * 10}%`,
          }} />
        ))}

        {/* Avatar */}
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "rgba(255,255,255,0.2)",
          border: "2px solid rgba(255,255,255,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontWeight: 700, fontSize: 16,
          overflow: "hidden", flexShrink: 0,
        }}>
          {onlineOp?.avatar
            ? <img src={onlineOp.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
            : (settings.operatorName || "П")[0].toUpperCase()}
        </div>

        <div style={{ flex: 1 }}>
          <p style={{ color: "white", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
            {settings.operatorName}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: anyOnline ? "#4ade80" : "#9CA3AF" }} />
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>
              {anyOnline ? "Операторы онлайн!" : "Офлайн"}
            </p>
          </div>
        </div>

        <button
          onClick={() => window.parent.postMessage({ type: "lc:close" }, "*")}
          style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 2, background: "#fafafa" }}>
        {grouped.map(group => (
          <div key={group.date}>
            <div style={{ display: "flex", justifyContent: "center", margin: "12px 0" }}>
              <span style={{ fontSize: 11, color: "#9CA3AF", background: "white", padding: "3px 12px", borderRadius: 99, border: "1px solid #F3F4F6", fontWeight: 500 }}>
                {group.date}
              </span>
            </div>
            {group.messages.map(m => {
              const isVisitor = m.sender === "visitor"
              return (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isVisitor ? "flex-end" : "flex-start", marginBottom: 4 }}>
                  <div style={{
                    maxWidth: "78%",
                    padding: "10px 14px",
                    borderRadius: isVisitor ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: isVisitor ? primaryColor : "#FFFFFF",
                    color: isVisitor ? "white" : "#111",
                    fontSize: 14,
                    lineHeight: 1.55,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  }}>
                    {m.text}
                  </div>
                  <span style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2, padding: "0 2px" }}>
                    {formatTime(m.createdAt)}
                    {isVisitor && " ✓✓"}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {settings.quickReplies.length > 0 && (
        <div style={{ padding: "8px 12px", display: "flex", gap: 8, flexWrap: "wrap", borderTop: "1px solid #F3F4F6", background: "white" }}>
          {settings.quickReplies.map((qr, i) => (
            <button key={i} onClick={() => sendMessage(qr)}
              style={{
                padding: "6px 14px", borderRadius: 99, border: `1.5px solid ${primaryColor}`,
                background: "transparent", color: primaryColor, fontSize: 13, fontWeight: 500,
                cursor: "pointer", transition: "all 0.15s",
              }}>
              {qr}
            </button>
          ))}
        </div>
      )}

      {/* Name form overlay */}
      {showNameForm && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, padding: 16,
        }}>
          <div style={{ background: "white", borderRadius: 16, padding: 24, width: "100%", maxWidth: 300 }}>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>👋 Представьтесь в чате</p>
            <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>Как вас зовут?</p>
            <input
              autoFocus
              value={visitorName}
              onChange={e => setVisitorName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitName()}
              placeholder="Ваше имя"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none", marginBottom: 12 }}
            />
            <button onClick={submitName}
              style={{ width: "100%", padding: "10px", borderRadius: 12, background: primaryColor, color: "white", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>
              Начать чат
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid #F3F4F6", background: "white", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendMessage(input) } }}
            placeholder="Введите сообщение"
            style={{ flex: 1, padding: "10px 14px", borderRadius: 24, border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none", background: "#FAFAFA" }}
          />
          <button onClick={() => sendMessage(input)}
            disabled={!input.trim() || sending}
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: input.trim() ? primaryColor : "#E5E7EB",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s", flexShrink: 0,
            }}>
            <Send size={16} color={input.trim() ? "white" : "#9CA3AF"} />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, paddingLeft: 4 }}>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", display: "flex" }}>
            <Paperclip size={16} />
          </button>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", display: "flex" }}>
            <Smile size={16} />
          </button>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: "#D1D5DB" }}>LiveChat</span>
        </div>
      </div>
    </div>
  )
}
