"use client"

import { useState, useEffect, useLayoutEffect } from "react"
import {
  MessageCircle, ArrowLeft, Users, Settings2, Palette,
  Plus, Trash2, Edit3, Save, X, Eye, EyeOff,
  Check, Loader, Circle, Clock, ShieldCheck, Zap, ChevronRight, Radio,
} from "lucide-react"

interface Operator {
  id: string; name: string; email: string; avatar: string | null
  isOnline: boolean; lastSeenAt: string | null; createdAt: string
  canManageSettings: boolean; canManageOperators: boolean; canManageChannels: boolean; canManageReplies: boolean
}
interface ChatSettings {
  greeting: string; offlineText: string; primaryColor: string
  quickReplies: string[]; operatorName: string; operatorAvatar: string | null
}
type QuickReply = { name: string; text: string }
function parseReplies(raw: string[]): QuickReply[] {
  return raw.map(r => { try { const p = JSON.parse(r); if (p?.name !== undefined) return p } catch {} return { name: r, text: r } })
}
function serializeReplies(list: QuickReply[]): string[] {
  return list.map(r => JSON.stringify(r))
}

const COLORS = ["#F26522","#6366F1","#0EA5E9","#10B981","#EF4444","#F59E0B","#8B5CF6","#EC4899","#14B8A6","#1a1a1a"]
const TABS = [
  { key: "widget",    label: "Виджет",    icon: Palette,     perm: "canManageSettings"  as const },
  { key: "operators", label: "Операторы", icon: Users,       perm: "canManageOperators" as const },
  { key: "channels",  label: "Каналы",    icon: Radio,       perm: "canManageChannels"  as const },
  { key: "replies",   label: "Ответы",    icon: Zap,         perm: "canManageReplies"   as const },
  { key: "account",   label: "Аккаунт",  icon: ShieldCheck, perm: null },
]

type Perms = { canManageSettings: boolean; canManageOperators: boolean; canManageChannels: boolean; canManageReplies: boolean }

const IOS = {
  bg:       "#000000",
  bg2:      "#1C1C1E",
  bg3:      "#2C2C2E",
  bg4:      "#3A3A3C",
  label:    "#FFFFFF",
  label2:   "rgba(235,235,245,0.6)",
  label3:   "rgba(235,235,245,0.3)",
  sep:      "rgba(84,84,88,0.65)",
  orange:   "#F26522",
  green:    "#30D158",
  blue:     "#0A84FF",
  red:      "#FF453A",
  tabBarBg: "rgba(28,28,30,0.94)",
}

const AVATAR_COLORS = [IOS.orange, IOS.blue, IOS.green, "#FF9F0A", IOS.red, "#BF5AF2", "#FF375F", "#32ADE6"]
function avatarColor(name: string) { return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length] }

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: avatarColor(name), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: Math.round(size * 0.38), color: "white" }}>
      {(name ?? "П")[0].toUpperCase()}
    </div>
  )
}

function Section({ label, footer, children }: { label?: string; footer?: string; children: React.ReactNode }) {
  return (
    <div style={{ margin: "28px 0 0" }}>
      {label && <p style={{ fontSize: 12, fontWeight: 500, color: IOS.label3, textTransform: "uppercase", letterSpacing: "0.04em", padding: "0 20px", marginBottom: 8 }}>{label}</p>}
      <div style={{ background: IOS.bg2, overflow: "hidden" }}>
        {children}
      </div>
      {footer && <p style={{ fontSize: 12, color: IOS.label3, padding: "8px 20px" }}>{footer}</p>}
    </div>
  )
}

function Row({ label, value, children, last }: { label?: string; value?: string; children?: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px", borderBottom: last ? "none" : `1px solid ${IOS.sep}` }}>
      {label && <span style={{ fontSize: 15, color: IOS.label, minWidth: 80, flexShrink: 0, padding: "12px 0" }}>{label}</span>}
      {children ?? <span style={{ fontSize: 15, color: IOS.label2, flex: 1, textAlign: label ? "right" : "left", padding: "12px 0" }}>{value}</span>}
    </div>
  )
}

