import { useEffect, useRef, useState } from 'react'
import { textToBlocks } from '../api.js'
import {
  HouseIcon,
  ChevronIcon,
  CheckIcon,
  ClipIcon,
  SendIcon,
  MenuIcon,
  TrashIcon,
  RefreshIcon,
  StopIcon,
} from './Icons.jsx'

const TODAY = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
}).format(new Date())

function Stats({ s }) {
  if (!s) return null
  const sec = (ms) => (ms / 1000).toFixed(1)
  const parts = []
  if (s.first_token_ms != null) parts.push(`首字 ${sec(s.first_token_ms)} 秒`)
  if (s.total_ms != null) parts.push(`用时 ${sec(s.total_ms)} 秒`)
  if (s.completion_tokens != null) parts.push(`${s.completion_tokens} tokens`)
  return parts.length ? <div className="msg-stats">{parts.join(' · ')}</div> : null
}

function AssistantMessage({ m, isLast, busy, onRegenerate, onDelete }) {
  const blocks = m.blocks ?? textToBlocks(m.text || '')
  const waiting = m.streaming && !m.text && !m.reasoning
  return (
    <div className="msg-assistant">
      <div className="avatar">
        <HouseIcon size={18} />
      </div>
      <div className="msg-body">
        {m.reasoning && (
          <details className="reasoning">
            <summary>思考过程</summary>
            <div>{m.reasoning}</div>
          </details>
        )}
        {waiting && <p className="typing">正在想…</p>}
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
        {!m.streaming && (
          <div className="msg-meta">
            <Stats s={m.stats} />
            <button type="button" className="act-btn" disabled={busy} onClick={() => onDelete(m)}>
              <TrashIcon /> 删除
            </button>
            {isLast && m.dbId && (
              <button type="button" className="act-btn" disabled={busy} onClick={() => onRegenerate(m)}>
                <RefreshIcon /> 重新生成
              </button>
            )}
          </div>
        )}
        {m.note && <div className="msg-stats">{m.note}</div>}
      </div>
    </div>
  )
}

export default function ChatView({
  title,
  messages,
  status,
  models,
  onOpenSettings,
  onSend,
  onStop,
  onRegenerate,
  onDelete,
  onOpenSidebar,
}) {
  const busy = !!status

  // 模型：优先用上次选的；没有或已被删除，就用标记为默认的；再没有就用第一个
  const [savedId, setSavedId] = useState(() => {
    try {
      return localStorage.getItem('our-home:model')
    } catch {
      return null
    }
  })
  const model = models.find((m) => m.model_key === savedId) || models.find((m) => m.is_default) || models[0]
  const modelId = model?.model_key

  const [menuOpen, setMenuOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const menuRef = useRef(null)
  const taRef = useRef(null)
  const endRef = useRef(null)

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
  }, [messages, status])

  const pickModel = (key) => {
    setSavedId(key)
    setMenuOpen(false)
    try {
      localStorage.setItem('our-home:model', key)
    } catch {}
  }

  const submit = () => {
    const text = draft.trim()
    if (!text || busy || !model) return
    onSend(text, modelId)
    setDraft('')
    if (taRef.current) taRef.current.style.height = 'auto'
  }

  const handleStop = () => {
    const text = onStop()
    if (!text) return
    setDraft((d) => (d ? text + '\n' + d : text)) // 撤回的文字放回输入框
    requestAnimationFrame(() => {
      const el = taRef.current
      if (!el) return
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 180) + 'px'
      el.focus()
    })
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
            onClick={() => (model ? setMenuOpen((v) => !v) : onOpenSettings())}
          >
            <span className="dot" />
            <span>{model ? model.label : '添加模型'}</span>
            <ChevronIcon />
          </button>
          {menuOpen && (
            <div className="model-menu" role="listbox" aria-label="选择模型">
              {models.map((m) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={m.model_key === modelId}
                  key={m.id}
                  className={'model-item' + (m.model_key === modelId ? ' selected' : '')}
                  onClick={() => pickModel(m.model_key)}
                >
                  <span className="model-text">
                    <span className="model-name">{m.label}</span>
                    <span className="model-desc">{m.description}</span>
                  </span>
                  {m.model_key === modelId && <CheckIcon />}
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
                  <AssistantMessage
                    key={m.id}
                    m={m}
                    isLast={m.id === messages[messages.length - 1]?.id}
                    busy={busy}
                    onRegenerate={(msg) => onRegenerate(msg, modelId)}
                    onDelete={onDelete}
                  />
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
            {status === 'connecting' || status === 'streaming' ? (
              <button
                type="button"
                className="send-btn stop"
                aria-label="停止并撤回"
                disabled={status === 'connecting'}
                onClick={handleStop}
              >
                <StopIcon />
              </button>
            ) : (
              <button type="button" className="send-btn" aria-label="发送" disabled={busy || !model} onClick={submit}>
                <SendIcon />
              </button>
            )}
          </div>
          <div className="footnote">回答可能会有出入，重要的事记得再确认一下。</div>
        </div>
      </div>
    </main>
  )
}