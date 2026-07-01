"use client"

import { useState, useEffect } from "react"
import {
  MessageCircle, ArrowLeft, Users, Settings2, Palette,
  Plus, Trash2, Edit3, Save, X, Eye, EyeOff,
  Check, Loader, Circle, Clock, ShieldCheck, Zap,
} from "lucide-react"

interface Operator {
  id: string; name: string; email: string; avatar: string | null
  isOnline: boolean; lastSeenAt: string | null; createdAt: string
}
interface ChatSettings {
  greeting: string; offlineText: string; primaryColor: string
  quickReplies: string[]; operatorName: string; operatorAvatar: string | null
}

const COLORS = ["#F26522","#6366F1","#0EA5E9","#10B981","#EF4444","#F59E0B","#8B5CF6","#EC4899","#14B8A6","#1a1a1a"]
const TABS = [
  { key: "widget",    label: "Виджет",    icon: Palette },
  { key: "operators", label: "Операторы", icon: Users },
  { key: "replies",   label: "Ответы",    icon: Zap },
  { key: "account",  label: "Аккаунт",   icon: ShieldCheck },
]

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

export function SettingsApp({
  currentOperator,
  initialSettings,
  initialOperators,
}: {
  currentOperator: { id: string; name: string; email: string; avatar: string | null; workspaceId: string }
  initialSettings: ChatSettings | null
  initialOperators: Operator[]
}) {
  const [tab,      setTab]     = useState("widget")
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  /* ── Widget settings ── */
  const [greeting,     setGreeting]     = useState(initialSettings?.greeting     ?? "Здравствуйте! Чем могу помочь? 😊")
  const [offlineText,  setOfflineText]  = useState(initialSettings?.offlineText  ?? "Мы сейчас офлайн. Оставьте сообщение!")
  const [color,        setColor]        = useState(initialSettings?.primaryColor ?? "#F26522")
  const [opName,       setOpName]       = useState(initialSettings?.operatorName ?? "Поддержка")
  const [savingWidget, setSavingWidget] = useState(false)
  const [savedWidget,  setSavedWidget]  = useState(false)

  /* ── Quick replies ── */
  const [replies,       setReplies]       = useState<string[]>(initialSettings?.quickReplies ?? [])
  const [newReply,      setNewReply]      = useState("")
  const [editIdx,       setEditIdx]       = useState<number | null>(null)
  const [editVal,       setEditVal]       = useState("")
  const [savingReplies, setSavingReplies] = useState(false)
  const [savedReplies,  setSavedReplies]  = useState(false)

  /* ── Operators ── */
  const [operators,   setOperators]   = useState<Operator[]>(initialOperators)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName,     setNewName]     = useState("")
  const [newEmail,    setNewEmail]    = useState("")
  const [newPass,     setNewPass]     = useState("")
  const [showPass,    setShowPass]    = useState(false)
  const [addingOp,    setAddingOp]    = useState(false)
  const [addError,    setAddError]    = useState("")

  /* ── My account ── */
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

  async function saveReplies(list: string[]) {
    setSavingReplies(true)
    await fetch("/api/workspace/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quickReplies: list }) })
    setSavingReplies(false); setSavedReplies(true)
    setTimeout(() => setSavedReplies(false), 2000)
  }

  function addReply() {
    if (!newReply.trim()) return
    const list = [...replies, newReply.trim()]
    setReplies(list); setNewReply(""); saveReplies(list)
  }

  function removeReply(i: number) {
    const list = replies.filter((_, idx) => idx !== i)
    setReplies(list); saveReplies(list)
  }

  function startEdit(i: number) { setEditIdx(i); setEditVal(replies[i]) }
  function saveEdit() {
    if (editIdx === null || !editVal.trim()) return
    const list = replies.map((r, i) => i === editIdx ? editVal.trim() : r)
    setReplies(list); setEditIdx(null); saveReplies(list)
  }

  async function addOperator() {
    if (!newName.trim() || !newEmail.trim() || !newPass.trim()) { setAddError("Заполните все поля"); return }
    setAddingOp(true); setAddError("")
    const r = await fetch("/api/operators", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName, email: newEmail, password: newPass }) })
    const data = await r.json()
    if (!r.ok) { setAddError(data.error || "Ошибка"); setAddingOp(false); return }
    setOperators(prev => [...prev, { ...data, isOnline: false, lastSeenAt: null, createdAt: new Date().toISOString() }])
    setNewName(""); setNewEmail(""); setNewPass(""); setShowAddForm(false); setAddingOp(false)
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
      MOBILE LAYOUT
  ══════════════════════════════════════ */
  if (isMobile) {
    const darkBg     = "#0C0C18"
    const cardBg     = "rgba(255,255,255,0.05)"
    const cardBorder = "rgba(255,255,255,0.08)"
    const headerBg   = "linear-gradient(180deg, #1a1035 0%, #0d0d1f 100%)"

    const darkInput: React.CSSProperties = {
      width: "100%", padding: "12px 14px", borderRadius: 12,
      border: "1.5px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
      fontSize: 15, outline: "none", color: "white", boxSizing: "border-box",
    }
    const darkTextarea: React.CSSProperties = {
      ...darkInput, resize: "vertical" as const, fontFamily: "inherit", minHeight: 80,
    }
    const darkLabel: React.CSSProperties = {
      fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)",
      display: "block", marginBottom: 8, marginTop: 16, textTransform: "uppercase" as const, letterSpacing: "0.06em",
    }
    const darkCard: React.CSSProperties = {
      background: cardBg, border: `1px solid ${cardBorder}`,
      borderRadius: 16, padding: "18px 16px", marginBottom: 14,
    }

    const renderTabContent = () => {
      /* ── WIDGET ── */
      if (tab === "widget") return (
        <div>
          <div style={darkCard}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>Имя и приветствие</p>
            <label style={darkLabel}>Имя оператора / команды</label>
            <input value={opName} onChange={e => setOpName(e.target.value)} placeholder="Поддержка" style={darkInput} />
            <label style={darkLabel}>Приветственное сообщение</label>
            <textarea value={greeting} onChange={e => setGreeting(e.target.value)} placeholder="Здравствуйте!" style={darkTextarea} rows={3} />
            <label style={darkLabel}>Текст когда офлайн</label>
            <textarea value={offlineText} onChange={e => setOfflineText(e.target.value)} placeholder="Мы сейчас офлайн..." style={darkTextarea} rows={2} />
          </div>

          <div style={darkCard}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 14 }}>Цвет виджета</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  style={{ width: 36, height: 36, borderRadius: "50%", background: c, border: color === c ? "3px solid white" : "3px solid transparent", cursor: "pointer", boxShadow: color === c ? `0 0 0 2px ${c}` : "none", outline: "none" }} />
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", padding: 0, background: "transparent" }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{color}</span>
              </div>
            </div>
            {/* Preview */}
            <div style={{ marginTop: 16, padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", position: "relative", minHeight: 80 }}>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Предпросмотр</p>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 16px ${color}55` }}>
                  <MessageCircle size={20} color="white" />
                </div>
              </div>
              <div style={{ position: "absolute", bottom: 64, right: 12, background: color, color: "white", borderRadius: "10px 10px 2px 10px", padding: "7px 12px", fontSize: 12, maxWidth: "75%" }}>
                {greeting.slice(0, 40)}{greeting.length > 40 ? "…" : ""}
              </div>
            </div>
          </div>

          <button onClick={saveWidget} disabled={savingWidget}
            style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: "pointer", background: savedWidget ? "linear-gradient(135deg,#10B981,#34D399)" : "linear-gradient(135deg,#F26522,#FF8C42)", color: "white", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 6px 20px rgba(242,101,34,0.3)", transition: "all 0.2s", opacity: savingWidget ? 0.7 : 1 }}>
            {savingWidget ? <><Loader size={16} style={{ animation: "spin 0.7s linear infinite" }} /> Сохраняю...</>
              : savedWidget ? <><Check size={16} /> Сохранено!</>
              : <><Save size={16} /> Сохранить</>}
          </button>
        </div>
      )

      /* ── OPERATORS ── */
      if (tab === "operators") return (
        <div>
          <button onClick={() => { setShowAddForm(v => !v); setAddError("") }}
            style={{ width: "100%", padding: "12px", borderRadius: 14, border: "1px solid rgba(242,101,34,0.4)", cursor: "pointer", background: showAddForm ? "rgba(242,101,34,0.15)" : "rgba(242,101,34,0.08)", color: "#FF8C42", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 }}>
            {showAddForm ? <X size={16} /> : <Plus size={16} />}
            {showAddForm ? "Отмена" : "Добавить оператора"}
          </button>

          {showAddForm && (
            <div style={{ ...darkCard, marginBottom: 14, border: "1px solid rgba(242,101,34,0.25)" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>Новый оператор</p>
              <label style={darkLabel}>Имя</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Иван Петров" style={darkInput} />
              <label style={darkLabel}>Email</label>
              <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="ivan@example.com" type="email" style={darkInput} />
              <label style={darkLabel}>Пароль</label>
              <div style={{ position: "relative" }}>
                <input value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Минимум 6 символов" type={showPass ? "text" : "password"} style={darkInput} />
                <button onClick={() => setShowPass(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)" }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {addError && <p style={{ fontSize: 12, color: "#FCA5A5", marginTop: 8 }}>{addError}</p>}
              <button onClick={addOperator} disabled={addingOp}
                style={{ width: "100%", marginTop: 14, padding: "12px", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#F26522,#FF8C42)", color: "white", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: addingOp ? 0.7 : 1 }}>
                {addingOp ? <><Loader size={15} style={{ animation: "spin 0.7s linear infinite" }} /> Создаю...</> : <><Plus size={15} /> Создать</>}
              </button>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {operators.map(op => (
              <div key={op.id} style={{ ...darkCard, marginBottom: 0, display: "flex", alignItems: "center", gap: 12, padding: "14px 14px" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: op.id === currentOperator.id ? avatarGradient(op.name) : "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 17, color: "white", position: "relative", boxShadow: op.id === currentOperator.id ? "0 4px 12px rgba(242,101,34,0.35)" : "none" }}>
                  {op.avatar ? <img src={op.avatar} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} alt="" /> : op.name[0].toUpperCase()}
                  <span style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: "50%", background: op.isOnline ? "#4ade80" : "#374151", border: `2px solid ${darkBg}`, boxShadow: op.isOnline ? "0 0 6px rgba(74,222,128,0.6)" : "none" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: "white" }}>{op.name}</p>
                    {op.id === currentOperator.id && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 99, background: "rgba(242,101,34,0.2)", color: "#FF8C42" }}>ВЫ</span>}
                  </div>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{op.email}</p>
                  <p style={{ fontSize: 10, marginTop: 2, color: op.isOnline ? "#4ade80" : "rgba(255,255,255,0.25)" }}>
                    {op.isOnline ? "● Онлайн" : op.lastSeenAt ? `Был ${new Date(op.lastSeenAt).toLocaleDateString("ru-RU")}` : "Ещё не заходил"}
                  </p>
                </div>
                {op.id !== currentOperator.id && (
                  <button onClick={() => deleteOperator(op.id)} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#FCA5A5", flexShrink: 0 }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )

      /* ── REPLIES ── */
      if (tab === "replies") return (
        <div>
          <div style={darkCard}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 12 }}>Добавить быстрый ответ</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={newReply} onChange={e => setNewReply(e.target.value)} onKeyDown={e => e.key === "Enter" && addReply()}
                placeholder="Например: Условия доставки"
                style={{ ...darkInput, marginTop: 0 }} />
              <button onClick={addReply} disabled={!newReply.trim()}
                style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 12, border: "none", cursor: "pointer", background: newReply.trim() ? "linear-gradient(135deg,#F26522,#FF8C42)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", color: newReply.trim() ? "white" : "rgba(255,255,255,0.25)" }}>
                <Plus size={18} />
              </button>
            </div>
          </div>

          {savedReplies && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, color: "#4ade80", fontSize: 13, fontWeight: 600, padding: "8px 12px", background: "rgba(74,222,128,0.08)", borderRadius: 10, border: "1px solid rgba(74,222,128,0.2)" }}>
              <Check size={14} /> Сохранено
            </div>
          )}

          {replies.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: cardBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={24} color="rgba(255,255,255,0.2)" />
              </div>
              <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Нет быстрых ответов</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {replies.map((r, i) => (
                <div key={i} style={{ ...darkCard, marginBottom: 0, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
                  <Zap size={14} color="#F26522" style={{ flexShrink: 0 }} />
                  {editIdx === i ? (
                    <>
                      <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditIdx(null) }}
                        style={{ ...darkInput, flex: 1, padding: "8px 10px", marginTop: 0 }} />
                      <button onClick={saveEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "#4ade80", padding: 4 }}><Check size={16} /></button>
                      <button onClick={() => setEditIdx(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 4 }}><X size={16} /></button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: 14, color: "rgba(255,255,255,0.8)" }}>{r}</span>
                      <button onClick={() => startEdit(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 4 }}><Edit3 size={14} /></button>
                      <button onClick={() => removeReply(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#FCA5A5", padding: 4 }}><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )

      /* ── ACCOUNT ── */
      if (tab === "account") return (
        <div>
          {/* Avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 16px", background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, marginBottom: 14 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", flexShrink: 0, background: avatarGradient(currentOperator.name), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 26, color: "white", boxShadow: "0 8px 24px rgba(242,101,34,0.35)", position: "relative" }}>
              {currentOperator.name[0].toUpperCase()}
              <span style={{ position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: "#4ade80", border: `2px solid ${darkBg}`, boxShadow: "0 0 8px rgba(74,222,128,0.6)" }} />
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 17, color: "white" }}>{currentOperator.name}</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{currentOperator.email}</p>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(74,222,128,0.12)", color: "#4ade80", marginTop: 4, display: "inline-block" }}>Онлайн</span>
            </div>
          </div>

          <div style={darkCard}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>Основная информация</p>
            <label style={darkLabel}>Имя</label>
            <input value={myName} onChange={e => setMyName(e.target.value)} placeholder="Ваше имя" style={darkInput} />
            <label style={darkLabel}>Email</label>
            <input value={myEmail} onChange={e => setMyEmail(e.target.value)} placeholder="email@example.com" type="email" style={darkInput} />
          </div>

          <div style={darkCard}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>Смена пароля</p>
            <label style={darkLabel}>Новый пароль</label>
            <div style={{ position: "relative" }}>
              <input value={myPass} onChange={e => setMyPass(e.target.value)} placeholder="Оставьте пустым чтобы не менять" type={showMyPass ? "text" : "password"} style={{ ...darkInput, paddingRight: 44 }} />
              <button onClick={() => setShowMyPass(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)" }}>
                {showMyPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <label style={darkLabel}>Повторите пароль</label>
            <input value={myPassConf} onChange={e => setMyPassConf(e.target.value)} placeholder="Повторите пароль" type="password" style={darkInput} />
            {meError && <p style={{ fontSize: 12, color: "#FCA5A5", marginTop: 8 }}>{meError}</p>}
          </div>

          <button onClick={saveMe} disabled={savingMe}
            style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: "pointer", background: savedMe ? "linear-gradient(135deg,#10B981,#34D399)" : "linear-gradient(135deg,#F26522,#FF8C42)", color: "white", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 6px 20px rgba(242,101,34,0.3)", transition: "all 0.2s", opacity: savingMe ? 0.7 : 1 }}>
            {savingMe ? <><Loader size={16} style={{ animation: "spin 0.7s linear infinite" }} /> Сохраняю...</>
              : savedMe ? <><Check size={16} /> Сохранено!</>
              : <><Save size={16} /> Сохранить</>}
          </button>
        </div>
      )

      return null
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100svh", background: darkBg, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: headerBg, padding: "14px 20px 16px", flexShrink: 0, borderBottom: `1px solid ${cardBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a href="/" style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${cardBorder}`, borderRadius: 10, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)", textDecoration: "none", flexShrink: 0 }}>
              <ArrowLeft size={16} />
            </a>
            <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: "linear-gradient(135deg,#F26522,#FF8C42)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(242,101,34,0.4)" }}>
              <Settings2 size={18} color="white" />
            </div>
            <div>
              <p style={{ color: "white", fontWeight: 800, fontSize: 17, lineHeight: 1 }}>Настройки</p>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 }}>{currentOperator.name}</p>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>
          {renderTabContent()}
          <div style={{ height: 12 }} />
        </div>

        {/* Bottom tab bar */}
        <div style={{ background: "rgba(12,12,24,0.97)", backdropFilter: "blur(20px)", borderTop: `1px solid ${cardBorder}`, display: "flex", flexShrink: 0, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {TABS.map(t => {
            const Icon = t.icon
            const isActive = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ flex: 1, padding: "12px 0 10px", border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: isActive ? "#F26522" : "rgba(255,255,255,0.3)", position: "relative" }}>
                <Icon size={22} />
                <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400 }}>{t.label}</span>
                {isActive && <span style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 20, height: 2, borderRadius: 99, background: "#F26522" }} />}
              </button>
            )
          })}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  /* ══════════════════════════════════════
      DESKTOP LAYOUT (unchanged)
  ══════════════════════════════════════ */
  return (
    <div style={{ display: "flex", height: "100vh", background: "#F7F8FA", overflow: "hidden" }}>

      {/* Sidebar */}
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
          {TABS.map(t => {
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

      {/* Content */}
      <main style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>

        {/* WIDGET TAB */}
        {tab === "widget" && (
          <div style={{ maxWidth: 640 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 4 }}>Настройки виджета</h1>
            <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 28 }}>Внешний вид и текст чата на сайте</p>
            <Card title="Имя и приветствие">
              <Label>Имя оператора / команды</Label>
              <Input value={opName} onChange={setOpName} placeholder="Поддержка" />
              <Label>Приветственное сообщение</Label>
              <Textarea value={greeting} onChange={setGreeting} placeholder="Здравствуйте! Чем могу помочь?" />
              <Label>Текст когда офлайн</Label>
              <Textarea value={offlineText} onChange={setOfflineText} placeholder="Мы сейчас офлайн..." />
            </Card>
            <Card title="Цвет виджета">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)}
                    style={{ width: 36, height: 36, borderRadius: "50%", background: c, border: color === c ? "3px solid #111" : "3px solid transparent", cursor: "pointer", transition: "border 0.12s", outline: "none", boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : "none" }} />
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
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <SaveBtn loading={savingWidget} saved={savedWidget} onClick={saveWidget} />
            </div>
          </div>
        )}

        {/* OPERATORS TAB */}
        {tab === "operators" && (
          <div style={{ maxWidth: 680 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>Операторы</h1>
              <button onClick={() => { setShowAddForm(true); setAddError("") }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, background: color, color: "white", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer" }}>
                <Plus size={15} /> Добавить оператора
              </button>
            </div>
            <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
              {operators.length} {operators.length === 1 ? "оператор" : operators.length < 5 ? "оператора" : "операторов"}
            </p>
            {showAddForm && (
              <div style={{ background: "white", borderRadius: 14, padding: 24, marginBottom: 20, border: "1.5px solid #E5E7EB", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h3 style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>Новый оператор</h3>
                  <button onClick={() => setShowAddForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}><X size={18} /></button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div><Label>Имя</Label><Input value={newName} onChange={setNewName} placeholder="Иван Петров" /></div>
                  <div><Label>Email</Label><Input value={newEmail} onChange={setNewEmail} placeholder="ivan@example.com" type="email" /></div>
                </div>
                <Label>Пароль</Label>
                <div style={{ position: "relative" }}>
                  <Input value={newPass} onChange={setNewPass} placeholder="Минимум 6 символов" type={showPass ? "text" : "password"} />
                  <button onClick={() => setShowPass(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {addError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{addError}</p>}
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button onClick={addOperator} disabled={addingOp}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 10, background: color, color: "white", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", opacity: addingOp ? 0.7 : 1 }}>
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
                      {op.isOnline
                        ? <span style={{ fontSize: 10, fontWeight: 600, color: "#16a34a", display: "flex", alignItems: "center", gap: 3 }}><Circle size={6} style={{ fill: "#4ade80", stroke: "none" }} /> Онлайн</span>
                        : <span style={{ fontSize: 10, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 3 }}><Clock size={10} /> {op.lastSeenAt ? `Был ${new Date(op.lastSeenAt).toLocaleDateString("ru-RU")}` : "Не заходил"}</span>}
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

        {/* QUICK REPLIES TAB */}
        {tab === "replies" && (
          <div style={{ maxWidth: 580 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 4 }}>Быстрые ответы</h1>
            <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 28 }}>Кнопки которые видит клиент в чате и оператор в панели — одним кликом отправить готовый ответ</p>
            <Card title="Добавить ответ">
              <div style={{ display: "flex", gap: 10 }}>
                <input value={newReply} onChange={e => setNewReply(e.target.value)} onKeyDown={e => e.key === "Enter" && addReply()}
                  placeholder="Например: Условия доставки"
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none", background: "#FAFAFA" }} />
                <button onClick={addReply} disabled={!newReply.trim()} style={{ padding: "10px 18px", borderRadius: 10, background: color, color: "white", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", opacity: newReply.trim() ? 1 : 0.5 }}>
                  <Plus size={16} />
                </button>
              </div>
            </Card>
            {replies.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#D1D5DB" }}>
                <Zap size={32} style={{ margin: "0 auto 8px" }} />
                <p style={{ fontSize: 14 }}>Нет быстрых ответов</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {replies.map((r, i) => (
                  <div key={i} style={{ background: "white", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, border: "1px solid #F3F4F6", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <Zap size={14} color={color} style={{ flexShrink: 0 }} />
                    {editIdx === i ? (
                      <>
                        <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditIdx(null) }}
                          style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none" }} />
                        <button onClick={saveEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "#16a34a" }}><Check size={16} /></button>
                        <button onClick={() => setEditIdx(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}><X size={16} /></button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontSize: 14, color: "#374151" }}>{r}</span>
                        <button onClick={() => startEdit(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4 }}><Edit3 size={14} /></button>
                        <button onClick={() => removeReply(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 4 }}><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            {savedReplies && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, color: "#16a34a", fontSize: 13, fontWeight: 600 }}>
                <Check size={14} /> Сохранено
              </div>
            )}
          </div>
        )}

        {/* ACCOUNT TAB */}
        {tab === "account" && (
          <div style={{ maxWidth: 520 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 4 }}>Мой аккаунт</h1>
            <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 28 }}>Ваши личные данные и пароль</p>
            <Card title="Основная информация">
              <Label>Имя</Label>
              <Input value={myName} onChange={setMyName} placeholder="Ваше имя" />
              <Label>Email</Label>
              <Input value={myEmail} onChange={setMyEmail} placeholder="email@example.com" type="email" />
            </Card>
            <Card title="Смена пароля">
              <Label>Новый пароль</Label>
              <div style={{ position: "relative" }}>
                <Input value={myPass} onChange={setMyPass} placeholder="Оставьте пустым чтобы не менять" type={showMyPass ? "text" : "password"} />
                <button onClick={() => setShowMyPass(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}>
                  {showMyPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <Label>Повторите пароль</Label>
              <Input value={myPassConf} onChange={setMyPassConf} placeholder="Повторите новый пароль" type="password" />
              {meError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>{meError}</p>}
            </Card>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <SaveBtn loading={savingMe} saved={savedMe} onClick={saveMe} />
            </div>
          </div>
        )}
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ── Desktop reusable helpers ── */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "white", borderRadius: 14, padding: "22px 24px", marginBottom: 16, border: "1px solid #F3F4F6", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <h3 style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 18 }}>{title}</h3>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6, marginTop: 14 }}>{children}</p>
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type}
      style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none", background: "#FAFAFA", boxSizing: "border-box" }} />
  )
}

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
      style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none", background: "#FAFAFA", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
  )
}

function SaveBtn({ loading, saved, onClick }: { loading: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", borderRadius: 12, background: saved ? "#16a34a" : "#111", color: "white", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer", transition: "background 0.2s", opacity: loading ? 0.7 : 1 }}>
      {loading ? <Loader size={15} style={{ animation: "spin 0.7s linear infinite" }} /> : saved ? <Check size={15} /> : <Save size={15} />}
      {loading ? "Сохраняю..." : saved ? "Сохранено!" : "Сохранить"}
    </button>
  )
}
