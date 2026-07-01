"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  MessageCircle, Send, LogOut, Search, Clock, CheckCheck,
  Check, Zap, XCircle, RotateCcw, Circle,
  Globe, User, Hash, ChevronRight, Bell, BellOff,
  Inbox, Activity, Archive, PauseCircle, Settings2,
} from "lucide-react"
import { cn } from "@/lib/utils"
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
  const [filter,    setFilter]    = useState("waiting")
  const [sessions,  setSessions]  = useState<Session[]>(initialSessions)
  const [activeId,  setActiveId]  = useState<string | null>(null)
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState("")
  const [sending,   setSending]   = useState(false)
  const [search,    setSearch]    = useState("")
  const [notif,     setNotif]     = useState(false)
  const [showInfo,  setShowInfo]  = useState(true)
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

  /* ── Heartbeat ── */
  useEffect(() => {
    const t = setInterval(() => fetch("/api/operators/heartbeat", { method: "POST" }), 30000)
    fetch("/api/operators/heartbeat", { method: "POST" })
    return () => clearInterval(t)
  }, [])

  /* ── Poll sessions ── */
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

  /* ── Poll messages ── */
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

  /* ── Notifications ── */
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "granted") setNotif(true)
  }, [])

  /* ── Actions ── */
  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/session/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    fetchSessions()
  }

  const accept   = () => activeId && patch(activeId, { status: "active",    operatorId: currentOperator.id })
  const postpone = () => activeId && patch(activeId, { status: "postponed", postponedUntil: new Date(Date.now() + 5 * 60000).toISOString(), operatorId: null }).then(() => { setActiveId(null); setMessages([]) })
  const close    = () => activeId && patch(activeId, { status: "closed" }).then(() => { setActiveId(null); setMessages([]) })
  const reopen   = () => activeId && patch(activeId, { status: "waiting",   operatorId: null }).then(fetchSessions)

  async function send(text: string) {
    if (!activeId || !text.trim() || sending) return
    setSending(true)
    try {
      await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: activeId, text, sender: "operator" }) })
      setInput("")
      await fetchMessages(activeId)
    } finally { setSending(false) }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  /* ── Group messages by date ── */
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

  const tabCount = (key: string) => key === filter ? sessions.length : 0

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F0F2F5", overflow: "hidden" }}>

      {/* ══════════════════════════════════════
          NAV RAIL — иконки + аватар
      ══════════════════════════════════════ */}
      <nav style={{ width: 64, background: "#1C1C28", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 4, flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ width: 36, height: 36, borderRadius: 10, background: color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <MessageCircle size={18} color="white" />
        </div>

        {/* Nav items */}
        {TABS.map(tab => {
          const Icon = tab.icon
          const cnt = tab.key === "waiting" ? totalUnread : 0
          return (
            <button key={tab.key}
              onClick={() => { setFilter(tab.key); setActiveId(null); setMessages([]) }}
              title={tab.label}
              style={{
                width: 44, height: 44, borderRadius: 10, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: filter === tab.key ? "rgba(255,255,255,0.12)" : "transparent",
                color: filter === tab.key ? "white" : "rgba(255,255,255,0.35)",
                transition: "all 0.15s", position: "relative",
              }}>
              <Icon size={18} />
              {cnt > 0 && (
                <span style={{ position: "absolute", top: 6, right: 6, width: 14, height: 14, borderRadius: 99, background: "#ef4444", color: "white", fontSize: 8, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {cnt > 9 ? "9+" : cnt}
                </span>
              )}
            </button>
          )
        })}

        <div style={{ flex: 1 }} />

        {/* Notifications */}
        <button onClick={async () => { const p = await Notification.requestPermission(); setNotif(p === "granted") }}
          title={notif ? "Уведомления включены" : "Включить уведомления"}
          style={{ width: 44, height: 44, borderRadius: 10, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: notif ? "#4ade80" : "rgba(255,255,255,0.3)", transition: "all 0.15s" }}>
          {notif ? <Bell size={18} /> : <BellOff size={18} />}
        </button>

        {/* Settings */}
        <a href="/settings" title="Настройки"
          style={{ width: 44, height: 44, borderRadius: 10, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "rgba(255,255,255,0.3)", textDecoration: "none", transition: "color 0.15s" }}>
          <Settings2 size={18} />
        </a>

        {/* Logout */}
        <button onClick={logout} title="Выйти"
          style={{ width: 44, height: 44, borderRadius: 10, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "rgba(255,255,255,0.3)", transition: "color 0.15s", marginBottom: 8 }}>
          <LogOut size={18} />
        </button>

        {/* Avatar */}
        <div title={currentOperator.name}
          style={{ width: 36, height: 36, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 14, position: "relative", flexShrink: 0, overflow: "hidden" }}>
          {currentOperator.avatar
            ? <img src={currentOperator.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
            : currentOperator.name[0].toUpperCase()}
          <span style={{ position: "absolute", bottom: 1, right: 1, width: 8, height: 8, background: "#4ade80", borderRadius: "50%", border: "1.5px solid #1C1C28" }} />
        </div>
      </nav>

      {/* ══════════════════════════════════════
          SESSION LIST
      ══════════════════════════════════════ */}
      <div style={{ width: 280, background: "white", display: "flex", flexDirection: "column", borderRight: "1px solid #EAECF0", flexShrink: 0 }}>

        {/* Header */}
        <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontWeight: 700, fontSize: 15, color: "#111", margin: 0 }}>
              {TABS.find(t => t.key === filter)?.label}
            </h2>
            {totalUnread > 0 && filter === "waiting" && (
              <span style={{ background: "#ef4444", color: "white", fontSize: 10, fontWeight: 900, padding: "2px 7px", borderRadius: 99 }}>
                {totalUnread}
              </span>
            )}
          </div>
          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F7F8FA", borderRadius: 10, padding: "8px 12px" }}>
            <Search size={13} color="#9CA3AF" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск..." style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#374151" }} />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 8, color: "#D1D5DB" }}>
              <Inbox size={32} />
              <p style={{ fontSize: 13 }}>Пусто</p>
            </div>
          ) : filtered.map(s => {
            const isSelected = s.id === activeId
            const lastMsg    = s.messages?.[0]
            const isTakenMe  = s.operatorId === currentOperator.id
            const isTakenOt  = s.operatorId && !isTakenMe
            return (
              <button key={s.id}
                onClick={() => { setActiveId(s.id); fetchMessages(s.id) }}
                style={{
                  width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                  padding: "12px 16px", background: isSelected ? "#FFF5EF" : "transparent",
                  borderLeft: isSelected ? `3px solid ${color}` : "3px solid transparent",
                  transition: "all 0.12s", display: "flex", gap: 10, alignItems: "flex-start",
                  opacity: isTakenOt ? 0.55 : 1,
                }}>
                {/* Avatar */}
                <div style={{
                  width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                  background: isTakenMe ? "#dcfce7" : "#FFF5EF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 14,
                  color: isTakenMe ? "#16a34a" : color, position: "relative",
                }}>
                  {(s.visitorName ?? "П")[0].toUpperCase()}
                  <span style={{
                    position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%",
                    border: "2px solid white",
                  }} className={STATUS_DOT[s.status]} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.visitorName ?? "Посетитель"}
                    </p>
                    <span style={{ fontSize: 10, color: "#9CA3AF", flexShrink: 0 }}>{formatTime(s.updatedAt)}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                    {lastMsg ? lastMsg.text : "Нет сообщений"}
                  </p>
                </div>

                {(s.unreadCount ?? 0) > 0 && (
                  <span style={{ width: 18, height: 18, borderRadius: 99, background: color, color: "white", fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                    {(s.unreadCount ?? 0) > 9 ? "9+" : s.unreadCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════
          CHAT AREA
      ══════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {!activeId ? (
          /* Empty state */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "#D1D5DB" }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageCircle size={32} color="#E5E7EB" />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontWeight: 600, color: "#9CA3AF", fontSize: 15 }}>Выберите диалог</p>
              <p style={{ fontSize: 13, color: "#D1D5DB", marginTop: 4 }}>Нажмите на чат в списке слева</p>
            </div>
            {totalUnread > 0 && (
              <button onClick={() => setFilter("waiting")}
                style={{ padding: "10px 20px", borderRadius: 12, background: color, color: "white", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer" }}>
                Посмотреть {totalUnread} непрочитанных
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{ padding: "0 20px", height: 60, background: "white", borderBottom: "1px solid #EAECF0", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FFF5EF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color, flexShrink: 0 }}>
                {(active?.visitorName ?? "П")[0].toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{active?.visitorName ?? "Посетитель"}</p>
                {active?.visitorPage && (
                  <p style={{ fontSize: 11, color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <Globe size={10} style={{ display: "inline", marginRight: 3 }} />{active.visitorPage}
                  </p>
                )}
              </div>

              {/* Status + actions */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Status chip */}
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
                  background: active?.status === "active" ? "#dcfce7" : active?.status === "waiting" ? "#fef3c7" : active?.status === "postponed" ? "#dbeafe" : "#F3F4F6",
                  color: active?.status === "active" ? "#16a34a" : active?.status === "waiting" ? "#b45309" : active?.status === "postponed" ? "#1d4ed8" : "#6B7280",
                }}>
                  {{ waiting: "Ожидает", active: "Активный", postponed: "Отложен", closed: "Закрыт" }[active?.status ?? "waiting"]}
                </span>

                {takenByOther && takenByOp && (
                  <span style={{ fontSize: 11, color: "#9CA3AF", background: "#F9FAFB", padding: "3px 8px", borderRadius: 8, border: "1px solid #E5E7EB" }}>
                    Взял {takenByOp.name}
                  </span>
                )}

                {(active?.status === "waiting" || (active?.status === "active" && !active.operatorId)) && !takenByOther && (
                  <button onClick={accept}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, background: "#16a34a", color: "white", fontWeight: 600, fontSize: 12, border: "none", cursor: "pointer" }}>
                    Принять <ChevronRight size={14} />
                  </button>
                )}

                {isMine && active?.status !== "closed" && (
                  <>
                    <button onClick={postpone}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10, border: "1px solid #BFDBFE", background: "transparent", color: "#2563eb", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                      <Clock size={13} /> 5 мин
                    </button>
                    <button onClick={close}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10, border: "1px solid #FECACA", background: "transparent", color: "#dc2626", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                      <XCircle size={13} /> Закрыть
                    </button>
                  </>
                )}

                {active?.status === "closed" && (
                  <button onClick={reopen}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10, border: "1px solid #BBF7D0", background: "transparent", color: "#16a34a", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                    <RotateCcw size={13} /> Открыть
                  </button>
                )}

                <button onClick={() => setShowInfo(v => !v)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #E5E7EB", background: showInfo ? "#F9FAFB" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
                  <User size={15} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              {/* Messages */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
                              {/* Visitor avatar */}
                              {!isOp && (
                                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#FFF5EF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, color, flexShrink: 0, opacity: showAv ? 1 : 0 }}>
                                  {(active?.visitorName ?? "П")[0].toUpperCase()}
                                </div>
                              )}
                              <div style={{
                                maxWidth: "64%", padding: "10px 14px",
                                borderRadius: isOp ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                                background: isOp ? color : "white",
                                color: isOp ? "white" : "#111",
                                fontSize: 14, lineHeight: 1.55,
                                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                              }}>
                                {m.text}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, paddingLeft: isOp ? 0 : 36, paddingRight: isOp ? 0 : 0, justifyContent: isOp ? "flex-end" : "flex-start" }}>
                              <span style={{ fontSize: 10, color: "#9CA3AF" }}>{formatTime(m.createdAt)}</span>
                              {isOp && (m.isRead
                                ? <CheckCheck size={12} color="#60A5FA" />
                                : <Check size={12} color="#9CA3AF" />)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#D1D5DB", fontSize: 13 }}>
                      Нет сообщений
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Quick replies */}
                {quickReplies.length > 0 && canWrite && (
                  <div style={{ padding: "8px 16px", display: "flex", gap: 6, flexWrap: "wrap", background: "white", borderTop: "1px solid #F3F4F6" }}>
                    <span style={{ fontSize: 11, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 4, marginRight: 4 }}>
                      <Zap size={11} color={color} /> Быстрые ответы:
                    </span>
                    {quickReplies.map((qr, i) => (
                      <button key={i} onClick={() => send(qr)}
                        style={{ padding: "5px 12px", borderRadius: 99, border: `1px solid #E5E7EB`, background: "transparent", color: "#374151", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.12s" }}>
                        {qr}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input */}
                {active?.status === "closed" ? (
                  <div style={{ padding: "16px 20px", background: "white", borderTop: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                    <p style={{ fontSize: 13, color: "#9CA3AF" }}>Чат закрыт</p>
                    <button onClick={reopen}
                      style={{ padding: "7px 14px", borderRadius: 10, background: "#f0fdf4", color: "#16a34a", fontWeight: 600, fontSize: 12, border: "1px solid #BBF7D0", cursor: "pointer" }}>
                      Открыть снова
                    </button>
                  </div>
                ) : active?.status === "postponed" ? (
                  <div style={{ padding: "16px 20px", background: "#EFF6FF", borderTop: "1px solid #BFDBFE", display: "flex", alignItems: "center", gap: 8 }}>
                    <Clock size={15} color="#3B82F6" />
                    <p style={{ fontSize: 13, color: "#1D4ED8" }}>Диалог отложен на 5 минут</p>
                  </div>
                ) : canWrite ? (
                  <div style={{ padding: "12px 16px", background: "white", borderTop: "1px solid #F3F4F6" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F8F9FA", borderRadius: 14, padding: "8px 8px 8px 16px", border: "1.5px solid #E5E7EB" }}>
                      <input
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input) } }}
                        placeholder={active?.status === "waiting" && !isMine ? "Сначала примите диалог..." : "Напишите ответ... (Enter — отправить)"}
                        disabled={active?.status === "waiting" && !isMine}
                        style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 14, color: "#111" }}
                      />
                      <button onClick={() => send(input)} disabled={!input.trim() || sending}
                        style={{
                          width: 36, height: 36, borderRadius: 10, border: "none", cursor: "pointer",
                          background: input.trim() ? color : "#E5E7EB",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.15s", flexShrink: 0,
                        }}>
                        {sending
                          ? <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                          : <Send size={15} color={input.trim() ? "white" : "#9CA3AF"} />}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* ── Info panel ── */}
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
                  ) : (
                    <p style={{ fontSize: 12, color: "#9CA3AF" }}>Не назначен</p>
                  )}

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
