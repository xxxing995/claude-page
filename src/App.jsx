import { useCallback, useEffect, useRef, useState } from 'react'
import Splash from './components/Splash.jsx'
import Sidebar from './components/Sidebar.jsx'
import ChatView from './components/ChatView.jsx'
import Settings from './components/Settings.jsx'
import Panel from './components/Panel.jsx'
import { useSettings, resolveSrc, sidebarAvatarSrc, profileAvatarSrc } from './hooks/useSettings.js'
import { providerIconSrc } from './providerIcon.js'
import {
  streamChat,
  deleteMessage,
  deleteSession,
  retractRound,
  listModels,
  listSessions,
  listMessages,
  listProviders,
} from './api.js'

const SHANGHAI = 'Asia/Shanghai'
const dateKey = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: SHANGHAI }).format(d)

// 侧栏分组：今天 / 昨天 / 更早
function groupLabel(iso) {
  if (!iso) return '更早'
  const key = dateKey(new Date(iso))
  const now = new Date()
  if (key === dateKey(now)) return '今天'
  if (key === dateKey(new Date(now.getTime() - 86400000))) return '昨天'
  return '更早'
}

// 两个时间取较晚的（ISO 字符串可以直接比较）；都没有就返回 null
const later = (a, b) => (b && (!a || b > a) ? b : a)

// 数据库会话 -> 侧栏用的对话对象
const toChat = (s) => ({
  id: 's' + s.id,
  sessionId: s.id,
  title: s.name || '新的对话',
  group: groupLabel(s.updated_at),
  updatedAt: s.updated_at || null,
})

// 数据库消息 -> 界面用的消息对象
const toMessage = (r) => ({
  id: 'm' + r.id,
  role: r.role,
  text: r.content || '',
  reasoning: r.reasoning_content || '',
  dbId: r.id,
  stats: {
    model: r.model,
    first_token_ms: r.first_token_ms,
    total_ms: r.total_ms,
    prompt_tokens: r.prompt_tokens,
    completion_tokens: r.completion_tokens,
    total_tokens: r.total_tokens,
    finish_reason: r.finish_reason,
  },
})