export function SettingsApp({
  currentOperator,
  initialSettings,
  initialOperators,
}: {
  currentOperator: { id: string; name: string; email: string; avatar: string | null; workspaceId: string } & Perms
  initialSettings: ChatSettings | null
  initialOperators: Operator[]
}) {
  const visibleTabs = TABS.filter(t => !t.perm || currentOperator[t.perm])
  const [tab,      setTab]     = useState(() => visibleTabs[0]?.key ?? "account")
  const [isMobile, setIsMobile] = useState(false)

  useLayoutEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  const [greeting,     setGreeting]     = useState(initialSettings?.greeting     ?? "Здравствуйте! Чем могу помочь? 😊")
  const [offlineText,  setOfflineText]  = useState(initialSettings?.offlineText  ?? "Мы сейчас офлайн. Оставьте сообщение!")
  const [color,        setColor]        = useState(initialSettings?.primaryColor ?? "#F26522")
  const [opName,       setOpName]       = useState(initialSettings?.operatorName ?? "Поддержка")
  const [savingWidget, setSavingWidget] = useState(false)
  const [savedWidget,  setSavedWidget]  = useState(false)

  const [replies,       setReplies]       = useState<QuickReply[]>(() => parseReplies(initialSettings?.quickReplies ?? []))
  const [newName,      setNewName]       = useState("")
  const [newText,      setNewText]       = useState("")
  const [editIdx,       setEditIdx]       = useState<number | null>(null)
  const [editName,      setEditName]      = useState("")
  const [editText,      setEditText]      = useState("")
  const [savingReplies, setSavingReplies] = useState(false)
  const [savedReplies,  setSavedReplies]  = useState(false)

  const [operators,   setOperators]   = useState<Operator[]>(initialOperators)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newOpName,   setNewOpName]   = useState("")
  const [newEmail,    setNewEmail]    = useState("")
  const [newPass,     setNewPass]     = useState("")
  const [showPass,    setShowPass]    = useState(false)
  const [addingOp,    setAddingOp]    = useState(false)
  const [addError,    setAddError]    = useState("")
  const [newPerms,    setNewPerms]    = useState<Perms>({ canManageSettings: false, canManageOperators: false, canManageChannels: false, canManageReplies: false })
  const [editPermId,  setEditPermId]  = useState<string | null>(null)
  const [editPerms,   setEditPerms]   = useState<Perms>({ canManageSettings: false, canManageOperators: false, canManageChannels: false, canManageReplies: false })
  const [savingPerm,  setSavingPerm]  = useState(false)

  const [myName,     setMyName]     = useState(currentOperator.name)
  const [myEmail,    setMyEmail]    = useState(currentOperator.email)
  const [myPass,     setMyPass]     = useState("")
  const [myPassConf, setMyPassConf] = useState("")
  const [showMyPass, setShowMyPass] = useState(false)
  const [savingMe,   setSavingMe]   = useState(false)
  const [savedMe,    setSavedMe]    = useState(false)
  const [meError,    setMeError]    = useState("")

  async function saveWidget() {
    setSavingWidget(true)
    await fetch("/api/workspace/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ greeting, offlineText, primaryColor: color, operatorName: opName }) })
    setSavingWidget(false); setSavedWidget(true)
    setTimeout(() => setSavedWidget(false), 2500)
  }

  async function saveReplies(list: QuickReply[]) {
    setSavingReplies(true)
    await fetch("/api/workspace/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quickReplies: serializeReplies(list) }) })
    setSavingReplies(false); setSavedReplies(true)
    setTimeout(() => setSavedReplies(false), 2000)
  }

  function addReply() {
    if (!newName.trim() || !newText.trim()) return
    const item: QuickReply = { name: newName.trim(), text: newText.trim() }
    const list = [...replies, item]
    setReplies(list); setNewName(""); setNewText(""); saveReplies(list)
  }

  function removeReply(i: number) {
    const list = replies.filter((_, idx) => idx !== i)
    setReplies(list); saveReplies(list)
  }

  function startEdit(i: number) { setEditIdx(i); setEditName(replies[i].name); setEditText(replies[i].text) }
  function saveEdit() {
    if (editIdx === null || !editName.trim() || !editText.trim()) return
    const list = replies.map((r, i) => i === editIdx ? { name: editName.trim(), text: editText.trim() } : r)
    setReplies(list); setEditIdx(null); saveReplies(list)
  }

  async function addOperator() {
    if (!newOpName.trim() || !newEmail.trim() || !newPass.trim()) { setAddError("Заполните все поля"); return }
    setAddingOp(true); setAddError("")
    const r = await fetch("/api/operators", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newOpName, email: newEmail, password: newPass, ...newPerms }) })
    const data = await r.json()
    if (!r.ok) { setAddError(data.error || "Ошибка"); setAddingOp(false); return }
    setOperators(prev => [...prev, { ...data, isOnline: false, lastSeenAt: null, createdAt: new Date().toISOString(), ...newPerms }])
    setNewOpName(""); setNewEmail(""); setNewPass(""); setShowAddForm(false); setAddingOp(false)
    setNewPerms({ canManageSettings: false, canManageOperators: false, canManageChannels: false, canManageReplies: false })
  }

  async function savePerms(id: string, perms: Perms) {
    setSavingPerm(true)
    const r = await fetch(`/api/operators/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(perms) })
    if (r.ok) {
      setOperators(prev => prev.map(o => o.id === id ? { ...o, ...perms } : o))
      setEditPermId(null)
    }
    setSavingPerm(false)
  }

  async function deleteOperator(id: string) {
    if (!confirm("Удалить оператора?")) return
    const r = await fetch(`/api/operators/${id}`, { method: "DELETE" })
    if (r.ok) setOperators(prev => prev.filter(o => o.id !== id))
  }

  async function saveMe() {
    setMeError("")
    if (myPass && myPass !== myPassConf) { setMeError("Пароли не совпадают"); return }
    setSavingMe(true)
    const body: Record<string, string> = { name: myName, email: myEmail }
    if (myPass) body.password = myPass
    await fetch(`/api/operators/${currentOperator.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    setSavingMe(false); setSavedMe(true); setMyPass(""); setMyPassConf("")
    setTimeout(() => setSavedMe(false), 2500)
  }

  /* ══════════════════════════════════════
      MOBILE — iOS native dark style
  ══════════════════════════════════════ */
  if (isMobile) {
    const inputStyle: React.CSSProperties = {
      width: "100%", padding: "12px 14px", borderRadius: 0,
      border: "none", borderBottom: `1px solid ${IOS.sep}`,
      background: "transparent", fontSize: 16, outline: "none",
      minHeight: 44, color: IOS.label, boxSizing: "border-box",
    }
    const textareaStyle: React.CSSProperties = {
      ...inputStyle, resize: "vertical" as const, fontFamily: "inherit", minHeight: 72,
      borderBottom: "none", borderRadius: 0,
    }

    const renderContent = () => {
      /* ── WIDGET ── */
      if (tab === "widget") return (
        <div>
          <Section label="Имя и тексты">
            <Row label="Имя">
              <input value={opName} onChange={e => setOpName(e.target.value)} placeholder="Поддержка"
                style={{ ...inputStyle, flex: 1, textAlign: "right", borderBottom: "none", padding: "12px 0" }} />
            </Row>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${IOS.sep}` }}>
              <p style={{ fontSize: 12, color: IOS.label3, marginBottom: 8 }}>ПРИВЕТСТВИЕ</p>
              <textarea value={greeting} onChange={e => setGreeting(e.target.value)} rows={3}
                style={textareaStyle} />
            </div>
            <div style={{ padding: "12px 16px" }}>
              <p style={{ fontSize: 12, color: IOS.label3, marginBottom: 8 }}>ОФЛАЙН-ТЕКСТ</p>
              <textarea value={offlineText} onChange={e => setOfflineText(e.target.value)} rows={2}
                style={textareaStyle} />
            </div>
          </Section>

          <Section label="Цвет виджета">
            <div style={{ padding: "16px", display: "flex", gap: 10, flexWrap: "wrap" }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  style={{ width: 36, height: 36, borderRadius: "50%", background: c, border: color === c ? `3px solid ${IOS.label}` : "3px solid transparent", cursor: "pointer", outline: "none", boxSizing: "border-box" }} />
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", padding: 0, background: "transparent" }} />
                <span style={{ fontSize: 13, color: IOS.label3, fontFamily: "monospace" }}>{color}</span>
              </div>
            </div>
            {/* preview */}
            <div style={{ margin: "0 16px 16px", background: IOS.bg3, borderRadius: 12, padding: 14, position: "relative", minHeight: 70 }}>
              <p style={{ fontSize: 11, color: IOS.label3, marginBottom: 10 }}>ПРЕДПРОСМОТР</p>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MessageCircle size={20} color="white" />
                </div>
              </div>
              <div style={{ position: "absolute", bottom: 58, right: 10, background: color, color: "white", borderRadius: "10px 10px 2px 10px", padding: "7px 12px", fontSize: 12, maxWidth: "72%" }}>
                {greeting.slice(0, 40)}{greeting.length > 40 ? "…" : ""}
              </div>
            </div>
          </Section>

          <div style={{ padding: "24px 16px 8px" }}>
            <button onClick={saveWidget} disabled={savingWidget}
              style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", background: savedWidget ? IOS.green : IOS.orange, color: "white", fontWeight: 600, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: savingWidget ? 0.7 : 1 }}>
              {savingWidget ? <><Loader size={16} style={{ animation: "spin 0.7s linear infinite" }} /> Сохраняю...</>
                : savedWidget ? <><Check size={16} /> Сохранено</>
                : "Сохранить"}
            </button>
          </div>
        </div>
      )

      /* ── OPERATORS ── */
      if (tab === "operators") return (
        <div>
          <Section label={`Операторы · ${operators.length}`}>
            {operators.map((op, idx) => (
              <div key={op.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: (editPermId !== op.id && idx === operators.length - 1) ? "none" : `1px solid ${IOS.sep}` }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <Avatar name={op.name} size={40} />
                  <span style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: "50%", background: op.isOnline ? IOS.green : IOS.bg4, border: `2px solid ${IOS.bg2}` }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <p style={{ fontWeight: 600, fontSize: 15, color: IOS.label }}>{op.name}</p>
                    {op.id === currentOperator.id && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: `${IOS.orange}25`, color: IOS.orange }}>ВЫ</span>}
                  </div>
                  <p style={{ fontSize: 13, color: IOS.label3, marginTop: 1 }}>
                    {op.isOnline ? <span style={{ color: IOS.green }}>Онлайн</span> : op.email}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
                    {op.canManageSettings  && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99, background: `${IOS.orange}22`, color: IOS.orange }}>Настройки</span>}
                    {op.canManageOperators && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99, background: `${IOS.blue}22`, color: IOS.blue }}>Операторы</span>}
                    {op.canManageChannels  && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99, background: `${IOS.green}22`, color: IOS.green }}>Каналы</span>}
                    {op.canManageReplies   && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99, background: `${IOS.label3}`, color: IOS.label }}>Ответы</span>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {op.id !== currentOperator.id && currentOperator.canManageOperators && (
                    <button onClick={() => {
                      if (editPermId === op.id) { setEditPermId(null); return }
                      setEditPermId(op.id)
                      setEditPerms({ canManageSettings: op.canManageSettings, canManageOperators: op.canManageOperators, canManageChannels: op.canManageChannels, canManageReplies: op.canManageReplies })
                    }} style={{ background: "none", border: "none", cursor: "pointer", color: editPermId === op.id ? IOS.orange : IOS.label3, padding: 4 }}>
                      <Edit3 size={17} />
                    </button>
                  )}
                  {op.id !== currentOperator.id && currentOperator.canManageOperators && (
                    <button onClick={() => deleteOperator(op.id)} style={{ background: "none", border: "none", cursor: "pointer", color: IOS.red, padding: 4 }}>
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
              {editPermId === op.id && (
                <div style={{ background: IOS.bg3, padding: "12px 16px", borderTop: `1px solid ${IOS.sep}` }}>
                  <p style={{ fontSize: 11, color: IOS.label3, marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Права доступа</p>
                  {([
                    { key: "canManageSettings",  label: "Настройки виджета" },
                    { key: "canManageOperators", label: "Управление операторами" },
                    { key: "canManageChannels",  label: "Каналы (VK, Авито, Telegram)" },
                    { key: "canManageReplies",   label: "Быстрые ответы" },
                  ] as { key: keyof Perms; label: string }[]).map(p => (
                    <label key={p.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", cursor: "pointer" }}>
                      <input type="checkbox" checked={editPerms[p.key]} onChange={e => setEditPerms(prev => ({ ...prev, [p.key]: e.target.checked }))}
                        style={{ width: 18, height: 18, accentColor: IOS.orange, cursor: "pointer" }} />
                      <span style={{ fontSize: 14, color: IOS.label }}>{p.label}</span>
                    </label>
                  ))}
                  <button onClick={() => savePerms(op.id, editPerms)} disabled={savingPerm}
                    style={{ marginTop: 10, width: "100%", padding: "10px", borderRadius: 8, border: "none", cursor: "pointer", background: IOS.orange, color: "white", fontWeight: 600, fontSize: 14, opacity: savingPerm ? 0.7 : 1 }}>
                    {savingPerm ? "Сохраняю..." : "Сохранить права"}
                  </button>
                </div>
              )}
              </div>
            ))}
          </Section>

          <div style={{ padding: "16px 16px 8px" }}>
            <button onClick={() => { setShowAddForm(v => !v); setAddError("") }}
              style={{ width: "100%", padding: "14px", borderRadius: 12, border: `1px solid ${showAddForm ? IOS.sep : IOS.orange}`, cursor: "pointer", background: showAddForm ? IOS.bg2 : "transparent", color: showAddForm ? IOS.label2 : IOS.orange, fontWeight: 600, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {showAddForm ? <><X size={16} /> Отмена</> : <><Plus size={16} /> Добавить оператора</>}
            </button>
          </div>

          {showAddForm && (
            <Section label="Новый оператор">
              <Row label="Имя" last={false}>
                <input value={newOpName} onChange={e => setNewOpName(e.target.value)} placeholder="Иван Петров"
                  style={{ ...inputStyle, flex: 1, textAlign: "right", borderBottom: "none", padding: "12px 0" }} />
              </Row>
              <Row label="Email" last={false}>
                <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="ivan@ex.com" type="email"
                  style={{ ...inputStyle, flex: 1, textAlign: "right", borderBottom: "none", padding: "12px 0" }} />
              </Row>
              <Row label="Пароль" last>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                  <input value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Мин. 6 символов" type={showPass ? "text" : "password"}
                    style={{ ...inputStyle, textAlign: "right", borderBottom: "none", padding: "12px 0", width: "auto", flex: 1 }} />
                  <button onClick={() => setShowPass(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: IOS.label3, padding: "0 0 0 8px" }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Row>
              <div style={{ padding: "12px 16px", borderTop: `1px solid ${IOS.sep}` }}>
                <p style={{ fontSize: 11, color: IOS.label3, marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Права доступа</p>
                {([
                  { key: "canManageSettings",  label: "Настройки виджета" },
                  { key: "canManageOperators", label: "Управление операторами" },
                  { key: "canManageChannels",  label: "Каналы (VK, Авито, Telegram)" },
                  { key: "canManageReplies",   label: "Быстрые ответы" },
                ] as { key: keyof Perms; label: string }[]).map(p => (
                  <label key={p.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", cursor: "pointer" }}>
                    <input type="checkbox" checked={newPerms[p.key]} onChange={e => setNewPerms(prev => ({ ...prev, [p.key]: e.target.checked }))}
                      style={{ width: 18, height: 18, accentColor: IOS.orange, cursor: "pointer" }} />
                    <span style={{ fontSize: 14, color: IOS.label }}>{p.label}</span>
                  </label>
                ))}
              </div>
              {addError && <p style={{ fontSize: 13, color: IOS.red, padding: "8px 16px" }}>{addError}</p>}
              <div style={{ padding: "12px 16px" }}>
                <button onClick={addOperator} disabled={addingOp}
                  style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", cursor: "pointer", background: IOS.orange, color: "white", fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: addingOp ? 0.7 : 1 }}>
                  {addingOp ? <><Loader size={15} style={{ animation: "spin 0.7s linear infinite" }} /> Создаю...</> : <><Plus size={15} /> Создать</>}
                </button>
              </div>
            </Section>
          )}
        </div>
      )

      /* ── REPLIES ── */
      if (tab === "replies") return (
        <div>
          <Section label="Добавить">
            <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Название (напр.: Трейд-ин)"
                style={{ ...inputStyle, borderBottom: "none", padding: "10px 0", fontSize: 15 }} />
              <div style={{ height: 1, background: IOS.sep }} />
              <div style={{ display: "flex", alignItems: "center" }}>
                <input value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => e.key === "Enter" && addReply()}
                  placeholder="Текст ответа для клиента"
                  style={{ ...inputStyle, flex: 1, borderBottom: "none", padding: "10px 0", fontSize: 14, color: IOS.label2 }} />
                <button onClick={addReply} disabled={!newName.trim() || !newText.trim()}
                  style={{ background: "none", border: "none", cursor: "pointer", color: (newName.trim() && newText.trim()) ? IOS.orange : IOS.label3, padding: "0 0 0 8px", flexShrink: 0 }}>
                  <Plus size={22} />
                </button>
              </div>
            </div>
          </Section>

          {savedReplies && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "12px 16px", color: IOS.green, fontSize: 13, fontWeight: 500 }}>
              <Check size={14} /> Сохранено
            </div>
          )}

          {replies.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0", gap: 10 }}>
              <Zap size={40} color={IOS.label3} />
              <p style={{ color: IOS.label3, fontSize: 15 }}>Нет быстрых ответов</p>
            </div>
          ) : (
            <Section label={`Быстрые ответы · ${replies.length}`}>
              {replies.map((r, i) => (
                <div key={i} style={{ padding: "0 16px", borderBottom: i === replies.length - 1 ? "none" : `1px solid ${IOS.sep}` }}>
                  {editIdx === i ? (
                    <div style={{ padding: "10px 0", display: "flex", flexDirection: "column", gap: 6 }}>
                      <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                        placeholder="Название"
                        style={{ ...inputStyle, borderBottom: "none", padding: "8px 0", fontSize: 15 }} />
                      <div style={{ height: 1, background: IOS.sep }} />
                      <input value={editText} onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditIdx(null) }}
                        placeholder="Текст ответа"
                        style={{ ...inputStyle, borderBottom: "none", padding: "8px 0", fontSize: 14, color: IOS.label2 }} />
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={saveEdit} style={{ background: "none", border: "none", cursor: "pointer", color: IOS.green }}><Check size={18} /></button>
                        <button onClick={() => setEditIdx(null)} style={{ background: "none", border: "none", cursor: "pointer", color: IOS.label3 }}><X size={18} /></button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
                      <Zap size={14} color={IOS.orange} style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 15, color: IOS.label, fontWeight: 600 }}>{r.name}</p>
                        <p style={{ fontSize: 12, color: IOS.label3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.text}</p>
                      </div>
                      <button onClick={() => startEdit(i)} style={{ background: "none", border: "none", cursor: "pointer", color: IOS.label3, padding: "4px 6px", flexShrink: 0 }}><Edit3 size={15} /></button>
                      <button onClick={() => removeReply(i)} style={{ background: "none", border: "none", cursor: "pointer", color: IOS.red, padding: "4px 0", flexShrink: 0 }}><Trash2 size={15} /></button>
                    </div>
                  )}
                </div>
              ))}
            </Section>
          )}
        </div>
      )

      /* ── CHANNELS ── */
      if (tab === "channels") return <ChannelsTab ios={IOS} inputStyle={inputStyle} />

      /* ── ACCOUNT ── */
      if (tab === "account") return (
        <div>
          {/* Profile header */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 0 20px" }}>
            <div style={{ position: "relative" }}>
              <Avatar name={currentOperator.name} size={72} />
              <span style={{ position: "absolute", bottom: 3, right: 3, width: 14, height: 14, borderRadius: "50%", background: IOS.green, border: `2px solid ${IOS.bg}` }} />
            </div>
            <p style={{ color: IOS.label, fontWeight: 700, fontSize: 20, marginTop: 12 }}>{currentOperator.name}</p>
            <p style={{ color: IOS.label3, fontSize: 14, marginTop: 4 }}>{currentOperator.email}</p>
          </div>

          <Section label="Основная информация">
            <Row label="Имя" last={false}>
              <input value={myName} onChange={e => setMyName(e.target.value)} placeholder="Ваше имя"
                style={{ ...inputStyle, flex: 1, textAlign: "right", borderBottom: "none", padding: "12px 0" }} />
            </Row>
            <Row label="Email" last>
              <input value={myEmail} onChange={e => setMyEmail(e.target.value)} placeholder="email@example.com" type="email"
                style={{ ...inputStyle, flex: 1, textAlign: "right", borderBottom: "none", padding: "12px 0" }} />
            </Row>
          </Section>

          <Section label="Смена пароля" footer="Оставьте поля пустыми, чтобы не менять пароль">
            <Row label="Новый пароль" last={false}>
              <input value={myPass} onChange={e => setMyPass(e.target.value)} placeholder="Новый пароль" type={showMyPass ? "text" : "password"}
                style={{ ...inputStyle, flex: 1, textAlign: "right", borderBottom: "none", padding: "12px 0" }} />
              <button onClick={() => setShowMyPass(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: IOS.label3 }}>
                {showMyPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </Row>
            <Row label="Повторите" last>
              <input value={myPassConf} onChange={e => setMyPassConf(e.target.value)} placeholder="Повторите пароль" type="password"
                style={{ ...inputStyle, flex: 1, textAlign: "right", borderBottom: "none", padding: "12px 0" }} />
            </Row>
            {meError && <p style={{ fontSize: 13, color: IOS.red, padding: "8px 16px" }}>{meError}</p>}
          </Section>

          <div style={{ padding: "24px 16px 8px" }}>
            <button onClick={saveMe} disabled={savingMe}
              style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", background: savedMe ? IOS.green : IOS.orange, color: "white", fontWeight: 600, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: savingMe ? 0.7 : 1 }}>
              {savingMe ? <><Loader size={16} style={{ animation: "spin 0.7s linear infinite" }} /> Сохраняю...</>
                : savedMe ? <><Check size={16} /> Сохранено</>
                : "Сохранить"}
            </button>
          </div>
        </div>
      )

      return null
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100svh", background: IOS.bg, overflow: "hidden" }}>
        {/* Nav bar */}
        <div style={{ background: IOS.bg2, borderBottom: `1px solid ${IOS.sep}`, flexShrink: 0, paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 16px" }}>
            <a href="/" style={{ color: IOS.orange, display: "flex", alignItems: "center", gap: 2, fontSize: 15, textDecoration: "none", flexShrink: 0 }}>
              <ArrowLeft size={20} /> Чаты
            </a>
            <div style={{ flex: 1, textAlign: "center" }}>
              <p style={{ color: IOS.label, fontWeight: 600, fontSize: 17, letterSpacing: -0.3 }}>Настройки</p>
            </div>
            <div style={{ width: 60 }} />
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {renderContent()}
          <div style={{ height: 16 }} />
        </div>

        {/* Tab bar */}
        <div style={{ background: IOS.tabBarBg, borderTop: `1px solid ${IOS.sep}`, display: "flex", flexShrink: 0, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}>
          {visibleTabs.map(t => {
            const Icon = t.icon
            const isActive = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ flex: 1, padding: "10px 0 8px", border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: isActive ? IOS.orange : IOS.label3 }}>
                <Icon size={22} />
                <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>{t.label}</span>
              </button>
            )
          })}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  /* ══════════════════════════════════════
      DESKTOP (unchanged)
  ══════════════════════════════════════ */
  return (
    <div style={{ display: "flex", height: "100vh", background: "#F7F8FA", overflow: "hidden" }}>
      <aside style={{ width: 240, background: "#1C1C28", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 12, marginBottom: 16 }}>
            <ArrowLeft size={14} /> Назад к чатам
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageCircle size={16} color="white" />
            </div>
            <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>Настройки</span>
          </div>
        </div>
        <nav style={{ padding: "8px 8px", flex: 1 }}>
          {visibleTabs.map(t => {
            const Icon = t.icon
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ width: "100%", textAlign: "left", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, marginBottom: 2, background: tab === t.key ? "rgba(255,255,255,0.1)" : "transparent", color: tab === t.key ? "white" : "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: tab === t.key ? 600 : 400, transition: "all 0.12s" }}>
                <Icon size={15} />
                {t.label === "Ответы" ? "Быстрые ответы" : t.label === "Аккаунт" ? "Мой аккаунт" : t.label}
              </button>
            )
          })}
        </nav>
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
            {currentOperator.name[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: "white", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentOperator.name}</p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentOperator.email}</p>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
        {tab === "widget" && (
          <div style={{ maxWidth: 640 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 4 }}>Настройки виджета</h1>
            <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 28 }}>Внешний вид и текст чата на сайте</p>
            <Card title="Имя и приветствие">
              <DLabel>Имя оператора / команды</DLabel><DInput value={opName} onChange={setOpName} placeholder="Поддержка" />
              <DLabel>Приветственное сообщение</DLabel><DTextarea value={greeting} onChange={setGreeting} placeholder="Здравствуйте! Чем могу помочь?" />
              <DLabel>Текст когда офлайн</DLabel><DTextarea value={offlineText} onChange={setOfflineText} placeholder="Мы сейчас офлайн..." />
            </Card>
            <Card title="Цвет виджета">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)}
                    style={{ width: 36, height: 36, borderRadius: "50%", background: c, border: color === c ? "3px solid #111" : "3px solid transparent", cursor: "pointer", outline: "none", boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : "none" }} />
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", padding: 0 }} />
                  <span style={{ fontSize: 13, color: "#6B7280", fontFamily: "monospace" }}>{color}</span>
                </div>
              </div>
              <div style={{ marginTop: 20, padding: 16, background: "#F0F2F5", borderRadius: 12, position: "relative", minHeight: 80 }}>
                <p style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Предпросмотр</p>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 16px ${color}55` }}>
                    <MessageCircle size={22} color="white" />
                  </div>
                </div>
                <div style={{ position: "absolute", bottom: 70, right: 16, background: color, color: "white", borderRadius: "12px 12px 2px 12px", padding: "8px 14px", fontSize: 13, maxWidth: 200 }}>
                  {greeting.slice(0, 40)}{greeting.length > 40 ? "…" : ""}
                </div>
              </div>
            </Card>
            <div style={{ display: "flex", justifyContent: "flex-end" }}><DSaveBtn loading={savingWidget} saved={savedWidget} onClick={saveWidget} /></div>
          </div>
        )}

        {tab === "operators" && (
          <div style={{ maxWidth: 680 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>Операторы</h1>
              <button onClick={() => { setShowAddForm(true); setAddError("") }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, background: color, color: "white", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer" }}>
                <Plus size={15} /> Добавить
              </button>
            </div>
            <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>{operators.length} {operators.length === 1 ? "оператор" : operators.length < 5 ? "оператора" : "операторов"}</p>
            {showAddForm && (
              <div style={{ background: "white", borderRadius: 14, padding: 24, marginBottom: 20, border: "1.5px solid #E5E7EB", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h3 style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>Новый оператор</h3>
                  <button onClick={() => setShowAddForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}><X size={18} /></button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div><DLabel>Имя</DLabel><DInput value={newOpName} onChange={setNewOpName} placeholder="Иван Петров" /></div>
                  <div><DLabel>Email</DLabel><DInput value={newEmail} onChange={setNewEmail} placeholder="ivan@example.com" type="email" /></div>
                </div>
                <DLabel>Пароль</DLabel>
                <div style={{ position: "relative" }}>
                  <DInput value={newPass} onChange={setNewPass} placeholder="Минимум 6 символов" type={showPass ? "text" : "password"} />
                  <button onClick={() => setShowPass(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {addError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{addError}</p>}
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button onClick={addOperator} disabled={addingOp} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 10, background: color, color: "white", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", opacity: addingOp ? 0.7 : 1 }}>
                    {addingOp ? <Loader size={14} style={{ animation: "spin 0.7s linear infinite" }} /> : <Plus size={14} />} Создать
                  </button>
                  <button onClick={() => setShowAddForm(false)} style={{ padding: "9px 20px", borderRadius: 10, background: "transparent", color: "#6B7280", fontWeight: 500, fontSize: 13, border: "1px solid #E5E7EB", cursor: "pointer" }}>Отмена</button>
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {operators.map(op => (
                <div key={op.id} style={{ background: "white", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, border: "1px solid #F3F4F6", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: op.id === currentOperator.id ? color : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: op.id === currentOperator.id ? "white" : "#6B7280", flexShrink: 0, position: "relative" }}>
                    {op.avatar ? <img src={op.avatar} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} alt="" /> : op.name[0].toUpperCase()}
                    <span style={{ position: "absolute", bottom: 1, right: 1, width: 12, height: 12, borderRadius: "50%", background: op.isOnline ? "#4ade80" : "#D1D5DB", border: "2px solid white" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{op.name}</p>
                      {op.id === currentOperator.id && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: `${color}18`, color }}>ВЫ</span>}
                      {op.isOnline ? <span style={{ fontSize: 10, fontWeight: 600, color: "#16a34a" }}>Онлайн</span>
                        : <span style={{ fontSize: 10, color: "#9CA3AF" }}>{op.lastSeenAt ? `Был ${new Date(op.lastSeenAt).toLocaleDateString("ru-RU")}` : "Не заходил"}</span>}
                    </div>
                    <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{op.email}</p>
                  </div>
                  {op.id !== currentOperator.id && (
                    <button onClick={() => deleteOperator(op.id)} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #FEE2E2", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444" }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "channels" && (
          <div style={{ maxWidth: 600 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 4 }}>Каналы</h1>
            <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 28 }}>Подключите Telegram и VK — сообщения будут приходить прямо в панель оператора</p>
            <ChannelsTab ios={null} inputStyle={null} />
          </div>
        )}

        {tab === "replies" && (
          <div style={{ maxWidth: 580 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 4 }}>Быстрые ответы</h1>
            <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 28 }}>Оператор видит название — клиенту отправляется полный текст</p>
            <Card title="Добавить ответ">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <DLabel>Название (видит оператор)</DLabel>
                  <DInput value={newName} onChange={setNewName} placeholder="Например: Трейд-ин" />
                </div>
                <div>
                  <DLabel>Текст (отправляется клиенту)</DLabel>
                  <DInput value={newText} onChange={setNewText} placeholder="Полный текст ответа..." />
                </div>
                <button onClick={addReply} disabled={!newName.trim() || !newText.trim()} style={{ alignSelf: "flex-end", padding: "9px 20px", borderRadius: 10, background: color, color: "white", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", opacity: (newName.trim() && newText.trim()) ? 1 : 0.5, display: "flex", alignItems: "center", gap: 6 }}><Plus size={15} /> Добавить</button>
              </div>
            </Card>
            {replies.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#D1D5DB" }}><Zap size={32} style={{ margin: "0 auto 8px" }} /><p style={{ fontSize: 14 }}>Нет быстрых ответов</p></div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {replies.map((r, i) => (
                  <div key={i} style={{ background: "white", borderRadius: 12, padding: "12px 16px", border: "1px solid #F3F4F6" }}>
                    {editIdx === i ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} placeholder="Название" style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none", fontWeight: 600 }} />
                        <input value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditIdx(null) }} placeholder="Текст ответа" style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none", color: "#6B7280" }} />
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button onClick={saveEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "#16a34a" }}><Check size={16} /></button>
                          <button onClick={() => setEditIdx(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}><X size={16} /></button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Zap size={14} color={color} style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{r.name}</p>
                          <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.text}</p>
                        </div>
                        <button onClick={() => startEdit(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4 }}><Edit3 size={14} /></button>
                        <button onClick={() => removeReply(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 4 }}><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {savedReplies && <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, color: "#16a34a", fontSize: 13, fontWeight: 600 }}><Check size={14} /> Сохранено</div>}
          </div>
        )}

        {tab === "account" && (
          <div style={{ maxWidth: 520 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 4 }}>Мой аккаунт</h1>
            <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 28 }}>Ваши личные данные и пароль</p>
            <Card title="Основная информация">
              <DLabel>Имя</DLabel><DInput value={myName} onChange={setMyName} placeholder="Ваше имя" />
              <DLabel>Email</DLabel><DInput value={myEmail} onChange={setMyEmail} placeholder="email@example.com" type="email" />
            </Card>
            <Card title="Смена пароля">
              <DLabel>Новый пароль</DLabel>
              <div style={{ position: "relative" }}>
                <DInput value={myPass} onChange={setMyPass} placeholder="Оставьте пустым чтобы не менять" type={showMyPass ? "text" : "password"} />
                <button onClick={() => setShowMyPass(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}>
                  {showMyPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <DLabel>Повторите пароль</DLabel>
              <DInput value={myPassConf} onChange={setMyPassConf} placeholder="Повторите новый пароль" type="password" />
              {meError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>{meError}</p>}
            </Card>
            <div style={{ display: "flex", justifyContent: "flex-end" }}><DSaveBtn loading={savingMe} saved={savedMe} onClick={saveMe} /></div>
          </div>
        )}
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* Desktop helpers */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "white", borderRadius: 14, padding: "22px 24px", marginBottom: 16, border: "1px solid #F3F4F6", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <h3 style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 18 }}>{title}</h3>
      {children}
    </div>
  )
}
function DLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6, marginTop: 14 }}>{children}</p>
}
function DInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type}
    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none", background: "#FAFAFA", boxSizing: "border-box" }} />
}
function DTextarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none", background: "#FAFAFA", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
}
function DSaveBtn({ loading, saved, onClick }: { loading: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", borderRadius: 12, background: saved ? "#16a34a" : "#111", color: "white", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer", transition: "background 0.2s", opacity: loading ? 0.7 : 1 }}>
      {loading ? <Loader size={15} style={{ animation: "spin 0.7s linear infinite" }} /> : saved ? <Check size={15} /> : <Save size={15} />}
      {loading ? "Сохраняю..." : saved ? "Сохранено!" : "Сохранить"}
    </button>
  )
}

