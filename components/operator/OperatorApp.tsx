"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  MessageCircle, Send, LogOut, Search, Clock, CheckCheck,
  Check, Zap, XCircle, RotateCcw, ArrowLeft,
  Globe, User, Hash, ChevronRight, Bell, BellOff,
  Inbox, Activity, Archive, PauseCircle, Settings2,
} from "lucide-react"
import { formatTime, formatDate } from "@/lib/utils"

interface Operator  { id: string; name: string; avatar: string | null; isOnline: boolean }
interface Message   { id: string; sessionId: string; sender: string; text: string; createdAt: string; isRead: boolean }
interface Session   {
  id: string; visitorName: string | null; visitorPage: string | null; status: string
  operatorId: string | null; postponedUntil: string | null; createdAt: string; updatedAt: string
  messages: Message[]; operator: { id: string; name: string } | null; unreadCount?: number
}
interface ChatSettings { quickReplies: string[]; greeting: string; primaryColor: string; operatorName: string }

const TABS = [
  { key: "waiting",   label: "Входящие",   icon: Inbox },
  { key: "active",    label: "Активные",   icon: Activity },
  { key: "postponed", label: "Отложенные", icon: PauseCircle },
  { key: "closed",    label: "Архив",      icon: Archive },
]

const STATUS_DOT: Record<string, string> = {
  waiting:   "bg-amber-400",
  active:    "bg-emerald-400",
  postponed: "bg-blue-400",
  closed:    "bg-gray-300",
}

const STATUS_LABEL: Record<string, string> = {
  waiting: "Ожидает", active: "Активный", postponed: "Отложен", closed: "Закрыт",
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active:    { bg: "#dcfce7", color: "#16a34a" },
  waiting:   { bg: "#fef3c7", color: "#b45309" },
  postponed: { bg: "#dbeafe", color: "#1d4ed8" },
  closed:    { bg: "#F3F4F6", color: "#6B7280" },
}

const STATUS_DARK: Record<string, { bg: string; color: string; dot: string; glow: string }> = {
  waiting:   { bg: "rgba(251,191,36,0.12)",  color: "#FCD34D", dot: "#F59E0B", glow: "rgba(245,158,11,0.5)" },
  active:    { bg: "rgba(16,185,129,0.12)",  color: "#6EE7B7", dot: "#10B981", glow: "rgba(16,185,129,0.5)" },
  postponed: { bg: "rgba(99,102,241,0.12)",  color: "#A5B4FC", dot: "#6366F1", glow: "rgba(99,102,241,0.5)" },
  closed:    { bg: "rgba(156,163,175,0.1)",  color: "#9CA3AF", dot: "#6B7280", glow: "rgba(107,114,128,0.3)" },
}

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #F26522 0%, #FF8C42 100%)",
  "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
  "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)",
  "linear-gradient(135deg, #EF4444 0%, #FC8181 100%)",
  "linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)",
  "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)",
  "linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)",
]

