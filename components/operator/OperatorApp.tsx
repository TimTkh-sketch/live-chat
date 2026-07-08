"use client"

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react"
import {
  MessageCircle, Send, LogOut, Search, Clock, CheckCheck,
  Check, Zap, XCircle, RotateCcw, ArrowLeft,
  Globe, User, Hash, ChevronRight, Bell, BellOff,
  Inbox, Activity, Archive, Settings2,
} from "lucide-react"
import { formatTime, formatDate } from "@/lib/utils"

interface Operator  { id: string; name: string; avatar: string | null; isOnline: boolean }
interface Message   { id: string; sessionId: string; sender: string; text: string; createdAt: string; isRead: boolean; attachmentUrl?: string }
interface Session   {
  id: string; visitorName: string | null; visitorPage: string | null; status: string
  operatorId: string | null; postponedUntil: string | null; createdAt: string; updatedAt: string
  messages: Message[]; operator: { id: string; name: string } | null; unreadCount?: number
  channel?: string
}

function ChannelBadge({ channel }: { channel?: string }) {
  if (!channel || channel === "web") return null
  if (channel === "telegram") return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "#229ED9", color: "white", flexShrink: 0 }}>TG</span>
  )
  if (channel === "vk") return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "#0077FF", color: "white", flexShrink: 0 }}>VK</span>
  )
  if (channel === "avito") return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "#00B140", color: "white", flexShrink: 0 }}>AV</span>
  )
  return null
}
interface ChatSettings { quickReplies: string[]; greeting: string; primaryColor: string; operatorName: string }

function VkIcon({ size = 22, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path fill={color} d="M13.162 18.994c.609 0 .877-.37.866-.927-.022-1.793.812-2.596 1.656-1.686.982 1.055 2.03 2.613 2.617 2.613h2.531c.764 0 1.167-.38.94-.936-.222-.553-1.386-2.044-2.084-2.894-.698-.85-1.576-1.73-.696-3.093 1.065-1.627 2.875-4.583 3.04-5.25.155-.617-.155-.928-.79-.928h-2.531c-.65 0-.912.36-1.06.75-.148.389-1.095 2.815-2.456 4.29-.538.573-.894.563-1.218-.06-.247-.474-.247-1.58-.247-2.353V7.372c0-.643-.15-1.035-.765-1.16a7.52 7.52 0 0 0-1.285-.11c-.884 0-1.574.26-1.987.7-.267.288-.04.432.16.453.54.06 1.051.437 1.075 1.5l.056 1.923c0 .877-.147 1.755-.75 2.04-.604.286-1.395-.056-2.182-1.498-.756-1.403-1.626-3.784-1.636-3.804-.149-.39-.411-.751-1.06-.751H4.83c-.73 0-.92.364-.92.727 0 .39 1.278 4.012 2.81 6.32 1.368 2.06 3.14 3.04 4.82 3.04h1.622z"/>
    </svg>
  )
}

function AvitoIcon({ size = 22, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Letter A */}
      <path fill={color} d="M10.5 20H7L12 5l5 15h-3.5l-.8-2.5H11.3L10.5 20zm1.4-5.5h.2L12 12l-.1 2.5z"/>
      {/* Dot — Avito signature */}
      <circle cx="17.5" cy="6.5" r="2.8" fill={color}/>
    </svg>
  )
}

const TABS = [
  { key: "waiting",   label: "Входящие",  icon: Inbox,     channel: null },
  { key: "active",    label: "Активные",  icon: Activity,  channel: null },
  { key: "vk",        label: "ВКонтакте", icon: VkIcon,    channel: "vk" },
  { key: "avito",     label: "Авито",     icon: AvitoIcon, channel: "avito" },
  { key: "closed",    label: "Архив",     icon: Archive,   channel: null },
]

const STATUS_LABEL: Record<string, string> = {
  waiting: "Ожидает", active: "Активный", postponed: "Отложен", closed: "Закрыт",
}

/* iOS dark system palette */
const IOS = {
  bg:        "#000000",
  bg2:       "#1C1C1E",
  bg3:       "#2C2C2E",
  bg4:       "#3A3A3C",
  label:     "#FFFFFF",
  label2:    "rgba(235,235,245,0.6)",
  label3:    "rgba(235,235,245,0.3)",
  sep:       "rgba(84,84,88,0.65)",
  orange:    "#F26522",
  green:     "#30D158",
  blue:      "#0A84FF",
  red:       "#FF453A",
  amber:     "#FF9F0A",
  purple:    "#BF5AF2",
  tabBarBg:  "rgba(28,28,30,0.94)",
}