function ChannelsTab({ ios, inputStyle }: { ios: Record<string, string> | null; inputStyle: React.CSSProperties | null }) {
  const [tgToken,   setTgToken]   = useState("")
  const [tgStatus,  setTgStatus]  = useState<{ ok: boolean; username?: string } | null>(null)
  const [tgLoading, setTgLoading] = useState(false)

  const [vkToken,   setVkToken]   = useState("")
  const [vkGroupId, setVkGroupId] = useState("")
  const [vkSecret,  setVkSecret]  = useState("")
  const [vkConfirm, setVkConfirm] = useState("")
  const [vkSaved,   setVkSaved]   = useState(false)
  const [vkSaving,  setVkSaving]  = useState(false)

  const [avClientId,     setAvClientId]     = useState("")
  const [avClientSecret, setAvClientSecret] = useState("")
  const [avStatus,       setAvStatus]       = useState<{ connected: boolean } | null>(null)
  const [avSaving,       setAvSaving]       = useState(false)

  const dark = !!ios

  useEffect(() => {
    fetch("/api/telegram/setup").then(r => r.json()).then(d => {
      if (d.connected) setTgStatus({ ok: true, username: d.username })
    }).catch(() => {})
    fetch("/api/channels/avito").then(r => r.json()).then(d => {
      setAvStatus(d)
    }).catch(() => {})
  }, [])

  const fieldStyle: React.CSSProperties = dark ? (inputStyle ?? {}) : {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none",
    background: "#FAFAFA", boxSizing: "border-box" as const, color: "#111",
    fontFamily: "monospace",
  }
  const labelStyle: React.CSSProperties = dark
    ? { fontSize: 11, fontWeight: 700, color: ios?.label3, display: "block", marginBottom: 8, marginTop: 16, textTransform: "uppercase" as const, letterSpacing: "0.06em" }
    : { fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6, marginTop: 14, display: "block" }

  async function connectTelegram() {
    if (!tgToken.trim()) return
    setTgLoading(true)
    setTgStatus(null)
    try {
      const r = await fetch("/api/telegram/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tgToken }),
      })
      const data = await r.json()
      if (data.ok) {
        // Get webhook info to confirm
        const info = await fetch("/api/telegram/setup").then(r => r.json())
        setTgStatus({ ok: true, username: info.bot?.username ?? data.username })
      } else {
        setTgStatus({ ok: false })
      }
    } catch {
      setTgStatus({ ok: false })
    } finally {
      setTgLoading(false)
    }
  }

  async function connectAvito() {
    if (!avClientId.trim() || !avClientSecret.trim()) return
    setAvSaving(true)
    try {
      const r = await fetch("/api/channels/avito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: avClientId, clientSecret: avClientSecret, userId: "155984990" }),
      })
      const data = await r.json()
      setAvStatus({ connected: !!data.ok })
    } catch {
      setAvStatus({ connected: false })
    } finally {
      setAvSaving(false)
    }
  }

  async function saveVk() {
    setVkSaving(true)
    await fetch("/api/channels/vk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: vkToken, groupId: vkGroupId, secret: vkSecret, confirmCode: vkConfirm }),
    })
    setVkSaving(false)
    setVkSaved(true)
    setTimeout(() => setVkSaved(false), 2500)
  }

  const cardStyle: React.CSSProperties = dark
    ? { background: ios?.bg2, borderRadius: 16, overflow: "hidden", marginBottom: 20 }
    : { background: "white", borderRadius: 14, padding: "22px 24px", marginBottom: 16, border: "1px solid #F3F4F6", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }

  const sectionTitle: React.CSSProperties = dark
    ? { fontSize: 12, fontWeight: 500, color: ios?.label3, textTransform: "uppercase" as const, letterSpacing: "0.04em", padding: "0 4px", marginBottom: 8, marginTop: 28 }
    : { fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 18 }

  const btnStyle = (color: string, disabled?: boolean): React.CSSProperties => ({
    width: "100%", padding: "13px", borderRadius: 12, border: "none", cursor: disabled ? "not-allowed" : "pointer",
    background: disabled ? (dark ? ios?.bg3 : "#E5E7EB") : color,
    color: "white", fontWeight: 600, fontSize: 15,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    marginTop: 16, opacity: disabled ? 0.6 : 1,
  })

  const appUrl = typeof window !== "undefined" ? window.location.origin : ""

  return (
    <div style={{ padding: dark ? "0" : "0" }}>
      {/* ── TELEGRAM ── */}
      <p style={sectionTitle}>Telegram</p>
      <div style={cardStyle}>
        <div style={{ padding: dark ? "16px" : "0" }}>
          {!dark && <h3 style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 18 }}>Telegram бот</h3>}
          <label style={labelStyle}>Токен бота (@BotFather)</label>
          <input value={tgToken} onChange={e => setTgToken(e.target.value)}
            placeholder="7123456789:AAFxxx..."
            style={{ ...fieldStyle, fontFamily: "monospace" }} />

          {tgStatus?.ok && (
            <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: dark ? "rgba(48,209,88,0.12)" : "#f0fdf4", border: `1px solid ${dark ? "rgba(48,209,88,0.3)" : "#BBF7D0"}`, color: dark ? "#4ade80" : "#16a34a", fontSize: 13 }}>
              ✓ Подключён @{tgStatus.username}
            </div>
          )}
          {tgStatus && !tgStatus.ok && (
            <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: dark ? "rgba(255,69,58,0.12)" : "#FEF2F2", border: `1px solid ${dark ? "rgba(255,69,58,0.3)" : "#FECACA"}`, color: dark ? "#FF453A" : "#DC2626", fontSize: 13 }}>
              Ошибка. Проверь токен.
            </div>
          )}

          <button onClick={connectTelegram} disabled={!tgToken.trim() || tgLoading} style={btnStyle("#229ED9", !tgToken.trim())}>
            {tgLoading ? <><Loader size={15} style={{ animation: "spin 0.7s linear infinite" }} /> Подключаю...</> : "Подключить Telegram"}
          </button>
        </div>
      </div>

      {/* ── АВИТО ── */}
      <p style={{ ...sectionTitle, marginTop: dark ? 28 : 20 }}>Авито</p>
      <div style={cardStyle}>
        <div style={{ padding: dark ? "16px" : "0" }}>
          {!dark && <h3 style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 18 }}>Авито мессенджер</h3>}

          <label style={labelStyle}>Client ID</label>
          <input value={avClientId} onChange={e => setAvClientId(e.target.value)}
            placeholder="8kZ19y66DZ3XVQdmo5Zi"
            style={{ ...fieldStyle, fontFamily: "monospace" }} />

          <label style={labelStyle}>Client Secret</label>
          <input value={avClientSecret} onChange={e => setAvClientSecret(e.target.value)}
            placeholder="Lp5qsypCwmpW4d6inyhI..."
            style={{ ...fieldStyle, fontFamily: "monospace" }} />

          {avStatus?.connected && (
            <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: dark ? "rgba(0,177,64,0.12)" : "#f0fdf4", border: `1px solid ${dark ? "rgba(0,177,64,0.3)" : "#BBF7D0"}`, color: dark ? "#4ade80" : "#16a34a", fontSize: 13 }}>
              ✓ Авито подключён
            </div>
          )}
          {avStatus && !avStatus.connected && (
            <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: dark ? "rgba(255,69,58,0.12)" : "#FEF2F2", border: `1px solid ${dark ? "rgba(255,69,58,0.3)" : "#FECACA"}`, color: dark ? "#FF453A" : "#DC2626", fontSize: 13 }}>
              Ошибка. Проверь ключи.
            </div>
          )}

          <button onClick={connectAvito} disabled={!avClientId.trim() || !avClientSecret.trim() || avSaving} style={btnStyle("#00B140", !avClientId.trim() || !avClientSecret.trim())}>
            {avSaving ? <><Loader size={15} style={{ animation: "spin 0.7s linear infinite" }} /> Подключаю...</> : "Подключить Авито"}
          </button>
        </div>
      </div>

      {/* ── VK ── */}
      <p style={{ ...sectionTitle, marginTop: dark ? 28 : 20 }}>ВКонтакте</p>
      <div style={cardStyle}>
        <div style={{ padding: dark ? "16px" : "0" }}>
          {!dark && <h3 style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 18 }}>VK сообщество</h3>}

          <label style={labelStyle}>Токен сообщества</label>
          <input value={vkToken} onChange={e => setVkToken(e.target.value)}
            placeholder="vk1.a.xxxx..."
            style={{ ...fieldStyle, fontFamily: "monospace" }} />

          <label style={labelStyle}>ID группы (число)</label>
          <input value={vkGroupId} onChange={e => setVkGroupId(e.target.value)}
            placeholder="123456789"
            style={fieldStyle} />

          <label style={labelStyle}>Секретный ключ (придумай сам)</label>
          <input value={vkSecret} onChange={e => setVkSecret(e.target.value)}
            placeholder="любая строка, например: mysecret42"
            style={fieldStyle} />

          <label style={labelStyle}>Строка подтверждения (из VK)</label>
          <input value={vkConfirm} onChange={e => setVkConfirm(e.target.value)}
            placeholder="a1b2c3d4"
            style={fieldStyle} />

          <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 10, background: dark ? "rgba(255,255,255,0.04)" : "#F7F8FA", border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "#E5E7EB"}` }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: dark ? "rgba(235,235,245,0.6)" : "#374151", marginBottom: 4 }}>URL для Callback API VK:</p>
            <p style={{ fontSize: 12, fontFamily: "monospace", color: dark ? "rgba(235,235,245,0.4)" : "#6B7280", wordBreak: "break-all" }}>
              {appUrl}/api/vk/webhook
            </p>
          </div>

          <button onClick={saveVk} disabled={!vkToken.trim() || vkSaving} style={btnStyle("#0077FF", !vkToken.trim())}>
            {vkSaving ? <><Loader size={15} style={{ animation: "spin 0.7s linear infinite" }} /> Сохраняю...</>
              : vkSaved ? <><Check size={15} /> Сохранено</>
              : "Сохранить настройки VK"}
          </button>
        </div>
      </div>
    </div>
  )
}
