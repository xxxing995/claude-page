import { useEffect, useRef, useState } from 'react'
import { MODELS } from '../data.js'
import { HouseIcon, ChevronIcon, CheckIcon, ClipIcon, SendIcon, MenuIcon } from './Icons.jsx'

const TODAY = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date())

function AssistantMessage({ blocks }) {
  return (
    <div className="msg-assistant">
      <div className="avatar">
        <HouseIcon size={18} />
      </div>
      <div className="msg-body">
        {blocks.map((b, i) =>
          b.type === 'list' ? (
            <div className="list-card" key={i}>
              {b.rows.map(([k, v]) => (
                <div className="list-row" key={k}>
                  <span className="list-key">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          ) : (
            <p key={i}>{b.text}</p>
          ),
        )}
      </div>
    </div>
  )
}

export default function ChatView({ title, messages, onSend, onOpenSidebar }) {
  const [modelId, setModelId] = useState('sonnet')
  const [menuOpen, setMenuOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const menuRef = useRef(null)
  const taRef = useRef(null)
  const endRef = useRef(null)
  const model = MODELS.find((m) => m.id === modelId)

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false)
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  const submit = () => {
    const text = draft.trim()
    if (!text) return
    onSend(text, modelId)
    setDraft('')
    if (taRef.current) taRef.current.style.height = 'auto'
  }

  const onKeyDown = (e) => {
    // 中文输入法选词时按回车不应该发送
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  const onInput = (e) => {
    setDraft(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px'
  }

  return (
    <main className="main">
      <header className="topbar">
        <div className="topbar-side">
          <button type="button" className="icon-btn menu-btn" aria-label="打开对话列表" onClick={onOpenSidebar}>
            <MenuIcon />
          </button>
          <span className="topbar-title">{title}</span>
        </div>

        <div className="model-wrap" ref={menuRef}>
          <button
            type="button"
            className="model-btn"
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="dot" />
            <span>{model.name}</span>
            <ChevronIcon />
          </button>
          {menuOpen && (
            <div className="model-menu" role="listbox" aria-label="选择模型">
              {MODELS.map((m) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={m.id === modelId}
                  key={m.id}
                  className={'model-item' + (m.id === modelId ? ' selected' : '')}
                  onClick={() => {
                    setModelId(m.id)
                    setMenuOpen(false)
                  }}
                >
                  <span className="model-text">
                    <span className="model-name">{m.name}</span>
                    <span className="model-desc">{m.desc}</span>
                  </span>
                  {m.id === modelId && <CheckIcon />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="topbar-side" />
      </header>

      <div className="messages">
        <div className="messages-inner">
          {messages.length === 0 ? (
            <div className="empty">
              <div className="avatar avatar-lg">
                <HouseIcon size={26} />
              </div>
              <p>今天想聊点什么？</p>
            </div>
          ) : (
            <>
              <div className="date-chip">{TODAY}</div>
              {messages.map((m) =>
                m.role === 'user' ? (
                  <div className="msg-user" key={m.id}>
                    {m.text}
                  </div>
                ) : (
                  <AssistantMessage key={m.id} blocks={m.blocks} />
                ),
              )}
            </>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="composer-wrap">
        <div className="composer-inner">
          <div className="composer">
            <button type="button" className="icon-btn" aria-label="添加附件">
              <ClipIcon />
            </button>
            <textarea
              ref={taRef}
              rows={1}
              aria-label="输入消息"
              placeholder="和我说说今天的事吧…"
              value={draft}
              onChange={onInput}
              onKeyDown={onKeyDown}
            />
            <button type="button" className="send-btn" aria-label="发送" onClick={submit}>
              <SendIcon />
            </button>
          </div>
          <div className="footnote">回答可能会有出入，重要的事记得再确认一下。</div>
        </div>
      </div>
    </main>
  )
}
