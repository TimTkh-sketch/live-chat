"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Send, ChevronDown, Paperclip, Smile } from "lucide-react"

interface Message { id: string; sender: string; text: string; attachmentUrl?: string; createdAt: string }
interface Settings {
  greeting: string; primaryColor: string; quickReplies: string[]
  operatorName: string; operatorAvatar: string | null; offlineText: string
  privacyPolicyUrl: string
}
interface Operator { id: string; name: string; avatar: string | null; isOnline: boolean }

const SESSION_KEY = "lc_session_id"
function parseQR(raw: string): { name: string; text: string } {
  try { const p = JSON.parse(raw); if (p?.name !== undefined) return p } catch {}
  return { name: raw, text: raw }
}

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
  const [visitorPhone, setVisitorPhone] = useState("")
  const [showNameForm, setShowNameForm] = useState(false)
  const [nameSubmitted, setNameSubmitted] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)

  const token = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("token") ?? (window.parent as Window & { __lc_token?: string }).__lc_token ?? null
    : null

  const CONSENT_KEY = token ? `lc_consent_${token}` : null
  const NAME_KEY    = token ? `lc_name_${token}` : null

  const primaryColor = settings?.primaryColor ?? "#F26522"
  const anyOnline    = operators.some(o => o.isOnline)
  const onlineOp     = operators.find(o => o.isOnline)

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

    if (CONSENT_KEY && localStorage.getItem(CONSENT_KEY) === "1") setConsentGiven(true)
    if (NAME_KEY) {
      const savedName = localStorage.getItem(NAME_KEY)
      if (savedName) {
        setVisitorName(savedName)
        setNameSubmitted(true)
        setConsentGiven(true)
      }
    }
  }, [token])

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  // Keep input visible when keyboard opens on mobile
  useEffect(() => {
    const handler = () => {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    }
    inputRef.current?.addEventListener("focus", handler)
    return () => inputRef.current?.removeEventListener("focus", handler)
  }, [])

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

  async function updateVisitorInfo(name: string, phone: string, sid: string) {
    await fetch(`/api/session/${sid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorName: name, visitorPhone: phone || undefined }),
    })
  }

  async function ensureSession() {
    let sid = sessionId
    if (!sid) sid = await createSession()
    return sid
  }

  async function sendMessage(text: string, attachmentUrl?: string) {
    if ((!text.trim() && !attachmentUrl) || sending) return
    setSending(true)
    try {
      const sid = await ensureSession()
      if (!sid) return

      const hasConsent = consentGiven || (CONSENT_KEY ? localStorage.getItem(CONSENT_KEY) === "1" : false)
      const hasName    = nameSubmitted || !!visitorName.trim() || (NAME_KEY ? !!localStorage.getItem(NAME_KEY) : false)
      if (!hasConsent || !hasName) {
        setShowNameForm(true)
        setSending(false)
        return
      }

      setMessages(prev => [...prev, { id: "tmp_" + Date.now(), sender: "visitor", text, attachmentUrl, createdAt: new Date().toISOString() }])
      setInput("")

      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, text, sender: "visitor", attachmentUrl }),
      })
      await fetchMessages(sid)
    } finally { setSending(false) }
  }

  async function handleFileUpload(file: File) {
    setUploadingFile(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const r = await fetch("/api/upload", { method: "POST", body: form })
      const data = await r.json()
      if (data.url) await sendMessage("", data.url)
    } finally { setUploadingFile(false) }
  }

  async function submitName() {
    if (!visitorName.trim() || !consentChecked) return
    if (CONSENT_KEY) localStorage.setItem(CONSENT_KEY, "1")
    if (NAME_KEY) localStorage.setItem(NAME_KEY, visitorName.trim())
    setConsentGiven(true)
    let sid = sessionId
    if (!sid) sid = await createSession()
    if (sid && visitorName) await updateVisitorInfo(visitorName, visitorPhone, sid)
    setNameSubmitted(true)
    setShowNameForm(false)
    inputRef.current?.focus()
  }

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
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <div style={{ width: 24, height: 24, border: "2px solid #F26522", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      </div>
    )
  }

  return (
    <>
      <style>{`
        html, body { height: 100%; margin: 0; padding: 0; overflow: hidden; }
        @supports (height: 100dvh) { .lc-root { height: 100dvh !important; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .lc-msg { animation: fadeUp 0.18s ease; }
        .lc-qr:active { opacity: 0.7; transform: scale(0.97); }
        .lc-send:active { transform: scale(0.92); }
        ::-webkit-scrollbar { width: 0; }
      `}</style>

      <div className="lc-root" style={{
        position: "fixed",
        inset: 0,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#F8F9FB",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}>

        {/* ── Header ── */}
        <div style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}DD 100%)`,
          padding: "14px 16px",
          paddingTop: "calc(14px + env(safe-area-inset-top, 0px))",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
          boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
          position: "relative",
          zIndex: 1,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            border: "2px solid rgba(255,255,255,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 700, fontSize: 17,
            overflow: "hidden", flexShrink: 0,
          }}>
            {onlineOp?.avatar
              ? <img src={onlineOp.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
              : (settings.operatorName || "П")[0].toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "white", fontWeight: 700, fontSize: 15, lineHeight: 1.2, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {settings.operatorName}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: anyOnline ? "#4ade80" : "rgba(255,255,255,0.4)", flexShrink: 0 }} />
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, margin: 0 }}>
                {anyOnline ? "Онлайн" : "Офлайн"}
              </p>
            </div>
          </div>

          <button
            onClick={() => window.parent.postMessage({ type: "lc:close" }, "*")}
            style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", flexShrink: 0,
              WebkitTapHighlightColor: "transparent",
            }}>
            <ChevronDown size={18} />
          </button>
        </div>

        {/* ── Messages ── */}
        <div ref={messagesRef} style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 2, overscrollBehavior: "contain" }}>
          {grouped.map(group => (
            <div key={group.date}>
              <div style={{ display: "flex", justifyContent: "center", margin: "10px 0" }}>
                <span style={{ fontSize: 11, color: "#9CA3AF", background: "white", padding: "3px 12px", borderRadius: 99, border: "1px solid #EBEBEB", fontWeight: 500 }}>
                  {group.date}
                </span>
              </div>
              {group.messages.map(m => {
                const isVisitor = m.sender === "visitor"
                return (
                  <div key={m.id} className="lc-msg" style={{ display: "flex", flexDirection: "column", alignItems: isVisitor ? "flex-end" : "flex-start", marginBottom: 3 }}>
                    <div style={{
                      maxWidth: "82%",
                      padding: m.attachmentUrl && !m.text ? "4px" : "10px 14px",
                      borderRadius: isVisitor ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: isVisitor ? primaryColor : "#FFFFFF",
                      color: isVisitor ? "white" : "#111",
                      fontSize: 14,
                      lineHeight: 1.55,
                      boxShadow: isVisitor ? `0 2px 8px ${primaryColor}40` : "0 1px 4px rgba(0,0,0,0.08)",
                      wordBreak: "break-word",
                      overflow: "hidden",
                    }}>
                      {m.attachmentUrl && (
                        <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer">
                          <img src={m.attachmentUrl} alt="attachment"
                            style={{ display: "block", maxWidth: "100%", maxHeight: 200, borderRadius: 12, objectFit: "cover" }} />
                        </a>
                      )}
                      {m.text && <span>{m.text}</span>}
                    </div>
                    <span style={{ fontSize: 10, color: "#B0B7C3", marginTop: 3, padding: "0 3px" }}>
                      {formatTime(m.createdAt)}{isVisitor && " ✓✓"}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
          <div ref={bottomRef} style={{ height: 4 }} />
        </div>

        {/* ── Quick replies ── */}
        {settings.quickReplies.length > 0 && (
          <div style={{
            padding: "8px 12px",
            display: "flex",
            gap: 7,
            overflowX: "auto",
            flexWrap: "nowrap",
            borderTop: "1px solid #EBEBEB",
            background: "white",
            flexShrink: 0,
            WebkitOverflowScrolling: "touch",
          }}>
            {settings.quickReplies.map((raw, i) => { const qr = parseQR(raw); return (
              <button key={i} className="lc-qr" onClick={() => sendMessage(qr.text)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 99,
                  border: `1.5px solid ${primaryColor}`,
                  background: "transparent",
                  color: primaryColor,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  WebkitTapHighlightColor: "transparent",
                  transition: "transform 0.1s",
                }}>
                {qr.name}
              </button>
            )})}
          </div>
        )}

        {/* ── Input area ── */}
        <div style={{
          background: "white",
          borderTop: "1px solid #EBEBEB",
          flexShrink: 0,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}>
          <div style={{ padding: "10px 12px 8px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", background: "#F3F4F6", borderRadius: 24, padding: "0 14px", minHeight: 44 }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendMessage(input) } }}
                placeholder="Написать сообщение..."
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 15,
                  color: "#111",
                  padding: "10px 0",
                  minWidth: 0,
                }}
              />
            </div>
            <button
              className="lc-send"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || sending}
              style={{
                width: 44, height: 44,
                borderRadius: "50%",
                background: input.trim() ? primaryColor : "#E5E7EB",
                border: "none",
                cursor: input.trim() ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.2s, transform 0.1s",
                WebkitTapHighlightColor: "transparent",
                boxShadow: input.trim() ? `0 3px 10px ${primaryColor}50` : "none",
              }}>
              <Send size={17} color={input.trim() ? "white" : "#9CA3AF"} style={{ marginLeft: 1 }} />
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, paddingLeft: 18, paddingRight: 12, paddingBottom: 8, position: "relative" }}>
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = "" }} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              style={{ background: "none", border: "none", cursor: "pointer", color: uploadingFile ? "#E5E7EB" : "#9CA3AF", display: "flex", padding: 4, WebkitTapHighlightColor: "transparent" }}>
              <Paperclip size={17} />
            </button>
            <button
              onClick={() => setShowEmojiPicker(p => !p)}
              style={{ background: "none", border: "none", cursor: "pointer", color: showEmojiPicker ? primaryColor : "#9CA3AF", display: "flex", padding: 4, WebkitTapHighlightColor: "transparent" }}>
              <Smile size={17} />
            </button>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: "#D9DCE3", letterSpacing: "0.03em" }}>LiveChat</span>

            {showEmojiPicker && (
              <div style={{
                position: "absolute", bottom: "calc(100% + 8px)", left: 8,
                background: "white", borderRadius: 16,
                boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                padding: "10px 8px", zIndex: 50,
                display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 2,
                width: 264,
              }}>
                {["😀","😂","😍","🥰","😎","🤔","😅","👍","❤️","🔥","✨","🎉","👋","🙏","💪","😊","😭","🥹","🤣","😘","🙈","💀","👀","💯","⚡","🌟","💬","✅","❌","🎁","🎯","🚀"].map(emoji => (
                  <button key={emoji}
                    onClick={() => { setInput(p => p + emoji); setShowEmojiPicker(false); inputRef.current?.focus() }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "4px 2px", borderRadius: 8, WebkitTapHighlightColor: "transparent" }}>
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Name form overlay ── */}
      {showNameForm && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "flex-end",
          zIndex: 100,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}>
          <div style={{
            background: "white",
            borderRadius: "20px 20px 0 0",
            padding: "28px 24px",
            width: "100%",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
          }}>
            <div style={{ width: 40, height: 4, background: "#E5E7EB", borderRadius: 99, margin: "0 auto 20px" }} />
            <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 6, color: "#111" }}>Представьтесь</p>
            <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 20 }}>Как вас зовут? Оператор обратится к вам по имени.</p>
            <input
              autoFocus
              value={visitorName}
              onChange={e => setVisitorName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitName()}
              placeholder="Ваше имя"
              style={{
                width: "100%", padding: "14px 16px",
                borderRadius: 14, border: "1.5px solid #E5E7EB",
                fontSize: 16, outline: "none",
                marginBottom: 10,
                boxSizing: "border-box",
                color: "#111",
              }}
            />
            <input
              value={visitorPhone}
              onChange={e => setVisitorPhone(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitName()}
              placeholder="Телефон (необязательно)"
              type="tel"
              style={{
                width: "100%", padding: "14px 16px",
                borderRadius: 14, border: "1.5px solid #E5E7EB",
                fontSize: 16, outline: "none",
                marginBottom: 16,
                boxSizing: "border-box",
                color: "#111",
              }}
            />

            {/* ── Privacy consent ── */}
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16, cursor: "pointer" }}>
              <div
                onClick={() => setConsentChecked(p => !p)}
                style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                  border: `2px solid ${consentChecked ? primaryColor : "#D1D5DB"}`,
                  background: consentChecked ? primaryColor : "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}>
                {consentChecked && (
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
                Я соглашаюсь на обработку персональных данных в соответствии с{" "}
                {settings?.privacyPolicyUrl ? (
                  <a href={settings.privacyPolicyUrl} target="_blank" rel="noopener noreferrer"
                    style={{ color: primaryColor, textDecoration: "underline" }}
                    onClick={e => e.stopPropagation()}>
                    политикой конфиденциальности
                  </a>
                ) : "политикой конфиденциальности"}
              </span>
            </label>

            <button onClick={submitName}
              disabled={!consentChecked || !visitorName.trim()}
              style={{
                width: "100%", padding: "15px",
                borderRadius: 14,
                background: consentChecked && visitorName.trim() ? primaryColor : "#E5E7EB",
                color: consentChecked && visitorName.trim() ? "white" : "#9CA3AF",
                fontWeight: 700, fontSize: 16,
                border: "none", cursor: consentChecked && visitorName.trim() ? "pointer" : "default",
                WebkitTapHighlightColor: "transparent",
                transition: "background 0.2s",
              }}>
              Начать чат
            </button>
          </div>
        </div>
      )}
    </>
  )
}
