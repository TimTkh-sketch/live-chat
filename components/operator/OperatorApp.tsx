"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  MessageCircle, Send, Settings, LogOut, Search,
  Clock, CheckCheck, Check, User, ChevronRight,
  Zap, XCircle, RotateCcw, Bell, BellOff, Circle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatTime, formatDate } from "@/lib/utils"

interface Operator { id: string; name: string; avatar: string | null; isOnline: boolean }
interface Message { id: string; sessionId: string; sender: string; text: string; createdAt: string; isRead: boolean }
interface Session {
  id: string; visitorName: string | null; visitorPage: string | null; status: string
  operatorId: string | null; postponedUntil: string | null; createdAt: string; updatedAt: string
  messages: Message[]; operator: { id: string; name: string } | null; unreadCount?: number
}
interface Settings {
  quickReplies: string[]; greeting: string; primaryColor: string; operatorName: string
}

const STATUS_LABELS: Record<string, string> = { waiting: "Ожидают", active: "Активные", postponed: "Отложенные", closed: "Закрытые" }
const STATUS_COLORS: Record<string, string> = {
  waiting:   "bg-amber-100 text-amber-700",
  active:    "bg-emerald-100 text-emerald-700",
  postponed: "bg-blue-100 text-blue-600",
  closed:    "bg-gray-100 text-gray-500",
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
  settings: Settings | null
}) {
  const [filter, setFilter]   = useState("waiting")
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]     = useState("")
  const [sending, setSending]   = useState(false)
  const [search, setSearch]     = useState("")
  const [notifEnabled, setNotifEnabled] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  const activeSession = sessions.find(s => s.id === activeId) ?? null
  const isMine        = activeSession?.operatorId === currentOperator.id
  const takenByOther  = !!(activeSession?.operatorId && activeSession.operatorId !== currentOperator.id)
  const takenByOp     = operators.find(o => o.id === activeSession?.operatorId)
  const canWrite      = activeSession?.status !== "closed" && activeSession?.status !== "postponed" && !takenByOther

  const quickReplies  = settings?.quickReplies ?? []
  const color         = settings?.primaryColor ?? "#F26522"

  const totalUnread = sessions.reduce((acc, s) => acc + (s.unreadCount ?? 0), 0)

  /* ── Heartbeat ── */
  useEffect(() => {
    const t = setInterval(() => fetch("/api/operators/heartbeat", { method: "POST" }), 30000)
    fetch("/api/operators/heartbeat", { method: "POST" })
    return () => clearInterval(t)
  }, [])

  /* ── Fetch sessions ── */
  const fetchSessions = useCallback(async () => {
    const r = await fetch(`/api/session?workspaceId=${currentOperator.workspaceId}&status=${filter}`)
    const data = await r.json()
    if (Array.isArray(data)) setSessions(data)
  }, [currentOperator.workspaceId, filter])

  useEffect(() => { fetchSessions(); const t = setInterval(fetchSessions, 3000); return () => clearInterval(t) }, [fetchSessions])

  /* ── Fetch messages ── */
  const fetchMessages = useCallback(async (sid: string) => {
    const r = await fetch(`/api/messages?sessionId=${sid}`)
    const data = await r.json()
    if (Array.isArray(data)) setMessages(data)
  }, [])

  useEffect(() => {
    if (!activeId) return
    fetchMessages(activeId)
    const t = setInterval(() => fetchMessages(activeId), 2000)
    return () => clearInterval(t)
  }, [activeId, fetchMessages])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages.length])

  /* ── Notification permission ── */
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "granted") setNotifEnabled(true)
  }, [])

  /* ── Actions ── */
  async function patchSession(id: string, body: Record<string, unknown>) {
    await fetch(`/api/session/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    fetchSessions()
  }

  async function accept()   { if (!activeId) return; await patchSession(activeId, { status: "active", operatorId: currentOperator.id }) }
  async function postpone() { if (!activeId) return; await patchSession(activeId, { status: "postponed", postponedUntil: new Date(Date.now() + 5 * 60000).toISOString(), operatorId: null }); setActiveId(null); setMessages([]) }
  async function close()    { if (!activeId) return; await patchSession(activeId, { status: "closed" }); setActiveId(null); setMessages([]) }
  async function reopen()   { if (!activeId) return; await patchSession(activeId, { status: "waiting", operatorId: null }); fetchSessions() }

  async function sendMessage(text: string) {
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

  async function enableNotifications() {
    const perm = await Notification.requestPermission()
    setNotifEnabled(perm === "granted")
  }

  /* ── Message grouping by date ── */
  const grouped: { date: string; messages: Message[] }[] = []
  for (const m of messages) {
    const d = formatDate(m.createdAt)
    const last = grouped[grouped.length - 1]
    if (!last || last.date !== d) grouped.push({ date: d, messages: [m] })
    else last.messages.push(m)
  }

  const filteredSessions = sessions.filter(s =>
    !search || (s.visitorName ?? "Посетитель").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="h-screen flex overflow-hidden bg-[#F4F5F7]">

      {/* ═══════════════════════════════════
          LEFT SIDEBAR — Session list
      ═══════════════════════════════════ */}
      <aside className="w-72 shrink-0 flex flex-col bg-white border-r border-gray-100" style={{ height: "100vh" }}>

        {/* Operator header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: color }}>
            {currentOperator.avatar
              ? <img src={currentOperator.avatar} className="w-full h-full rounded-full object-cover" alt="" />
              : currentOperator.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{currentOperator.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />
              <span className="text-xs text-gray-400">Онлайн</span>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={notifEnabled ? undefined : enableNotifications}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              title={notifEnabled ? "Уведомления включены" : "Включить уведомления"}>
              {notifEnabled ? <Bell className="h-4 w-4 text-emerald-500" /> : <BellOff className="h-4 w-4" />}
            </button>
            <button onClick={() => window.location.href = "/settings"}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
              <Settings className="h-4 w-4" />
            </button>
            <button onClick={logout}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-gray-100">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
            <Search className="h-3.5 w-3.5 text-gray-300 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по клиентам..."
              className="flex-1 text-xs bg-transparent outline-none text-gray-700 placeholder-gray-300" />
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          {["waiting", "active", "postponed", "closed"].map(s => {
            const count = sessions.filter(x => x.status === s).length
            return (
              <button key={s}
                onClick={() => { setFilter(s); setActiveId(null); setMessages([]) }}
                className={cn(
                  "flex-1 py-2.5 text-[10px] font-bold tracking-wide transition-colors relative",
                  filter === s ? "text-gray-900 border-b-2" : "text-gray-400 hover:text-gray-600"
                )}
                style={filter === s ? { borderBottomColor: color } : {}}>
                {STATUS_LABELS[s].split("е")[0]}
                {count > 0 && <span className="absolute -top-0.5 -right-0 w-3.5 h-3.5 rounded-full text-white text-[8px] font-black flex items-center justify-center" style={{ background: color }}>{count > 9 ? "9+" : count}</span>}
              </button>
            )
          })}
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto">
          {filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-200">
              <MessageCircle className="h-10 w-10" />
              <p className="text-xs">Нет чатов</p>
            </div>
          ) : filteredSessions.map(s => {
            const lastMsg = s.messages?.[0]
            const isActive = activeId === s.id
            const isTakenByMe = s.operatorId === currentOperator.id
            const isTakenOther = s.operatorId && !isTakenByMe
            return (
              <button key={s.id}
                onClick={() => { setActiveId(s.id); fetchMessages(s.id) }}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors group",
                  isActive && "bg-orange-50",
                  isTakenOther && "opacity-50"
                )}
                style={isActive ? { borderLeft: `3px solid ${color}` } : {}}>
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold relative"
                    style={{ background: isTakenByMe ? "#16a34a" : isTakenOther ? "#9CA3AF" : color }}>
                    {(s.visitorName ?? "П")[0].toUpperCase()}
                    {isTakenByMe && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">{s.visitorName ?? "Посетитель"}</p>
                      {(s.unreadCount ?? 0) > 0 && (
                        <span className="w-4 h-4 rounded-full text-white text-[9px] font-black flex items-center justify-center shrink-0" style={{ background: color }}>
                          {(s.unreadCount ?? 0) > 9 ? "9+" : s.unreadCount}
                        </span>
                      )}
                    </div>
                    {lastMsg
                      ? <p className="text-xs text-gray-400 truncate mt-0.5">{lastMsg.text}</p>
                      : <p className="text-xs text-gray-300 truncate mt-0.5">Нет сообщений</p>}
                    <p className="text-[10px] text-gray-300 mt-1">{formatTime(s.updatedAt)}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ═══════════════════════════════════
          MAIN — Chat window
      ═══════════════════════════════════ */}
      <main className="flex-1 flex flex-col min-w-0" style={{ height: "100vh" }}>
        {!activeId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-200">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: `${color}15` }}>
              <MessageCircle className="h-10 w-10" style={{ color }} />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-gray-400">Выберите диалог</p>
              <p className="text-sm text-gray-300 mt-1">Выберите чат из списка слева</p>
            </div>
            {totalUnread > 0 && (
              <div className="px-4 py-2 rounded-full text-sm font-semibold text-white animate-fade-up" style={{ background: color }}>
                {totalUnread} непрочитанных
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ background: color }}>
                  {(activeSession?.visitorName ?? "П")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{activeSession?.visitorName ?? "Посетитель"}</p>
                  {activeSession?.visitorPage && (
                    <p className="text-xs text-gray-400 truncate max-w-[280px]">{activeSession.visitorPage}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full", STATUS_COLORS[activeSession?.status ?? "waiting"])}>
                  {STATUS_LABELS[activeSession?.status ?? "waiting"]}
                </span>

                {takenByOther && takenByOp && (
                  <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                    Взял {takenByOp.name}
                  </span>
                )}

                {(activeSession?.status === "waiting" || (activeSession?.status === "active" && !activeSession.operatorId)) && !takenByOther && (
                  <button onClick={accept}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ background: "#16a34a" }}>
                    Принять диалог <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}

                {isMine && activeSession?.status !== "closed" && (
                  <>
                    <button onClick={postpone}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-100 transition-colors">
                      <Clock className="h-3.5 w-3.5" /> 5 мин
                    </button>
                    <button onClick={close}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-500 hover:bg-red-50 border border-red-100 transition-colors">
                      <XCircle className="h-3.5 w-3.5" /> Закрыть
                    </button>
                  </>
                )}

                {activeSession?.status === "closed" && (
                  <button onClick={reopen}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-emerald-600 hover:bg-emerald-50 border border-emerald-100 transition-colors">
                    <RotateCcw className="h-3.5 w-3.5" /> Открыть
                  </button>
                )}
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-1" style={{ background: "#F8F9FA" }}>
              {grouped.map(group => (
                <div key={group.date}>
                  <div className="flex items-center justify-center my-4">
                    <span className="text-[11px] text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100 font-medium">
                      {group.date}
                    </span>
                  </div>
                  {group.messages.map((m, i) => {
                    const isOp = m.sender === "operator"
                    const showAvatar = !isOp && (i === 0 || group.messages[i - 1]?.sender !== m.sender)
                    return (
                      <div key={m.id} className={cn("flex items-end gap-2 mb-1", isOp ? "justify-end" : "justify-start")}>
                        {!isOp && (
                          <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0", showAvatar ? "opacity-100" : "opacity-0")}
                            style={{ background: color }}>
                            {(activeSession?.visitorName ?? "П")[0].toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col gap-0.5" style={{ maxWidth: "68%" }}>
                          <div style={{
                            padding: "10px 14px",
                            borderRadius: isOp ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                            background: isOp ? color : "#FFFFFF",
                            color: isOp ? "#fff" : "#111",
                            fontSize: 14,
                            lineHeight: 1.55,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                          }}>
                            {m.text}
                          </div>
                          <div className={cn("flex items-center gap-1", isOp ? "justify-end" : "justify-start")}>
                            <span className="text-[10px] text-gray-400">{formatTime(m.createdAt)}</span>
                            {isOp && (m.isRead
                              ? <CheckCheck className="h-3 w-3 text-blue-400" />
                              : <Check className="h-3 w-3 text-gray-300" />)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              {messages.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-gray-300">Нет сообщений</p>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick replies */}
            {quickReplies.length > 0 && canWrite && (
              <div className="flex gap-2 flex-wrap px-5 py-2.5 bg-white border-t border-gray-100 shrink-0">
                {quickReplies.map((qr, i) => (
                  <button key={i} onClick={() => sendMessage(qr)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 text-gray-600 hover:border-gray-400 transition-colors">
                    <Zap className="h-3 w-3" style={{ color }} />
                    {qr}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            {activeSession?.status === "closed" ? (
              <div className="flex items-center justify-center gap-3 px-5 py-4 bg-white border-t border-gray-100 shrink-0">
                <p className="text-sm text-gray-400">Чат закрыт</p>
                <button onClick={reopen}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                  <RotateCcw className="h-3.5 w-3.5" /> Открыть заново
                </button>
              </div>
            ) : activeSession?.status === "postponed" ? (
              <div className="flex items-center justify-center gap-2 px-5 py-4 bg-blue-50 border-t border-blue-100 shrink-0">
                <Clock className="h-4 w-4 text-blue-400" />
                <p className="text-sm text-blue-500">Диалог отложен на 5 минут</p>
              </div>
            ) : canWrite ? (
              <div className="flex items-center gap-3 px-5 py-3.5 bg-white border-t border-gray-100 shrink-0">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
                  placeholder={activeSession?.status === "waiting" ? "Примите диалог чтобы ответить..." : "Напишите ответ..."}
                  disabled={activeSession?.status === "waiting" && !isMine}
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-gray-400 focus:bg-white transition-all placeholder-gray-300 disabled:opacity-50"
                />
                <button onClick={() => sendMessage(input)} disabled={!input.trim() || sending}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 transition-all active:scale-90 disabled:opacity-40"
                  style={{ background: color }}>
                  {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  )
}