function avatarGradient(name: string) {
  return AVATAR_GRADIENTS[(name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length]
}

export function OperatorApp({
  currentOperator,
  initialSessions,
  operators,
  settings,
}: {
  currentOperator: { id: string; name: string; avatar: string | null; workspaceId: string }
  initialSessions: Session[]
  operators: Operator[]
  settings: ChatSettings | null
}) {
  const [filter,     setFilter]     = useState("waiting")
  const [sessions,   setSessions]   = useState<Session[]>(initialSessions)
  const [activeId,   setActiveId]   = useState<string | null>(null)
  const [messages,   setMessages]   = useState<Message[]>([])
  const [input,      setInput]      = useState("")
  const [sending,    setSending]    = useState(false)
  const [search,     setSearch]     = useState("")
  const [notif,      setNotif]      = useState(false)
  const [showInfo,   setShowInfo]   = useState(true)
  const [isMobile,   setIsMobile]   = useState(false)
  const [mobileView, setMobileView] = useState<"list" | "chat">("list")
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  const active       = sessions.find(s => s.id === activeId) ?? null
  const isMine       = active?.operatorId === currentOperator.id
  const takenByOther = !!(active?.operatorId && active.operatorId !== currentOperator.id)
  const takenByOp    = operators.find(o => o.id === active?.operatorId)
  const canWrite     = active?.status !== "closed" && active?.status !== "postponed" && !takenByOther

  const color        = settings?.primaryColor ?? "#F26522"
  const quickReplies = settings?.quickReplies ?? []
  const totalUnread  = sessions.reduce((a, s) => a + (s.unreadCount ?? 0), 0)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    const t = setInterval(() => fetch("/api/operators/heartbeat", { method: "POST" }), 30000)
    fetch("/api/operators/heartbeat", { method: "POST" })
    return () => clearInterval(t)
  }, [])

  const fetchSessions = useCallback(async () => {
    const r = await fetch(`/api/session?workspaceId=${currentOperator.workspaceId}&status=${filter}`)
    const d = await r.json()
    if (Array.isArray(d)) setSessions(d)
  }, [currentOperator.workspaceId, filter])

  useEffect(() => {
    fetchSessions()
    const t = setInterval(fetchSessions, 3000)
    return () => clearInterval(t)
  }, [fetchSessions])

  const fetchMessages = useCallback(async (sid: string) => {
    const r = await fetch(`/api/messages?sessionId=${sid}`)
    const d = await r.json()
    if (Array.isArray(d)) setMessages(d)
  }, [])

  useEffect(() => {
    if (!activeId) return
    fetchMessages(activeId)
    const t = setInterval(() => fetchMessages(activeId), 2000)
    return () => clearInterval(t)
  }, [activeId, fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      setNotif(true)
      registerPush()
    }
  }, [])

  async function registerPush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
    try {
      const reg = await navigator.serviceWorker.register("/sw.js")
      const keyRes = await fetch("/api/push")
      const { publicKey } = await keyRes.json()
      if (!publicKey) return
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
      await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub }),
      })
    } catch {}
  }

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
    const raw = window.atob(base64)
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
  }

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/session/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    fetchSessions()
  }

  const accept   = () => activeId && patch(activeId, { status: "active",    operatorId: currentOperator.id })
  const postpone = () => activeId && patch(activeId, { status: "postponed", postponedUntil: new Date(Date.now() + 5 * 60000).toISOString(), operatorId: null }).then(() => { setActiveId(null); setMessages([]); if (isMobile) setMobileView("list") })
  const close    = () => activeId && patch(activeId, { status: "closed" }).then(() => { setActiveId(null); setMessages([]); if (isMobile) setMobileView("list") })
  const reopen   = () => activeId && patch(activeId, { status: "waiting", operatorId: null }).then(fetchSessions)

  async function send(text: string) {
    if (!activeId || !text.trim() || sending) return
    setSending(true)
    try {
      await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: activeId, text, sender: "operator" }) })
      setInput("")
      await fetchMessages(activeId)
    } finally { setSending(false) }
  }

  async function handleNotif() {
    const p = await Notification.requestPermission()
    if (p === "granted") { setNotif(true); registerPush() } else { setNotif(false) }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  function openSession(id: string) {
    setActiveId(id)
    fetchMessages(id)
    if (isMobile) setMobileView("chat")
  }

  const grouped: { date: string; msgs: Message[] }[] = []
  for (const m of messages) {
    const d = formatDate(m.createdAt)
    const last = grouped[grouped.length - 1]
    if (!last || last.date !== d) grouped.push({ date: d, msgs: [m] })
    else last.msgs.push(m)
  }

  const filtered = sessions.filter(s =>
    !search || (s.visitorName ?? "Посетитель").toLowerCase().includes(search.toLowerCase())
  )

  /* ══════════════════════════════════════
      MOBILE LAYOUT
  ══════════════════════════════════════ */
  if (isMobile) {
    const darkBg    = "#0C0C18"
    const cardBg    = "rgba(255,255,255,0.05)"
    const cardBorder = "rgba(255,255,255,0.08)"
    const headerBg  = "linear-gradient(180deg, #1a1035 0%, #0d0d1f 100%)"

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100svh", background: darkBg, overflow: "hidden" }}>

        {/* ═══════════════ LIST VIEW ═══════════════ */}
        {mobileView === "list" && (
          <>
            {/* Header */}
            <div style={{ background: headerBg, padding: "14px 20px 16px", flexShrink: 0, borderBottom: `1px solid ${cardBorder}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Logo */}
                <div style={{
                  width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                  background: "linear-gradient(135deg, #F26522, #FF8C42)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 16px rgba(242,101,34,0.4)",
                }}>
                  <MessageCircle size={18} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: "white", fontWeight: 800, fontSize: 17, lineHeight: 1 }}>LiveChat</p>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 }}>{currentOperator.name}</p>
                </div>
                {/* Unread badge */}
                {totalUnread > 0 && (
                  <span style={{ background: "linear-gradient(135deg,#ef4444,#f87171)", color: "white", fontSize: 11, fontWeight: 900, padding: "3px 9px", borderRadius: 99, boxShadow: "0 2px 8px rgba(239,68,68,0.5)" }}>
                    {totalUnread}
                  </span>
                )}
                {/* Icons */}
                <button onClick={handleNotif}
                  style={{ background: notif ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.06)", border: `1px solid ${notif ? "rgba(74,222,128,0.3)" : cardBorder}`, borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: notif ? "#4ade80" : "rgba(255,255,255,0.4)" }}>
                  {notif ? <Bell size={16} /> : <BellOff size={16} />}
                </button>
                <a href="/settings" style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
                  <Settings2 size={16} />
                </a>
                <button onClick={logout}
                  style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}>
                  <LogOut size={16} />
                </button>
              </div>

              {/* Search */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.06)", border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "10px 14px", marginTop: 14 }}>
                <Search size={14} color="rgba(255,255,255,0.3)" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Поиск по имени..."
                  style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 14, color: "white" }} />
              </div>
            </div>

            {/* Session list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 8px" }}>
              {filtered.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 240, gap: 12 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 20, background: cardBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Inbox size={28} color="rgba(255,255,255,0.2)" />
                  </div>
                  <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 14 }}>Нет диалогов</p>
                </div>
              ) : filtered.map(s => {
                const isSelected = s.id === activeId
                const lastMsg    = s.messages?.[0]
                const isTakenMe  = s.operatorId === currentOperator.id
                const statusD    = STATUS_DARK[s.status] ?? STATUS_DARK.closed
                const grad       = avatarGradient(s.visitorName ?? "П")
                return (
                  <button key={s.id} onClick={() => openSession(s.id)}
                    style={{
                      width: "100%", textAlign: "left", border: `1px solid ${isSelected ? "rgba(242,101,34,0.4)" : cardBorder}`,
                      borderRadius: 16, cursor: "pointer", padding: "14px 14px",
                      background: isSelected ? "rgba(242,101,34,0.1)" : cardBg,
                      marginBottom: 8, display: "flex", gap: 12, alignItems: "flex-start",
                      transition: "all 0.15s",
                    }}>
                    {/* Gradient avatar */}
                    <div style={{ width: 46, height: 46, borderRadius: "50%", flexShrink: 0, background: grad, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 17, color: "white", position: "relative", boxShadow: `0 4px 12px ${grad.includes("F26522") ? "rgba(242,101,34,0.35)" : "rgba(0,0,0,0.3)"}` }}>
                      {(s.visitorName ?? "П")[0].toUpperCase()}
                      {/* Status dot */}
                      <span style={{ position: "absolute", bottom: 1, right: 1, width: 12, height: 12, borderRadius: "50%", background: statusD.dot, border: `2px solid ${darkBg}`, boxShadow: `0 0 6px ${statusD.glow}` }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, marginBottom: 4 }}>
                        <p style={{ fontWeight: 700, fontSize: 14, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.visitorName ?? "Посетитель"}
                        </p>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{formatTime(s.updatedAt)}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: statusD.bg, color: statusD.color, flexShrink: 0 }}>
                          {STATUS_LABEL[s.status]}
                        </span>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {lastMsg ? lastMsg.text : "Нет сообщений"}
                        </p>
                      </div>
                      {isTakenMe && (
                        <p style={{ fontSize: 10, color: "#F26522", marginTop: 3, fontWeight: 600 }}>● Ваш диалог</p>
                      )}
                    </div>

                    {(s.unreadCount ?? 0) > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                        <span style={{ minWidth: 22, height: 22, borderRadius: 99, background: "linear-gradient(135deg,#F26522,#FF8C42)", color: "white", fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px", boxShadow: "0 2px 8px rgba(242,101,34,0.5)" }}>
                          {(s.unreadCount ?? 0) > 9 ? "9+" : s.unreadCount}
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
              <div style={{ height: 8 }} />
            </div>

            {/* Bottom tab bar */}
            <div style={{ background: "rgba(12,12,24,0.97)", backdropFilter: "blur(20px)", borderTop: `1px solid ${cardBorder}`, display: "flex", flexShrink: 0, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
              {TABS.map(tab => {
                const Icon = tab.icon
                const cnt = tab.key === "waiting" ? totalUnread : 0
                const isActive = filter === tab.key
                return (
                  <button key={tab.key}
                    onClick={() => { setFilter(tab.key); setActiveId(null); setMessages([]) }}
                    style={{ flex: 1, padding: "12px 0 10px", border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: isActive ? "#F26522" : "rgba(255,255,255,0.3)", position: "relative" }}>
                    <Icon size={22} />
                    <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400 }}>{tab.label}</span>
                    {isActive && <span style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 20, height: 2, borderRadius: 99, background: "#F26522" }} />}
                    {cnt > 0 && (
                      <span style={{ position: "absolute", top: 8, right: "18%", minWidth: 16, height: 16, borderRadius: 99, background: "#ef4444", color: "white", fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                        {cnt > 9 ? "9+" : cnt}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* ═══════════════ CHAT VIEW ═══════════════ */}
        {mobileView === "chat" && activeId && (
          <>
            {/* Chat header */}
            <div style={{ background: headerBg, padding: "14px 16px 16px", borderBottom: `1px solid ${cardBorder}`, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => setMobileView("list")}
                  style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${cardBorder}`, borderRadius: 10, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white", flexShrink: 0 }}>
                  <ArrowLeft size={18} />
                </button>

                <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: avatarGradient(active?.visitorName ?? "П"), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                  {(active?.visitorName ?? "П")[0].toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 15, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {active?.visitorName ?? "Посетитель"}
                  </p>
                  {active?.visitorPage && (
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {active.visitorPage}
                    </p>
                  )}
                </div>

                {/* Status */}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 99, flexShrink: 0,
                  background: STATUS_DARK[active?.status ?? "waiting"]?.bg,
                  color: STATUS_DARK[active?.status ?? "waiting"]?.color,
                }}>
                  {STATUS_LABEL[active?.status ?? "waiting"]}
                </span>
              </div>

              {/* Action buttons row */}
              {((active?.status === "waiting" || (active?.status === "active" && !active.operatorId)) && !takenByOther) || (isMine && active?.status !== "closed") || active?.status === "closed" ? (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  {(active?.status === "waiting" || (active?.status === "active" && !active.operatorId)) && !takenByOther && (
                    <button onClick={accept}
                      style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#10B981,#34D399)", color: "white", fontWeight: 700, fontSize: 13, boxShadow: "0 4px 12px rgba(16,185,129,0.35)" }}>
                      ✓ Принять диалог
                    </button>
                  )}
                  {isMine && active?.status === "active" && (
                    <>
                      <button onClick={postpone}
                        style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid rgba(99,102,241,0.4)", cursor: "pointer", background: "rgba(99,102,241,0.1)", color: "#A5B4FC", fontWeight: 600, fontSize: 13 }}>
                        <Clock size={12} style={{ display: "inline", marginRight: 5 }} />5 мин
                      </button>
                      <button onClick={close}
                        style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid rgba(239,68,68,0.4)", cursor: "pointer", background: "rgba(239,68,68,0.1)", color: "#FCA5A5", fontWeight: 600, fontSize: 13 }}>
                        <XCircle size={12} style={{ display: "inline", marginRight: 5 }} />Закрыть
                      </button>
                    </>
                  )}
                  {active?.status === "closed" && (
                    <button onClick={reopen}
                      style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid rgba(16,185,129,0.4)", cursor: "pointer", background: "rgba(16,185,129,0.1)", color: "#6EE7B7", fontWeight: 600, fontSize: 13 }}>
                      <RotateCcw size={12} style={{ display: "inline", marginRight: 5 }} />Открыть снова
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px", display: "flex", flexDirection: "column", gap: 2, background: darkBg }}>
              {grouped.map(group => (
                <div key={group.date}>
                  <div style={{ display: "flex", justifyContent: "center", margin: "14px 0 10px" }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", padding: "4px 14px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.08)" }}>
                      {group.date}
                    </span>
                  </div>
                  {group.msgs.map((m, i) => {
                    const isOp   = m.sender === "operator"
                    const prev   = group.msgs[i - 1]
                    const showAv = !isOp && (!prev || prev.sender !== m.sender)
                    return (
                      <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isOp ? "flex-end" : "flex-start", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexDirection: isOp ? "row-reverse" : "row" }}>
                          {!isOp && (
                            <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: avatarGradient(active?.visitorName ?? "П"), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, color: "white", opacity: showAv ? 1 : 0 }}>
                              {(active?.visitorName ?? "П")[0].toUpperCase()}
                            </div>
                          )}
                          <div style={{
                            maxWidth: "78%", padding: "10px 14px",
                            borderRadius: isOp ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                            background: isOp
                              ? "linear-gradient(135deg, #F26522 0%, #FF8C42 100%)"
                              : "rgba(255,255,255,0.07)",
                            border: isOp ? "none" : "1px solid rgba(255,255,255,0.1)",
                            color: "white",
                            fontSize: 14, lineHeight: 1.55,
                            boxShadow: isOp ? "0 4px 16px rgba(242,101,34,0.25)" : "none",
                          }}>
                            {m.text}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, paddingLeft: isOp ? 0 : 36, justifyContent: isOp ? "flex-end" : "flex-start" }}>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{formatTime(m.createdAt)}</span>
                          {isOp && (m.isRead
                            ? <CheckCheck size={12} color="#60A5FA" />
                            : <Check size={12} color="rgba(255,255,255,0.3)" />)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              {messages.length === 0 && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 40 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, background: cardBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <MessageCircle size={24} color="rgba(255,255,255,0.2)" />
                  </div>
                  <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Нет сообщений</p>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick replies */}
            {quickReplies.length > 0 && canWrite && (
              <div style={{ padding: "8px 12px", display: "flex", gap: 6, overflowX: "auto", background: "rgba(255,255,255,0.03)", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
                {quickReplies.map((qr, i) => (
                  <button key={i} onClick={() => send(qr)}
                    style={{ padding: "6px 14px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {qr}
                  </button>
                ))}
              </div>
            )}

            {/* Input / status banners */}
            {active?.status === "closed" ? (
              <div style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Чат закрыт</p>
                <button onClick={reopen} style={{ padding: "8px 16px", borderRadius: 10, background: "rgba(16,185,129,0.15)", color: "#6EE7B7", fontWeight: 600, fontSize: 13, border: "1px solid rgba(16,185,129,0.3)", cursor: "pointer" }}>
                  Открыть снова
                </button>
              </div>
            ) : active?.status === "postponed" ? (
              <div style={{ padding: "14px 16px", background: "rgba(99,102,241,0.08)", borderTop: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={15} color="#A5B4FC" />
                <p style={{ fontSize: 13, color: "#A5B4FC" }}>Диалог отложен на 5 минут</p>
              </div>
            ) : canWrite ? (
              <div style={{ padding: "10px 14px", background: "rgba(12,12,24,0.97)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.06)", borderRadius: 18, padding: "6px 6px 6px 16px", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input) } }}
                    placeholder={active?.status === "waiting" && !isMine ? "Сначала примите диалог..." : "Напишите ответ..."}
                    disabled={active?.status === "waiting" && !isMine}
                    style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 15, color: "white" }}
                  />
                  <button onClick={() => send(input)} disabled={!input.trim() || sending}
                    style={{
                      width: 42, height: 42, borderRadius: 14, border: "none", cursor: "pointer", flexShrink: 0,
                      background: input.trim() ? "linear-gradient(135deg,#F26522,#FF8C42)" : "rgba(255,255,255,0.08)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: input.trim() ? "0 4px 12px rgba(242,101,34,0.35)" : "none",
                      transition: "all 0.15s",
                    }}>
                    {sending
                      ? <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      : <Send size={16} color={input.trim() ? "white" : "rgba(255,255,255,0.3)"} />}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  /* ══════════════════════════════════════
      DESKTOP LAYOUT (unchanged)
  ══════════════════════════════════════ */
  const renderMessages = () => (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 2, background: "#F8F9FA" }}>
      {grouped.map(group => (
        <div key={group.date}>
          <div style={{ display: "flex", justifyContent: "center", margin: "16px 0 12px" }}>
            <span style={{ fontSize: 11, color: "#9CA3AF", background: "white", padding: "4px 14px", borderRadius: 99, border: "1px solid #E5E7EB", fontWeight: 500, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
              {group.date}
            </span>
          </div>
          {group.msgs.map((m, i) => {
            const isOp  = m.sender === "operator"
            const prev  = group.msgs[i - 1]
            const showAv = !isOp && (!prev || prev.sender !== m.sender)
            return (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isOp ? "flex-end" : "flex-start", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexDirection: isOp ? "row-reverse" : "row" }}>
                  {!isOp && (
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#FFF5EF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, color, flexShrink: 0, opacity: showAv ? 1 : 0 }}>
                      {(active?.visitorName ?? "П")[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{ maxWidth: "64%", padding: "10px 14px", borderRadius: isOp ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: isOp ? color : "white", color: isOp ? "white" : "#111", fontSize: 14, lineHeight: 1.55, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                    {m.text}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, paddingLeft: isOp ? 0 : 36, justifyContent: isOp ? "flex-end" : "flex-start" }}>
                  <span style={{ fontSize: 10, color: "#9CA3AF" }}>{formatTime(m.createdAt)}</span>
                  {isOp && (m.isRead ? <CheckCheck size={12} color="#60A5FA" /> : <Check size={12} color="#9CA3AF" />)}
                </div>
              </div>
            )
          })}
        </div>
      ))}
      {messages.length === 0 && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#D1D5DB", fontSize: 13 }}>Нет сообщений</div>
      )}
      <div ref={bottomRef} />
    </div>
  )

  const renderInput = () => {
    if (active?.status === "closed") return (
      <div style={{ padding: "14px 16px", background: "white", borderTop: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <p style={{ fontSize: 13, color: "#9CA3AF" }}>Чат закрыт</p>
        <button onClick={reopen} style={{ padding: "7px 14px", borderRadius: 10, background: "#f0fdf4", color: "#16a34a", fontWeight: 600, fontSize: 12, border: "1px solid #BBF7D0", cursor: "pointer" }}>Открыть снова</button>
      </div>
    )
    if (active?.status === "postponed") return (
      <div style={{ padding: "14px 16px", background: "#EFF6FF", borderTop: "1px solid #BFDBFE", display: "flex", alignItems: "center", gap: 8 }}>
        <Clock size={15} color="#3B82F6" />
        <p style={{ fontSize: 13, color: "#1D4ED8" }}>Диалог отложен на 5 минут</p>
      </div>
    )
    if (!canWrite) return null
    return (
      <div style={{ padding: "12px 16px", background: "white", borderTop: "1px solid #F3F4F6" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F8F9FA", borderRadius: 14, padding: "8px 8px 8px 16px", border: "1.5px solid #E5E7EB" }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input) } }}
            placeholder={active?.status === "waiting" && !isMine ? "Сначала примите диалог..." : "Напишите ответ... (Enter — отправить)"}
            disabled={active?.status === "waiting" && !isMine}
            style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 14, color: "#111" }} />
          <button onClick={() => send(input)} disabled={!input.trim() || sending}
            style={{ width: 36, height: 36, borderRadius: 10, border: "none", cursor: "pointer", background: input.trim() ? color : "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}>
            {sending
              ? <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              : <Send size={15} color={input.trim() ? "white" : "#9CA3AF"} />}
          </button>
        </div>
      </div>
    )
  }

  const renderQuickReplies = () => {
    if (!quickReplies.length || !canWrite) return null
    return (
      <div style={{ padding: "8px 16px", display: "flex", gap: 6, flexWrap: "wrap", background: "white", borderTop: "1px solid #F3F4F6" }}>
        <span style={{ fontSize: 11, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 4, marginRight: 4 }}><Zap size={11} color={color} /> Быстрые:</span>
        {quickReplies.map((qr, i) => (
          <button key={i} onClick={() => send(qr)} style={{ padding: "5px 12px", borderRadius: 99, border: "1px solid #E5E7EB", background: "transparent", color: "#374151", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
            {qr}
          </button>
        ))}
      </div>
    )
  }

  const renderSessionItem = (s: Session) => {
    const isSelected = s.id === activeId
    const lastMsg    = s.messages?.[0]
    const isTakenMe  = s.operatorId === currentOperator.id
    const isTakenOt  = s.operatorId && !isTakenMe
    return (
      <button key={s.id} onClick={() => openSession(s.id)}
        style={{ width: "100%", textAlign: "left", border: "none", cursor: "pointer", padding: "12px 16px", background: isSelected ? "#FFF5EF" : "transparent", borderLeft: isSelected ? `3px solid ${color}` : "3px solid transparent", borderBottom: "1px solid #F3F4F6", transition: "all 0.12s", display: "flex", gap: 10, alignItems: "flex-start", opacity: isTakenOt ? 0.55 : 1 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, background: isTakenMe ? "#dcfce7" : "#FFF5EF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: isTakenMe ? "#16a34a" : color, position: "relative" }}>
          {(s.visitorName ?? "П")[0].toUpperCase()}
          <span style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", border: "2px solid white" }} className={STATUS_DOT[s.status]} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
            <p style={{ fontWeight: 600, fontSize: 13, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.visitorName ?? "Посетитель"}</p>
            <span style={{ fontSize: 10, color: "#9CA3AF", flexShrink: 0 }}>{formatTime(s.updatedAt)}</span>
          </div>
          <p style={{ fontSize: 12, color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{lastMsg ? lastMsg.text : "Нет сообщений"}</p>
        </div>
        {(s.unreadCount ?? 0) > 0 && (
          <span style={{ width: 18, height: 18, borderRadius: 99, background: color, color: "white", fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
            {(s.unreadCount ?? 0) > 9 ? "9+" : s.unreadCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F0F2F5", overflow: "hidden" }}>
      <nav style={{ width: 64, background: "#1C1C28", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 4, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <MessageCircle size={18} color="white" />
        </div>
        {TABS.map(tab => {
          const Icon = tab.icon
          const cnt = tab.key === "waiting" ? totalUnread : 0
          return (
            <button key={tab.key} onClick={() => { setFilter(tab.key); setActiveId(null); setMessages([]) }} title={tab.label}
              style={{ width: 44, height: 44, borderRadius: 10, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: filter === tab.key ? "rgba(255,255,255,0.12)" : "transparent", color: filter === tab.key ? "white" : "rgba(255,255,255,0.35)", transition: "all 0.15s", position: "relative" }}>
              <Icon size={18} />
              {cnt > 0 && <span style={{ position: "absolute", top: 6, right: 6, width: 14, height: 14, borderRadius: 99, background: "#ef4444", color: "white", fontSize: 8, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{cnt > 9 ? "9+" : cnt}</span>}
            </button>
          )
        })}
        <div style={{ flex: 1 }} />
        <button onClick={handleNotif} title={notif ? "Уведомления включены" : "Включить уведомления"}
          style={{ width: 44, height: 44, borderRadius: 10, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: notif ? "#4ade80" : "rgba(255,255,255,0.3)", transition: "all 0.15s" }}>
          {notif ? <Bell size={18} /> : <BellOff size={18} />}
        </button>
        <a href="/settings" title="Настройки" style={{ width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>
          <Settings2 size={18} />
        </a>
        <button onClick={logout} title="Выйти" style={{ width: 44, height: 44, borderRadius: 10, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "rgba(255,255,255,0.3)", transition: "color 0.15s", marginBottom: 8 }}>
          <LogOut size={18} />
        </button>
        <div title={currentOperator.name} style={{ width: 36, height: 36, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 14, position: "relative", flexShrink: 0, overflow: "hidden" }}>
          {currentOperator.avatar ? <img src={currentOperator.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : currentOperator.name[0].toUpperCase()}
          <span style={{ position: "absolute", bottom: 1, right: 1, width: 8, height: 8, background: "#4ade80", borderRadius: "50%", border: "1.5px solid #1C1C28" }} />
        </div>
      </nav>

      <div style={{ width: 280, background: "white", display: "flex", flexDirection: "column", borderRight: "1px solid #EAECF0", flexShrink: 0 }}>
        <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontWeight: 700, fontSize: 15, color: "#111", margin: 0 }}>{TABS.find(t => t.key === filter)?.label}</h2>
            {totalUnread > 0 && filter === "waiting" && <span style={{ background: "#ef4444", color: "white", fontSize: 10, fontWeight: 900, padding: "2px 7px", borderRadius: 99 }}>{totalUnread}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F7F8FA", borderRadius: 10, padding: "8px 12px" }}>
            <Search size={13} color="#9CA3AF" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#374151" }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 8, color: "#D1D5DB" }}>
              <Inbox size={32} /><p style={{ fontSize: 13 }}>Пусто</p>
            </div>
          ) : filtered.map(s => renderSessionItem(s))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {!activeId ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "#D1D5DB" }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageCircle size={32} color="#E5E7EB" />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontWeight: 600, color: "#9CA3AF", fontSize: 15 }}>Выберите диалог</p>
              <p style={{ fontSize: 13, color: "#D1D5DB", marginTop: 4 }}>Нажмите на чат в списке слева</p>
            </div>
            {totalUnread > 0 && (
              <button onClick={() => setFilter("waiting")} style={{ padding: "10px 20px", borderRadius: 12, background: color, color: "white", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer" }}>
                Посмотреть {totalUnread} непрочитанных
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ padding: "0 20px", height: 60, background: "white", borderBottom: "1px solid #EAECF0", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FFF5EF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color, flexShrink: 0 }}>
                {(active?.visitorName ?? "П")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{active?.visitorName ?? "Посетитель"}</p>
                {active?.visitorPage && <p style={{ fontSize: 11, color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><Globe size={10} style={{ display: "inline", marginRight: 3 }} />{active.visitorPage}</p>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: STATUS_COLORS[active?.status ?? "waiting"]?.bg, color: STATUS_COLORS[active?.status ?? "waiting"]?.color }}>
                  {STATUS_LABEL[active?.status ?? "waiting"]}
                </span>
                {takenByOther && takenByOp && <span style={{ fontSize: 11, color: "#9CA3AF", background: "#F9FAFB", padding: "3px 8px", borderRadius: 8, border: "1px solid #E5E7EB" }}>Взял {takenByOp.name}</span>}
                {(active?.status === "waiting" || (active?.status === "active" && !active.operatorId)) && !takenByOther && (
                  <button onClick={accept} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, background: "#16a34a", color: "white", fontWeight: 600, fontSize: 12, border: "none", cursor: "pointer" }}>Принять <ChevronRight size={14} /></button>
                )}
                {isMine && active?.status !== "closed" && (
                  <>
                    <button onClick={postpone} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10, border: "1px solid #BFDBFE", background: "transparent", color: "#2563eb", fontSize: 12, fontWeight: 500, cursor: "pointer" }}><Clock size={13} /> 5 мин</button>
                    <button onClick={close} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10, border: "1px solid #FECACA", background: "transparent", color: "#dc2626", fontSize: 12, fontWeight: 500, cursor: "pointer" }}><XCircle size={13} /> Закрыть</button>
                  </>
                )}
                {active?.status === "closed" && (
                  <button onClick={reopen} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10, border: "1px solid #BBF7D0", background: "transparent", color: "#16a34a", fontSize: 12, fontWeight: 500, cursor: "pointer" }}><RotateCcw size={13} /> Открыть</button>
                )}
                <button onClick={() => setShowInfo(v => !v)} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #E5E7EB", background: showInfo ? "#F9FAFB" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
                  <User size={15} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {renderMessages()}
                {renderQuickReplies()}
                {renderInput()}
              </div>
              {showInfo && active && (
                <div style={{ width: 240, background: "white", borderLeft: "1px solid #EAECF0", padding: "20px 16px", overflowY: "auto", flexShrink: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 14 }}>Посетитель</p>
                  <InfoRow icon={<User size={13} />} label="Имя" value={active.visitorName ?? "—"} />
                  <InfoRow icon={<Globe size={13} />} label="Страница" value={active.visitorPage ?? "—"} truncate />
                  <InfoRow icon={<Clock size={13} />} label="Начало" value={formatTime(active.createdAt)} />
                  <InfoRow icon={<Hash size={13} />} label="ID сессии" value={active.id.slice(0, 8) + "…"} mono />
                  <div style={{ margin: "20px 0", height: 1, background: "#F3F4F6" }} />
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 14 }}>Оператор</p>
                  {active.operatorId ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#FFF5EF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, color }}>
                        {(operators.find(o => o.id === active.operatorId)?.name ?? "О")[0].toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>{operators.find(o => o.id === active.operatorId)?.name ?? "—"}</p>
                        <p style={{ fontSize: 10, color: "#9CA3AF" }}>{isMine ? "Это вы" : "Другой оператор"}</p>
                      </div>
                    </div>
                  ) : <p style={{ fontSize: 12, color: "#9CA3AF" }}>Не назначен</p>}
                  <div style={{ margin: "20px 0", height: 1, background: "#F3F4F6" }} />
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 12 }}>Сообщений</p>
                  <p style={{ fontSize: 24, fontWeight: 800, color: "#111" }}>{messages.length}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function InfoRow({ icon, label, value, truncate, mono }: { icon: React.ReactNode; label: string; value: string; truncate?: boolean; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
      <span style={{ color: "#9CA3AF", marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 1 }}>{label}</p>
        <p style={{ fontSize: 12, color: "#374151", fontWeight: 500, fontFamily: mono ? "monospace" : "inherit", overflow: truncate ? "hidden" : "visible", textOverflow: "ellipsis", whiteSpace: truncate ? "nowrap" : "normal" }}>
          {value}
        </p>
      </div>
    </div>
  )
}