export default function App() {
  const { settings, update, reset } = useSettings()
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme || 'rose'
  }, [settings.theme])

  // 开场动画
  const [splash, setSplash] = useState(settings.splashEnabled ? 1 : 0)
  const endSplash = useCallback(() => setSplash(0), [])

  // 对话
  const [chats, setChats] = useState([])
  const [messages, setMessages] = useState({})
  const [activeId, setActiveId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false) // 窄屏：抽屉
  const [collapsed, setCollapsed] = useState(false) // 桌面：收起常驻侧栏
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [addProviderIntent, setAddProviderIntent] = useState(false) // 打开设置时直接进入“添加接口”表单
  const [panel, setPanel] = useState(null) // 占位面板：{ kind, title }

  // 每个对话的状态：'' 空闲 | 'connecting' | 'streaming' | 'retracting'
  const [pending, setPending] = useState({})
  const runs = useRef({}) // 正在进行的生成：{ 对话id: {...} }
  const setStatus = (chatId, s) => setPending((p) => ({ ...p, [chatId]: s }))

  // 模型列表（来自数据库）
  const [models, setModels] = useState([])
  const [modelsError, setModelsError] = useState('')
  const reloadModels = useCallback(async () => {
    try {
      setModels(await listModels(settings.accessCode))
      setModelsError('')
    } catch (err) {
      setModels([])
      setModelsError(err.message)
    }
  }, [settings.accessCode])

  // 接口列表：侧栏接口条和接口图标都从这里取
  const [providers, setProviders] = useState([])
  const reloadProviders = useCallback(async () => {
    try {
      setProviders(await listProviders(settings.accessCode))
    } catch {
      setProviders([])
    }
  }, [settings.accessCode])

  // 模型选中态放在这里：输入区选择器和侧栏接口条共用同一份
  const [modelKey, setModelKey] = useState(() => {
    try {
      return localStorage.getItem('our-home:model')
    } catch {
      return null
    }
  })
  const model = models.find((m) => m.model_key === modelKey) || models.find((m) => m.is_default) || models[0]
  const pickModel = useCallback((key) => {
    setModelKey(key)
    try {
      localStorage.setItem('our-home:model', key)
    } catch {
      // 存不了就算了，只是记住偏好
    }
  }, [])

  // 会话读取：已经读过的历史按会话缓存，切换回来不再请求
  const loadedSessions = useRef(new Set())
  const loadingSessions = useRef(new Set())

  const reloadSessions = useCallback(async () => {
    try {
      const rows = await listSessions(settings.accessCode)
      setChats((prev) => {
        const local = prev.filter((c) => !c.sessionId) // 还没发过消息的新对话
        const bySession = new Map(prev.filter((c) => c.sessionId).map((c) => [c.sessionId, c]))
        const fromDb = rows.map((s) => {
          const existing = bySession.get(s.id)
          if (!existing) return toChat(s)
          bySession.delete(s.id)
          return { ...existing, title: s.name || existing.title, group: groupLabel(s.updated_at), updatedAt: later(existing.updatedAt, s.updated_at) }
        })
        return [...local, ...fromDb, ...bySession.values()]
      })
    } catch (err) {
      console.log('读取会话列表失败', err.message)
    }
  }, [settings.accessCode])

  const loadMessages = useCallback(
    async (chat) => {
      const key = chat?.sessionId
      if (!key || loadedSessions.current.has(key) || loadingSessions.current.has(key)) return
      loadingSessions.current.add(key)
      try {
        const res = await listMessages(key, settings.accessCode)
        if (runs.current[chat.id]) return // 生成中先不覆盖，等结束后再读
        // 兼容旧后端（直接返回数组）和新后端（{ updated_at, messages }）
        const rows = Array.isArray(res) ? res : res.messages || []
        const dbTime = Array.isArray(res) ? null : res.updated_at || null
        if (dbTime) {
          setChats((cs) => cs.map((c) => (c.id === chat.id ? { ...c, updatedAt: later(c.updatedAt, dbTime) } : c)))
        }
        loadedSessions.current.add(key)
        setMessages((m) => ({ ...m, [chat.id]: rows.map(toMessage) }))
      } catch (err) {
        console.log('读取历史消息失败', err.message)
      } finally {
        loadingSessions.current.delete(key)
      }
    },
    [settings.accessCode],
  )

  // 打开页面、口令变化时读取（稍等一下，避免输入口令时每敲一个字就请求一次）
  useEffect(() => {
    const t = setTimeout(() => {
      reloadModels()
      reloadProviders()
      reloadSessions()
    }, 400)
    return () => clearTimeout(t)
  }, [reloadModels, reloadProviders, reloadSessions])

  const active = chats.find((c) => c.id === activeId) || chats[0]

  // 选中数据库会话时按需读取历史消息
  useEffect(() => {
    if (!active?.sessionId) return
    if (pending[active.id] || runs.current[active.id]) return
    loadMessages(active)
  }, [active, pending, loadMessages])

  const toggleSidebar = () => {
    if (window.matchMedia('(max-width: 1023px)').matches) setSidebarOpen((o) => !o)
    else setCollapsed((c) => !c)
  }

  const newChat = useCallback(() => {
    const id = 'c' + Date.now()
    setChats((cs) => [{ id, group: '今天', title: '新的对话' }, ...cs])
    setMessages((m) => ({ ...m, [id]: [] }))
    setActiveId(id)
    setSidebarOpen(false)
    return id
  }, [])

  // ---------- 流式生成（发送和重新生成共用） ----------
  const runStream = async (run, { sessionId, model, content, regenerateId, onFail }) => {
    const { chatId, assistantId, userLocalId } = run
    const update = (id, fn) =>
      setMessages((m) => ({ ...m, [chatId]: (m[chatId] || []).map((x) => (x.id === id ? fn(x) : x)) }))

    run.controller = new AbortController()
    runs.current[chatId] = run
    setStatus(chatId, run.kind === 'regen' ? 'streaming' : 'connecting')

    try {
      await streamChat({
        sessionId,
        model,
        content,
        regenerateId,
        accessCode: settings.accessCode,
        signal: run.controller.signal,
        onMeta: ({ session_id, user_message_id }) => {
          if (run.cancelled) return
          run.sessionId = session_id
          run.userDbId = user_message_id
          setChats((cs) => cs.map((c) => (c.id === chatId ? { ...c, sessionId: session_id } : c)))
          if (user_message_id && userLocalId) update(userLocalId, (x) => ({ ...x, dbId: user_message_id }))
          setStatus(chatId, 'streaming')
        },
        onDelta: (t) => update(assistantId, (x) => ({ ...x, text: x.text + t })),
        onReasoning: (t) => update(assistantId, (x) => ({ ...x, reasoning: (x.reasoning || '') + t })),
        onDone: (stats) => update(assistantId, (x) => ({ ...x, streaming: false, dbId: stats.id, stats })),
      })
    } catch (err) {
      if (!run.cancelled) onFail(err, (fn) => update(assistantId, fn))
    } finally {
      if (runs.current[chatId] === run) {
        // 本来就已经有完整历史（或本来就是新会话）时，本地状态就是完整的，不用再读一次
        if (run.sessionId && run.wasLoaded) loadedSessions.current.add(run.sessionId)
        delete runs.current[chatId]
        setStatus(chatId, '')
      }
    }
  }

  // 发送
  const send = (text, modelId) => {
    // 还没有任何对话时（开场白状态）直接新建一个再发
    let chatId = active?.id
    let chat = active
    if (!chatId) {
      chatId = newChat()
      chat = null
    }
    const userLocalId = crypto.randomUUID()
    const assistantId = crypto.randomUUID()
    // 新会话（还没有 sessionId）本地就是全部内容；老会话看历史是否已经读过
    const wasLoaded = chat?.sessionId ? loadedSessions.current.has(chat.sessionId) : true

    setMessages((m) => ({
      ...m,
      [chatId]: [
        ...(m[chatId] || []),
        { id: userLocalId, role: 'user', text },
        { id: assistantId, role: 'assistant', text: '', streaming: true },
      ],
    }))
    setChats((cs) =>
      cs.map((c) => (c.id === chatId && c.title === '新的对话' ? { ...c, title: text.slice(0, 16) } : c)),
    )

    runStream(
      { kind: 'send', chatId, userLocalId, assistantId, text, sessionId: chat?.sessionId, prevTitle: chat?.title, wasLoaded },
      {
        sessionId: chat?.sessionId,
        model: modelId,
        content: text,
        onFail: (err, patch) =>
          patch((x) => ({ ...x, streaming: false, text: x.text || `发送失败：${err.message}` })),
      },
    )
  }

  // 重新生成最后一条回复
  const regenerate = (old, modelId) => {
    const chatId = active?.id
    const chat = active
    if (!chatId || !chat?.sessionId || !old.dbId || pending[chatId]) return
    const assistantId = crypto.randomUUID()
    const wasLoaded = loadedSessions.current.has(chat.sessionId)

    setMessages((m) => ({
      ...m,
      [chatId]: (m[chatId] || []).map((x) =>
        x.id === old.id ? { id: assistantId, role: 'assistant', text: '', streaming: true } : x,
      ),
    }))

    runStream(
      { kind: 'regen', chatId, assistantId, old, sessionId: chat.sessionId, wasLoaded },
      {
        sessionId: chat.sessionId,
        model: modelId,
        regenerateId: old.dbId,
        onFail: (err, patch) => patch(() => ({ ...old, note: `重新生成失败：${err.message}` })),
      },
    )
  }

  // 停止并撤回。返回要放回输入框的文字（重新生成被停止时返回 null）
  const stop = () => {
    const chatId = active?.id
    if (!chatId) return null
    const run = runs.current[chatId]
    if (!run) return null
    run.cancelled = true
    run.controller.abort()
    delete runs.current[chatId]

    const edit = (fn) => setMessages((m) => ({ ...m, [chatId]: fn(m[chatId] || []) }))

    if (run.kind === 'regen') {
      edit((list) => list.map((x) => (x.id === run.assistantId ? run.old : x)))
      setStatus(chatId, '')
      return null
    }

    edit((list) => {
      const next = list.filter((x) => x.id !== run.userLocalId)
      return next
        .map((x) => {
          if (x.id !== run.assistantId) return x
          if (!x.text && !x.reasoning) return null // 还没吐出内容，不留空气泡
          return { ...x, streaming: false, note: '已停止，未保存' }
        })
        .filter(Boolean)
    })
    setChats((cs) =>
      cs.map((c) => (c.id === chatId && run.prevTitle === '新的对话' ? { ...c, title: run.prevTitle } : c)),
    )

    if (run.sessionId && run.userDbId) {
      setStatus(chatId, 'retracting')
      retractRound(run.sessionId, run.userDbId, settings.accessCode)
        .then((res) => {
          if (res.session_deleted) {
            // 后端已经把空会话删了：缓存清掉，侧栏同步移除，不等下一次刷新
            // activeId 为空时 active 默认是列表第一个，也算“正在看”
            const isShowing = !activeId || chatId === activeId
            loadedSessions.current.delete(run.sessionId)
            setChats((cs) => {
              // 正在看这个对话时，把刚保留的“已停止”内容留在界面上：
              // 会话已从数据库删除，这里降级成本地的新对话（不再关联 sessionId）
              if (isShowing) {
                return cs.map((c) =>
                  c.id === chatId ? { id: chatId, group: '今天', title: '新的对话' } : c,
                )
              }
              return cs.filter((c) => c.id !== chatId)
            })
            if (!isShowing) {
              setMessages((m) => {
                const next = { ...m }
                delete next[chatId]
                return next
              })
            }
          }
        })
        .catch((err) => window.alert(`数据库撤回失败：${err.message}`))
        .finally(() => {
          loadedSessions.current.delete(run.sessionId) // 撤回改过数据库，缓存作废
          setStatus(chatId, '')
        })
    } else {
      setStatus(chatId, '')
    }
    return run.text
  }

  // 删除一条消息：先改界面，再请求后端，失败就恢复
  const removeMessage = async (msg) => {
    if (!window.confirm('确定删除这条回复吗？')) return
    const chatId = active?.id
    if (!chatId) return
    const index = (messages[chatId] || []).findIndex((x) => x.id === msg.id)

    setMessages((m) => ({ ...m, [chatId]: (m[chatId] || []).filter((x) => x.id !== msg.id) }))
    if (!msg.dbId) return

    try {
      await deleteMessage(msg.dbId, settings.accessCode)
      const chat = chats.find((c) => c.id === chatId)
      if (chat?.sessionId) loadedSessions.current.delete(chat.sessionId) // 数据库变了，下次切回来重新读
    } catch (err) {
      setMessages((m) => {
        const list = [...(m[chatId] || [])]
        list.splice(Math.min(index, list.length), 0, msg)
        return { ...m, [chatId]: list }
      })
      window.alert(`删除失败：${err.message}`)
    }
  }

  // 删除当前会话：数据库删成功后再从界面移除
  const deleteChat = async () => {
    const chat = active
    if (!chat) return
    if (!window.confirm('确定删除这个对话和里面的全部消息吗？')) return
    if (chat.sessionId) {
      try {
        await deleteSession(chat.sessionId, settings.accessCode)
      } catch (err) {
        window.alert(`删除对话失败：${err.message}`)
        return
      }
      loadedSessions.current.delete(chat.sessionId)
    }
    setChats((cs) => cs.filter((c) => c.id !== chat.id))
    setMessages((m) => {
      const next = { ...m }
      delete next[chat.id]
      return next
    })
  }

  // 三处图片各读各的固定文件；上传的 base64 作为统一覆盖
  const userAvatarSrc = sidebarAvatarSrc(settings)
  const profileSrc = profileAvatarSrc(settings)
  // 助手头像直接用当前模型所属接口的图标
  const providerId = model?.provider_id ?? null
  const centerProviderId = providers.some((p) => p.id === providerId) ? providerId : null
  const botAvatarSrc = providerIconSrc(providerId)

  return (
    <>
      <div className={'app' + (collapsed ? ' sidebar-collapsed' : '')}>
        <Sidebar
          title={settings.splashTitle || '我们的家'}
          avatarSrc={userAvatarSrc}
          chats={chats}
          activeId={active?.id}
          open={sidebarOpen}
          providers={providers}
          centerProviderId={centerProviderId}
          onPick={(id) => {
            setActiveId(id)
            setSidebarOpen(false)
          }}
          onNew={newChat}
          onOpenSettings={() => {
            setSettingsOpen(true)
            setSidebarOpen(false)
          }}
          onDeleteChat={active ? deleteChat : null}
          onOpenModule={(kind, title) => {
            setPanel({ kind, title })
            setSidebarOpen(false)
          }}
          onClose={() => setSidebarOpen(false)}
        />
        {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} />}
        <ChatView
          messages={messages[active?.id] || []}
          status={pending[active?.id] || ''}
          lastUpdated={active?.updatedAt}
          models={models}
          model={model}
          onPickModel={pickModel}
          botAvatarSrc={botAvatarSrc}
          userName={settings.userName}
          hasProviders={providers.length > 0 || models.length > 0}
          onAddProvider={() => {
            setAddProviderIntent(true)
            setSettingsOpen(true)
          }}
          onSend={send}
          onStop={stop}
          onRegenerate={regenerate}
          onDelete={removeMessage}
          onOpenSidebar={toggleSidebar}
          onOpenPanel={setPanel}
        />
      </div>

      {panel && (
        <Panel
          panel={panel}
          avatarSrc={profileSrc}
          settings={settings}
          onClose={() => setPanel(null)}
        />
      )}

      {settingsOpen && (
        <Settings
          settings={settings}
          update={update}
          reset={reset}
          models={models}
          modelsError={modelsError}
          onModelsChanged={() => {
            reloadModels()
            reloadProviders()
          }}
          initialTab={addProviderIntent ? 'api' : 'basic'}
          autoAddProvider={addProviderIntent}
          onClose={() => {
            setSettingsOpen(false)
            setAddProviderIntent(false)
          }}
          onPreview={() => setSplash((n) => n + 1)}
        />
      )}

      {splash > 0 && (
        <Splash
          key={splash}
          src={resolveSrc(settings)}
          title={settings.splashTitle}
          hold={settings.holdSeconds}
          fade={settings.fadeSeconds}
          size={settings.iconSize}
          onDone={endSplash}
        />
      )}
    </>
  )
}