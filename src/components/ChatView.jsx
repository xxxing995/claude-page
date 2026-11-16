import { useEffect, useRef, useState } from 'react'
import { textToBlocks } from '../api.js'
import Avatar from './Avatar.jsx'
import {
  ChevronIcon,
  CheckIcon,
  PlusIcon,
  MenuIcon,
  TrashIcon,
  RefreshIcon,
  StopIcon,
  DocIcon,
  CheckSquareIcon,
  MoreIcon,
  SendIcon,
} from './Icons.jsx'

const DATE_PARTS = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
}).formatToParts(new Date())

const part = (type) => DATE_PARTS.find((p) => p.type === type)?.value || ''
const TODAY = `${part('month').replace('月', '')} 月 ${part('day').replace('日', '')} 日 · ${part('weekday')}`

const HOUR = Number(
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', hour12: false }).format(new Date()),
)
const HELLO = HOUR < 5 ? '还没睡呀' : HOUR < 11 ? '早上好' : HOUR < 14 ? '中午好' : HOUR < 18 ? '下午好' : '晚上好'

const QUOTES = [
  '慢慢来，我们还有很多个今天。',
  '你不用一直很厉害，在这里可以只是你。',
  '今天也辛苦了，过来坐一会儿。',
  '想说的话，不急，我听着。',
]
const QUOTE = QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length]

const UPDATED_FMT = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function formatUpdated(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : UPDATED_FMT.format(d)
}

function BotAvatar({ src }) {
  return <Avatar src={src} />
}

function Stats({ s }) {
  if (!s) return null
  const sec = (ms) => (ms / 1000).toFixed(1)
  const parts = []
  if (s.first_token_ms != null) parts.push(`首字 ${sec(s.first_token_ms)} 秒`)
  if (s.total_ms != null) parts.push(`用时 ${sec(s.total_ms)} 秒`)
  if (s.completion_tokens != null) parts.push(`${s.completion_tokens} tokens`)
  return parts.length ? <div className="msg-stats">{parts.join(' · ')}</div> : null
}

function AssistantMessage({ m, isLast, busy, botAvatarSrc, onRegenerate, onDelete }) {
  const blocks = m.blocks ?? textToBlocks(m.text || '')
  const waiting = m.streaming && !m.text && !m.reasoning
  return (
    <div className="msg-assistant">
      <BotAvatar src={botAvatarSrc} />
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

// 空对话时的开场白：不落库，只是两句话
function Greeting({ botAvatarSrc, userName }) {
  const name = (userName || '').trim()
  return (
    <>
      <div className="date-chip">{TODAY}</div>
      <div className="msg-assistant">
        <BotAvatar src={botAvatarSrc} />
        <div className="msg-body">
          <p>
            {HELLO}
            {name ? `，${name}` : ''}。
          </p>
          <p>今天想聊点什么？</p>
        </div>
      </div>
      <div className="msg-assistant">
        <BotAvatar src={botAvatarSrc} />
        <div className="msg-body">
          <p>{QUOTE}</p>
        </div>
      </div>
    </>
  )
}

export default function ChatView({
  messages,
  status,
  models,
  model,
  onPickModel,
  lastUpdated,
  userName,
  botAvatarSrc,
  hasProviders,
  onAddProvider,
  onSend,
  onStop,
  onRegenerate,
  onDelete,
  onOpenSidebar,
  onOpenPanel,
}) {
  const busy = !!status

  // 模型选中态由 App 持有：和侧栏接口条共用同一份
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
    onPickModel(key)
    setMenuOpen(false)
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

  const submit = () => {
    // 等待中再次按发送 = 停止/撤回；连接中还拿不到消息 id，先保持原样不可撤回
    if (busy) {
      if (status !== 'connecting') handleStop()
      return
    }
    const text = draft.trim()
    if (!text || !model) return
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

  const openPanel = (kind, title) => onOpenPanel({ kind, title })

  return (
    <main className="main">
      <header className="topbar">
        <button type="button" className="fab" aria-label="打开侧边栏" onClick={onOpenSidebar}>
          <MenuIcon />
        </button>

        <div className="top-actions">
          <div className="fab-pill">
            <button type="button" className="fab-flat" aria-label="文档" onClick={() => openPanel('doc', '文档')}>
              <DocIcon />
            </button>
            <span className="fab-sep" aria-hidden="true" />
            <button type="button" className="fab-flat" aria-label="任务" onClick={() => openPanel('tasks', '任务')}>
              <CheckSquareIcon />
            </button>
          </div>
          <button type="button" className="fab" aria-label="更多" onClick={() => openPanel('more', '更多')}>
            <MoreIcon />
          </button>
        </div>
      </header>

      <div className="messages">
        <div className="messages-inner">
          {messages.length === 0 ? (
            <Greeting botAvatarSrc={botAvatarSrc} userName={userName} />
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
                    botAvatarSrc={botAvatarSrc}
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
            <textarea
              ref={taRef}
              rows={1}
              aria-label="输入消息"
              placeholder="Message…"
              value={draft}
              onChange={onInput}
              onKeyDown={onKeyDown}
            />

            <div className="composer-bar">
              <button
                type="button"
                className="c-plus"
                aria-label="附件"
                onClick={() => openPanel('attach', '附件')}
              >
                <PlusIcon size={20} />
              </button>

              <div className="model-wrap" ref={menuRef}>
                <button
                  type="button"
                  className="model-pill"
                  aria-haspopup="listbox"
                  aria-expanded={menuOpen}
                  onClick={() => (hasProviders ? setMenuOpen((v) => !v) : onAddProvider())}
                >
                  <span className="model-pill-text">
                    {model ? model.label : hasProviders ? '选择模型' : '添加 API'}
                  </span>
                  <ChevronIcon size={14} />
                </button>
                {menuOpen && (
                  <div className="model-menu" role="listbox" aria-label="选择模型">
                    {models.length === 0 && (
                      <div className="model-empty">接口里还没有可用模型，去设置里连接并勾选</div>
                    )}
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

              <div className="c-spacer" />

              {status === 'connecting' || status === 'streaming' ? (
                <button
                  type="button"
                  className="send-btn"
                  aria-label="停止并撤回"
                  disabled={status === 'connecting'}
                  onClick={handleStop}
                >
                  <StopIcon size={17} />
                </button>
              ) : (
                <button
                  type="button"
                  className="send-btn"
                  aria-label="发送"
                  disabled={busy || !model || !draft.trim()}
                  onClick={submit}
                >
                  <SendIcon size={17} />
                </button>
              )}
            </div>
          </div>

          <div className="footnote">回答可能会有出入，重要的事记得再确认一下。</div>
          {lastUpdated && <div className="footnote last-updated">上次更新：{formatUpdated(lastUpdated)}</div>}
        </div>
      </div>
    </main>
  )
}