const STATUS_DOT: Record<string, string> = {
  waiting:   IOS.amber,
  active:    IOS.green,
  postponed: IOS.blue,
  closed:    IOS.bg4,
}

const STATUS_COLORS_LIGHT: Record<string, { bg: string; color: string }> = {
  active:    { bg: "#dcfce7", color: "#16a34a" },
  waiting:   { bg: "#fef3c7", color: "#b45309" },
  postponed: { bg: "#dbeafe", color: "#1d4ed8" },
  closed:    { bg: "#F3F4F6", color: "#6B7280" },
}

const AVATAR_COLORS = [IOS.orange, IOS.blue, IOS.green, IOS.amber, IOS.red, IOS.purple, "#FF375F", "#32ADE6"]
function avatarColor(name: string) { return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length] }

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: avatarColor(name), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: Math.round(size * 0.38), color: "white" }}>
      {(name ?? "П")[0].toUpperCase()}
    </div>
  )
}

export function OperatorApp({
  currentOperator,
  initialSessions,
  operators,
  settings,
}: {
  currentOperator: { id: string; name: string; avatar: string | null; workspaceId: string; canManageSettings: boolean; canManageOperators: boolean; canManageChannels: boolean; canManageReplies: boolean }
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
  const [isMobile,     setIsMobile]     = useState(() => typeof window !== "undefined" && window.innerWidth < 1024)
  const [mobileView,   setMobileView]   = useState<"list" | "chat">("list")
  const [isSelecting,  setIsSelecting]  = useState(false)
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set())
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  const active       = sessions.find(s => s.id === activeId) ?? null
  const isExternal   = active?.channel === "vk" || active?.channel === "avito"
  const isMine       = active?.operatorId === currentOperator.id
  const takenByOther = !!(active?.operatorId && active.operatorId !== currentOperator.id)
  const takenByOp    = operators.find(o => o.id === active?.operatorId)
  const canWrite     = active?.status !== "closed" && active?.status !== "postponed" && !takenByOther

  const canViewSettings = currentOperator.canManageSettings || currentOperator.canManageOperators || currentOperator.canManageChannels || currentOperator.canManageReplies

  const color        = settings?.primaryColor ?? "#F26522"
  const quickReplies = settings?.quickReplies ?? []
  const totalUnread  = sessions.reduce((a, s) => a + (s.unreadCount ?? 0), 0)

  useLayoutEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
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
    const tab = TABS.find(t => t.key === filter)
    const url = tab?.channel
      ? `/api/session?workspaceId=${currentOperator.workspaceId}&channel=${tab.channel}&limit=50`
      : `/api/session?workspaceId=${currentOperator.workspaceId}&status=${filter}&limit=50`
    const r = await fetch(url)
    const d = await r.json()
    if (d?.sessions) setSessions(d.sessions)
    else if (Array.isArray(d)) setSessions(d)
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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages.length])

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      setNotif(true); registerPush()
    }
  }, [])

  async function registerPush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
    try {
      const reg = await navigator.serviceWorker.register("/sw.js")
      const keyRes = await fetch("/api/push")
      const { publicKey } = await keyRes.json()
      if (!publicKey) return
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })
      await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub }) })
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

  const accept      = () => activeId && patch(activeId, { status: "active", operatorId: currentOperator.id })
  const quickAccept = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await patch(id, { status: "active", operatorId: currentOperator.id })
    setFilter("active")
    openSession(id)
  }
  const postpone = () => activeId && patch(activeId, { status: "postponed", postponedUntil: new Date(Date.now() + 5 * 60000).toISOString(), operatorId: null }).then(() => { setActiveId(null); setMessages([]); if (isMobile) setMobileView("list") })
  const close    = () => activeId && patch(activeId, { status: "closed" }).then(() => { setActiveId(null); setMessages([]); if (isMobile) setMobileView("list") })
  const reopen   = () => activeId && patch(activeId, { status: "waiting", operatorId: null }).then(fetchSessions)

  function toggleSelect(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function exitSelect() { setIsSelecting(false); setSelectedIds(new Set()) }

  async function bulkAction(status: string) {
    const body: Record<string, unknown> = { status }
    if (status === "active")    { body.operatorId = currentOperator.id }
    if (status === "postponed") { body.postponedUntil = new Date(Date.now() + 5 * 60000).toISOString(); body.operatorId = null }
    if (status === "waiting")   { body.operatorId = null }
    await Promise.all([...selectedIds].map(id => fetch(`/api/session/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })))
    exitSelect()
    fetchSessions()
  }

  async function send(text: string) {
    if (!activeId || !text.trim() || sending) return
    setSending(true)
    try {
      // Для VK/Avito — принимаем и назначаем оператора автоматически при первом ответе
      if (isExternal && active?.status === "waiting") {
        await patch(activeId, { status: "active", operatorId: currentOperator.id })
      }
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
    setActiveId(id); fetchMessages(id)
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
      MOBILE — iOS native dark style
  ══════════════════════════════════════ */
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: IOS.bg, overflow: "hidden" }}>

        {/* ════ LIST VIEW ════ */}
        {mobileView === "list" && (
          <>
            {/* Navigation bar */}
            <div style={{ background: IOS.bg2, borderBottom: `1px solid ${IOS.sep}`, flexShrink: 0, paddingTop: "env(safe-area-inset-top, 0px)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: IOS.orange, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <MessageCircle size={15} color="white" />
                  </div>
                  <span style={{ color: IOS.label, fontWeight: 700, fontSize: 17, letterSpacing: -0.3 }}>LiveChat</span>
                  {totalUnread > 0 && (
                    <span style={{ background: IOS.red, color: "white", fontSize: 11, fontWeight: 700, minWidth: 20, height: 20, borderRadius: 99, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
                      {totalUnread > 9 ? "9+" : totalUnread}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <button onClick={handleNotif} style={{ background: "none", border: "none", cursor: "pointer", color: notif ? IOS.green : IOS.label3, padding: "6px 8px" }}>
                    {notif ? <Bell size={20} /> : <BellOff size={20} />}
                  </button>
                  {canViewSettings && <a href="/settings" style={{ color: IOS.label3, display: "flex", alignItems: "center", padding: "6px 8px", textDecoration: "none" }}>
                    <Settings2 size={20} />
                  </a>}
                  <button onClick={logout} style={{ background: "none", border: "none", cursor: "pointer", color: IOS.label3, padding: "6px 8px" }}>
                    <LogOut size={20} />
                  </button>
                </div>
              </div>

              {/* Search bar */}
              <div style={{ margin: "0 16px 12px", display: "flex", alignItems: "center", gap: 8, background: IOS.bg3, borderRadius: 10, padding: "8px 12px" }}>
                <Search size={14} color={IOS.label3} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск"
                  style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 16, color: IOS.label }} />
              </div>
            </div>

            {/* Session list */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filtered.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 4px" }}>
                  <span style={{ fontSize: 12, color: IOS.label3, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {isSelecting && selectedIds.size > 0 ? `Выбрано: ${selectedIds.size}` : "Диалоги"}
                  </span>
                  {isSelecting
                    ? <button onClick={exitSelect} style={{ background: "none", border: "none", cursor: "pointer", color: IOS.orange, fontSize: 14, fontWeight: 600, padding: 0 }}>Отмена</button>
                    : <button onClick={() => setIsSelecting(true)} style={{ background: "none", border: "none", cursor: "pointer", color: IOS.orange, fontSize: 14, fontWeight: 500, padding: 0 }}>Выбрать</button>
                  }
                </div>
              )}
              {filtered.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 280, gap: 12 }}>
                  <Inbox size={44} color={IOS.label3} />
                  <p style={{ color: IOS.label3, fontSize: 15 }}>Нет диалогов</p>
                </div>
              ) : (
                /* iOS-style grouped table */
                <div style={{ margin: "20px 16px 0", background: IOS.bg2, borderRadius: 12, overflow: "hidden" }}>
                  {filtered.map((s, idx) => {
                    const lastMsg   = s.messages?.[0]
                    const isLast    = idx === filtered.length - 1
                    const isTakenMe = s.operatorId === currentOperator.id
                    const isSel     = selectedIds.has(s.id)
                    return (
                      <button key={s.id} onClick={() => isSelecting ? toggleSelect(s.id) : openSession(s.id)}
                        style={{ width: "100%", textAlign: "left", border: "none", background: isSel ? IOS.bg3 : "transparent", cursor: "pointer", padding: "11px 14px 11px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: isLast ? "none" : `1px solid ${IOS.sep}` }}>
                        {/* Checkbox (selection mode) or Avatar */}
                        {isSelecting ? (
                          <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, border: `2px solid ${isSel ? IOS.orange : IOS.label3}`, background: isSel ? IOS.orange : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {isSel && <Check size={14} color="white" />}
                          </div>
                        ) : (
                          <div style={{ position: "relative", flexShrink: 0 }}>
                            <Avatar name={s.visitorName ?? "П"} size={46} />
                            <span style={{ position: "absolute", bottom: 1, right: 1, width: 12, height: 12, borderRadius: "50%", background: STATUS_DOT[s.status] ?? IOS.bg4, border: `2px solid ${IOS.bg2}` }} />
                          </div>
                        )}

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                              <span style={{ fontWeight: 600, fontSize: 15, color: IOS.label, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {s.visitorName ?? "Посетитель"}
                              </span>
                              <ChannelBadge channel={s.channel} />
                            </div>
                            <span style={{ fontSize: 12, color: IOS.label3, flexShrink: 0, marginLeft: 4 }}>{formatTime(s.updatedAt)}</span>
                          </div>
                          <p style={{ fontSize: 13, color: IOS.label2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                            {isTakenMe ? "● Вы ведёте этот диалог" : (lastMsg ? lastMsg.text : "Нет сообщений")}
                          </p>
                        </div>

                        {/* Badge + accept / chevron */}
                        {!isSelecting && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                            {(s.unreadCount ?? 0) > 0 && (
                              <span style={{ background: IOS.orange, color: "white", fontSize: 11, fontWeight: 700, minWidth: 20, height: 20, borderRadius: 99, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
                                {(s.unreadCount ?? 0) > 9 ? "9+" : s.unreadCount}
                              </span>
                            )}
                            {s.status === "waiting" && !s.operatorId && (!s.channel || s.channel === "web") ? (
                              <button onClick={e => quickAccept(s.id, e)}
                                style={{ padding: "5px 10px", borderRadius: 8, border: "none", background: IOS.green, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                                Принять
                              </button>
                            ) : (
                              <ChevronRight size={16} color={IOS.label3} />
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
              <div style={{ height: 24 }} />
            </div>

            {/* Tab bar / bulk action bar */}
            {isSelecting ? (
              <div style={{ background: IOS.bg2, borderTop: `1px solid ${IOS.sep}`, flexShrink: 0, padding: "10px 16px", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}>
                <div style={{ fontSize: 12, color: IOS.label3, marginBottom: 10, textAlign: "center" }}>
                  {selectedIds.size > 0 ? `Выбрано: ${selectedIds.size}` : "Нажмите на диалоги для выбора"}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {filter !== "closed" && (
                    <button onClick={() => bulkAction("active")} disabled={selectedIds.size === 0}
                      style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer", background: selectedIds.size > 0 ? IOS.green : IOS.bg3, color: "white", fontWeight: 600, fontSize: 13, opacity: selectedIds.size === 0 ? 0.4 : 1 }}>
                      Принять
                    </button>
                  )}
                  {filter !== "closed" && (
                    <button onClick={() => bulkAction("postponed")} disabled={selectedIds.size === 0}
                      style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer", background: selectedIds.size > 0 ? IOS.blue : IOS.bg3, color: "white", fontWeight: 600, fontSize: 13, opacity: selectedIds.size === 0 ? 0.4 : 1 }}>
                      Отложить
                    </button>
                  )}
                  {filter !== "closed" && (
                    <button onClick={() => bulkAction("closed")} disabled={selectedIds.size === 0}
                      style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer", background: selectedIds.size > 0 ? IOS.red : IOS.bg3, color: "white", fontWeight: 600, fontSize: 13, opacity: selectedIds.size === 0 ? 0.4 : 1 }}>
                      Закрыть
                    </button>
                  )}
                  {filter === "closed" && (
                    <button onClick={() => bulkAction("waiting")} disabled={selectedIds.size === 0}
                      style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer", background: selectedIds.size > 0 ? IOS.green : IOS.bg3, color: "white", fontWeight: 600, fontSize: 13, opacity: selectedIds.size === 0 ? 0.4 : 1 }}>
                      Открыть
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ background: IOS.tabBarBg, borderTop: `1px solid ${IOS.sep}`, display: "flex", flexShrink: 0, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}>
                {TABS.map(tab => {
                  const Icon = tab.icon
                  const isActive = filter === tab.key
                  const tabColor = isActive
                    ? (tab.key === "vk" ? "#0077FF" : tab.key === "avito" ? "#00B140" : IOS.orange)
                    : IOS.label3
                  const cnt = tab.key === "waiting" ? totalUnread : 0
                  return (
                    <button key={tab.key}
                      onClick={() => { setFilter(tab.key); setActiveId(null); setMessages([]); exitSelect() }}
                      style={{ flex: 1, padding: "8px 0 6px", border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: tabColor, position: "relative", WebkitTapHighlightColor: "transparent" }}>
                      <Icon size={20} color={tabColor} />
                      <span style={{ fontSize: 9, fontWeight: isActive ? 600 : 400, letterSpacing: -0.1 }}>{tab.label}</span>
                      {cnt > 0 && (
                        <span style={{ position: "absolute", top: 6, right: "10%", minWidth: 15, height: 15, borderRadius: 99, background: IOS.red, color: "white", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                          {cnt > 9 ? "9+" : cnt}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ════ CHAT VIEW ════ */}
        {mobileView === "chat" && activeId && (
          <>
            {/* Navigation bar */}
            <div style={{ background: IOS.bg2, borderBottom: `1px solid ${IOS.sep}`, flexShrink: 0, paddingTop: "env(safe-area-inset-top, 0px)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px" }}>
                <button onClick={() => setMobileView("list")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: IOS.orange, display: "flex", alignItems: "center", gap: 2, fontSize: 15, padding: "4px 4px", flexShrink: 0 }}>
                  <ArrowLeft size={20} />
                  <span>Назад</span>
                </button>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0, justifyContent: "center" }}>
                  <Avatar name={active?.visitorName ?? "П"} size={32} />
                  <div style={{ minWidth: 0, flex: 1, maxWidth: "calc(100% - 42px)" }}>
                    <p style={{ fontWeight: 600, fontSize: 15, color: IOS.label, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {active?.visitorName ?? "Посетитель"}
                    </p>
                    <p style={{ fontSize: 11, color: STATUS_DOT[active?.status ?? "waiting"], fontWeight: 500, marginTop: 1 }}>
                      {STATUS_LABEL[active?.status ?? "waiting"]}
                    </p>
                  </div>
                </div>
                <div style={{ width: 60 }} />
              </div>

              {/* Action strip */}
              {active && (() => {
                const isExternal   = active.channel === "vk" || active.channel === "avito"
                const showAccept   = !isExternal && active.status === "waiting" && !takenByOther
                const showOperator = !isExternal && isMine && active.status === "active"
                const showReopen   = active.status === "closed"
                if (!showAccept && !showOperator && !showReopen && !takenByOther) return null
                return (
                  <div style={{ display: "flex", borderTop: `1px solid ${IOS.sep}` }}>
                    {showAccept && (
                      <button onClick={accept} style={{ flex: 1, padding: "11px 0", background: "none", border: "none", cursor: "pointer", color: IOS.green, fontSize: 14, fontWeight: 600 }}>
                        ✓ Принять диалог
                      </button>
                    )}
                    {showOperator && (
                      <>
                        <button onClick={postpone} style={{ flex: 1, padding: "11px 0", background: "none", border: "none", cursor: "pointer", color: IOS.blue, fontSize: 14, fontWeight: 500, borderRight: `1px solid ${IOS.sep}` }}>
                          Отложить 5 мин
                        </button>
                        <button onClick={close} style={{ flex: 1, padding: "11px 0", background: "none", border: "none", cursor: "pointer", color: IOS.red, fontSize: 14, fontWeight: 500 }}>
                          Закрыть чат
                        </button>
                      </>
                    )}
                    {showReopen && (
                      <button onClick={reopen} style={{ flex: 1, padding: "11px 0", background: "none", border: "none", cursor: "pointer", color: IOS.green, fontSize: 14, fontWeight: 500 }}>
                        Открыть снова
                      </button>
                    )}
                    {takenByOther && (
                      <p style={{ flex: 1, textAlign: "center", padding: "11px 0", fontSize: 13, color: IOS.label3 }}>
                        Взял {takenByOp?.name ?? "другой оператор"}
                      </p>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", background: IOS.bg, overscrollBehavior: "contain" }}>
              <div style={{ padding: "8px 14px 12px", boxSizing: "border-box", width: "100%", overflow: "hidden" }}>
                {messages.length === 0 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 0", color: IOS.label3, fontSize: 14 }}>Нет сообщений</div>
                )}
                {grouped.map(group => (
                  <div key={group.date}>
                    <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
                      <span style={{ fontSize: 12, color: IOS.label3, fontWeight: 500 }}>{group.date}</span>
                    </div>
                    {group.msgs.map((m, i) => {
                      const isOp = m.sender === "operator"
                      const prev = group.msgs[i - 1]
                      const showAv = !isOp && (!prev || prev.sender !== m.sender)
                      return (
                        <div key={m.id} style={{ marginBottom: 6 }}>
                          {/* Bubble row — оператор справа, клиент слева */}
                          <div style={{
                            display: "flex",
                            justifyContent: isOp ? "flex-end" : "flex-start",
                            alignItems: "flex-end",
                            gap: 6,
                          }}>
                            {!isOp && (
                              <div style={{ width: 26, height: 26, flexShrink: 0, opacity: showAv ? 1 : 0 }}>
                                <Avatar name={active?.visitorName ?? "П"} size={26} />
                              </div>
                            )}
                            <div style={{
                              maxWidth: "75%",
                              padding: "9px 14px",
                              borderRadius: isOp ? "18px 18px 5px 18px" : "18px 18px 18px 5px",
                              background: isOp ? IOS.orange : IOS.bg2,
                              color: IOS.label, fontSize: 15, lineHeight: 1.45,
                              wordBreak: "break-word",
                              overflowWrap: "break-word",
                              boxSizing: "border-box" as const,
                              minWidth: 0,
                            }}>
                              {m.text}
                              {m.attachmentUrl && (
                                <img src={m.attachmentUrl} alt="" style={{ maxWidth: "100%", height: "auto", borderRadius: 8, marginTop: m.text ? 6 : 0, display: "block" }} />
                              )}
                            </div>
                          </div>
                          {/* Время и статус прочтения */}
                          <div style={{
                            display: "flex", alignItems: "center", gap: 4,
                            marginTop: 3,
                            paddingLeft: isOp ? 0 : 32,
                            justifyContent: isOp ? "flex-end" : "flex-start",
                          }}>
                            <span style={{ fontSize: 11, color: IOS.label3 }}>{formatTime(m.createdAt)}</span>
                            {isOp && (m.isRead ? <CheckCheck size={12} color={IOS.blue} /> : <Check size={12} color={IOS.label3} />)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
              <div ref={bottomRef} />
            </div>

            {/* Quick replies */}
            {quickReplies.length > 0 && canWrite && (
              <div style={{ padding: "6px 12px", display: "flex", gap: 6, overflowX: "auto", borderTop: `1px solid ${IOS.sep}`, background: IOS.bg2, flexShrink: 0 }}>
                {quickReplies.map((qr, i) => (
                  <button key={i} onClick={() => send(qr)}
                    style={{ padding: "6px 14px", borderRadius: 99, border: `1px solid ${IOS.sep}`, background: IOS.bg3, color: IOS.label2, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {qr}
                  </button>
                ))}
              </div>
            )}

            {/* Input / status footer */}
            {active?.status === "closed" ? (
              <div style={{ padding: "12px 16px", background: IOS.bg2, borderTop: `1px solid ${IOS.sep}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}>
                <span style={{ fontSize: 14, color: IOS.label3 }}>Чат закрыт</span>
                <button onClick={reopen} style={{ background: "none", border: "none", cursor: "pointer", color: IOS.orange, fontSize: 15, fontWeight: 600 }}>Открыть</button>
              </div>
            ) : active?.status === "postponed" ? (
              <div style={{ padding: "12px 16px", background: IOS.bg2, borderTop: `1px solid ${IOS.sep}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}>
                <Clock size={15} color={IOS.blue} />
                <span style={{ fontSize: 14, color: IOS.blue }}>Отложен на 5 минут</span>
              </div>
            ) : canWrite ? (
              <div style={{ background: IOS.bg2, borderTop: `1px solid ${IOS.sep}`, flexShrink: 0, padding: "10px 12px", paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", background: IOS.bg3, borderRadius: 24, padding: "0 14px", minHeight: 44 }}>
                    <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input) } }}
                      placeholder="Сообщение..."
                      disabled={!isExternal && active?.status === "waiting" && !isMine}
                      style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 16, color: IOS.label, padding: "10px 0", minWidth: 0 }} />
                  </div>
                  <button onClick={() => send(input)} disabled={!input.trim() || sending}
                    style={{ width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer", background: input.trim() ? IOS.orange : IOS.bg4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}>
                    {sending
                      ? <div style={{ width: 15, height: 15, border: `2px solid rgba(255,255,255,0.3)`, borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      : <Send size={17} color={input.trim() ? "white" : IOS.label3} style={{ marginLeft: 1 }} />}
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
      DESKTOP (unchanged)
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
        <Clock size={15} color="#3B82F6" /><p style={{ fontSize: 13, color: "#1D4ED8" }}>Диалог отложен на 5 минут</p>
      </div>
    )
    if (!canWrite) return null
    return (
      <div style={{ padding: "12px 16px", background: "white", borderTop: "1px solid #F3F4F6" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F8F9FA", borderRadius: 14, padding: "8px 8px 8px 16px", border: "1.5px solid #E5E7EB" }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input) } }}
            placeholder={!isExternal && active?.status === "waiting" && !isMine ? "Сначала примите диалог..." : "Напишите ответ... (Enter — отправить)"}
            disabled={!isExternal && active?.status === "waiting" && !isMine}
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
          <button key={i} onClick={() => send(qr)} style={{ padding: "5px 12px", borderRadius: 99, border: "1px solid #E5E7EB", background: "transparent", color: "#374151", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>{qr}</button>
        ))}
      </div>
    )
  }

  const renderSessionItem = (s: Session) => {
    const isActive  = s.id === activeId
    const isSel     = selectedIds.has(s.id)
    const lastMsg   = s.messages?.[0]
    const isTakenOt = s.operatorId && s.operatorId !== currentOperator.id
    return (
      <button key={s.id} onClick={() => isSelecting ? toggleSelect(s.id) : openSession(s.id)}
        style={{ width: "100%", textAlign: "left", border: "none", cursor: "pointer", padding: "12px 16px", background: isSel ? "#FFF5EF" : isActive ? "#FFF5EF" : "transparent", borderLeft: (isSel || isActive) ? `3px solid ${color}` : "3px solid transparent", borderBottom: "1px solid #F3F4F6", transition: "all 0.12s", display: "flex", gap: 10, alignItems: "flex-start", opacity: isTakenOt && !isSelecting ? 0.55 : 1 }}>
        {isSelecting ? (
          <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 8, border: `2px solid ${isSel ? color : "#D1D5DB"}`, background: isSel ? color : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {isSel && <Check size={12} color="white" />}
          </div>
        ) : (
          <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, background: "#FFF5EF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color, position: "relative" }}>
            {(s.visitorName ?? "П")[0].toUpperCase()}
            <span style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", border: "2px solid white", background: STATUS_DOT[s.status] ?? "#9CA3AF" }} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 13, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.visitorName ?? "Посетитель"}</p>
              <ChannelBadge channel={s.channel} />
            </div>
            <span style={{ fontSize: 10, color: "#9CA3AF", flexShrink: 0 }}>{formatTime(s.updatedAt)}</span>
          </div>
          <p style={{ fontSize: 12, color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{lastMsg ? lastMsg.text : "Нет сообщений"}</p>
        </div>
        {!isSelecting && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            {(s.unreadCount ?? 0) > 0 && (
              <span style={{ width: 18, height: 18, borderRadius: 99, background: color, color: "white", fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {(s.unreadCount ?? 0) > 9 ? "9+" : s.unreadCount}
              </span>
            )}
            {s.status === "waiting" && !s.operatorId && (!s.channel || s.channel === "web") && (
              <button onClick={e => quickAccept(s.id, e)}
                style={{ padding: "3px 8px", borderRadius: 6, border: "none", background: "#16a34a", color: "white", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                Принять
              </button>
            )}
          </div>
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
          const isActive = filter === tab.key
          const cnt = tab.key === "waiting" ? totalUnread : 0
          const activeColor = tab.key === "vk" ? "#4da3ff" : tab.key === "avito" ? "#4cd67a" : "white"
          const iconColor = isActive ? activeColor : "rgba(255,255,255,0.35)"
          return (
            <button key={tab.key} onClick={() => { setFilter(tab.key); setActiveId(null); setMessages([]) }} title={tab.label}
              style={{ width: 44, height: 44, borderRadius: 10, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: isActive ? "rgba(255,255,255,0.12)" : "transparent", transition: "all 0.15s", position: "relative" }}>
              <Icon size={18} color={iconColor} />
              {cnt > 0 && <span style={{ position: "absolute", top: 6, right: 6, width: 14, height: 14, borderRadius: 99, background: "#ef4444", color: "white", fontSize: 8, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{cnt > 9 ? "9+" : cnt}</span>}
            </button>
          )
        })}
        <div style={{ flex: 1 }} />
        <button onClick={handleNotif} style={{ width: 44, height: 44, borderRadius: 10, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: notif ? "#4ade80" : "rgba(255,255,255,0.3)" }}>
          {notif ? <Bell size={18} /> : <BellOff size={18} />}
        </button>
        {canViewSettings && <a href="/settings" style={{ width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>
          <Settings2 size={18} />
        </a>}
        <button onClick={logout} style={{ width: 44, height: 44, borderRadius: 10, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>
          <LogOut size={18} />
        </button>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 14, overflow: "hidden", flexShrink: 0, position: "relative" }}>
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
          {filtered.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 4px" }}>
              <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>
                {isSelecting && selectedIds.size > 0 ? `Выбрано: ${selectedIds.size}` : ""}
              </span>
              {isSelecting
                ? <button onClick={exitSelect} style={{ background: "none", border: "none", cursor: "pointer", color: color, fontSize: 12, fontWeight: 600, padding: 0 }}>Отмена</button>
                : <button onClick={() => setIsSelecting(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 12, fontWeight: 500, padding: 0 }}>Выбрать</button>
              }
            </div>
          )}
          {filtered.length === 0
            ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 8, color: "#D1D5DB" }}><Inbox size={32} /><p style={{ fontSize: 13 }}>Пусто</p></div>
            : filtered.map(s => renderSessionItem(s))}
        </div>
        {isSelecting && (
          <div style={{ borderTop: "1px solid #F3F4F6", padding: "10px 12px", background: "white" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {filter !== "closed" && (
                <button onClick={() => bulkAction("active")} disabled={selectedIds.size === 0}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", background: selectedIds.size > 0 ? "#F0FDF4" : "#F9FAFB", color: selectedIds.size > 0 ? "#16A34A" : "#D1D5DB", fontWeight: 600, fontSize: 11, opacity: selectedIds.size === 0 ? 0.5 : 1 }}>
                  Принять
                </button>
              )}
              {filter !== "closed" && (
                <button onClick={() => bulkAction("postponed")} disabled={selectedIds.size === 0}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", background: selectedIds.size > 0 ? "#EFF6FF" : "#F9FAFB", color: selectedIds.size > 0 ? "#2563EB" : "#D1D5DB", fontWeight: 600, fontSize: 11, opacity: selectedIds.size === 0 ? 0.5 : 1 }}>
                  Отложить
                </button>
              )}
              {filter !== "closed" && (
                <button onClick={() => bulkAction("closed")} disabled={selectedIds.size === 0}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", background: selectedIds.size > 0 ? "#FEF2F2" : "#F9FAFB", color: selectedIds.size > 0 ? "#DC2626" : "#D1D5DB", fontWeight: 600, fontSize: 11, opacity: selectedIds.size === 0 ? 0.5 : 1 }}>
                  Закрыть
                </button>
              )}
              {filter === "closed" && (
                <button onClick={() => bulkAction("waiting")} disabled={selectedIds.size === 0}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", background: selectedIds.size > 0 ? "#F0FDF4" : "#F9FAFB", color: selectedIds.size > 0 ? "#16A34A" : "#D1D5DB", fontWeight: 600, fontSize: 11, opacity: selectedIds.size === 0 ? 0.5 : 1 }}>
                  Открыть
                </button>
              )}
            </div>
          </div>
        )}
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
          </div>
        ) : (
          <>
            <div style={{ padding: "0 20px", height: 60, background: "white", borderBottom: "1px solid #EAECF0", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FFF5EF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color, flexShrink: 0 }}>
                {(active?.visitorName ?? "П")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{active?.visitorName ?? "Посетитель"}</p>
                  <ChannelBadge channel={active?.channel} />
                </div>
                {active?.visitorPage && <p style={{ fontSize: 11, color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><Globe size={10} style={{ display: "inline", marginRight: 3 }} />{active.visitorPage}</p>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: STATUS_COLORS_LIGHT[active?.status ?? "waiting"]?.bg, color: STATUS_COLORS_LIGHT[active?.status ?? "waiting"]?.color }}>
                  {STATUS_LABEL[active?.status ?? "waiting"]}
                </span>
                {takenByOther && takenByOp && <span style={{ fontSize: 11, color: "#9CA3AF", background: "#F9FAFB", padding: "3px 8px", borderRadius: 8, border: "1px solid #E5E7EB" }}>Взял {takenByOp.name}</span>}
                {(() => {
                  const isExternal = active?.channel === "vk" || active?.channel === "avito"
                  return (<>
                    {(!isExternal && active?.status === "waiting" && !takenByOther) && <button onClick={accept} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, background: "#16a34a", color: "white", fontWeight: 600, fontSize: 12, border: "none", cursor: "pointer" }}>Принять <ChevronRight size={14} /></button>}
                    {(!isExternal && isMine && active?.status !== "closed") && (
                      <>
                        <button onClick={postpone} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10, border: "1px solid #BFDBFE", background: "transparent", color: "#2563eb", fontSize: 12, fontWeight: 500, cursor: "pointer" }}><Clock size={13} /> 5 мин</button>
                        <button onClick={close} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10, border: "1px solid #FECACA", background: "transparent", color: "#dc2626", fontSize: 12, fontWeight: 500, cursor: "pointer" }}><XCircle size={13} /> Закрыть</button>
                      </>
                    )}
                  </>)
                })()}
                {active?.status === "closed" && <button onClick={reopen} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10, border: "1px solid #BBF7D0", background: "transparent", color: "#16a34a", fontSize: 12, fontWeight: 500, cursor: "pointer" }}><RotateCcw size={13} /> Открыть</button>}
                <button onClick={() => setShowInfo(v => !v)} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #E5E7EB", background: showInfo ? "#F9FAFB" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}><User size={15} /></button>
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
                  <InfoRow icon={<Hash size={13} />} label="ID" value={active.id.slice(0, 8) + "…"} mono />
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
        <p style={{ fontSize: 12, color: "#374151", fontWeight: 500, fontFamily: mono ? "monospace" : "inherit", overflow: truncate ? "hidden" : "visible", textOverflow: "ellipsis", whiteSpace: truncate ? "nowrap" : "normal" }}>{value}</p>
      </div>
    </div>
  )
}
