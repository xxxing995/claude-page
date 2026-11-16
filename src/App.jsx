import { useCallback, useEffect, useRef, useState } from 'react'
import Splash from './components/Splash.jsx'
import Sidebar from './components/Sidebar.jsx'
import ChatView from './components/ChatView.jsx'
import Settings from './components/Settings.jsx'
import { useSettings, resolveSrc } from './hooks/useSettings.js'
import { INITIAL_CHATS, INITIAL_MESSAGES } from './data.js'
import { streamChat, deleteMessage, retractRound, listModels } from './api.js'
import Home from './components/Home.jsx'
import Placeholder from './components/Placeholder.jsx'

export default function App() {
  const { settings, update, reset } = useSettings()
    useEffect(() => {
    document.documentElement.dataset.theme = settings.theme || 'rose'
  }, [settings.theme])

    // 页面切换：home | chat | memory | dream | moments
  const [view, setView] = useState(() => window.history.state?.v || 'home')
  const go = useCallback((v) => {
    setView(v)
    window.history.pushState({ v }, '')
  }, [])
  const goHome = () => (window.history.state?.v ? window.history.back() : setView('home'))
  useEffect(() => {
    const onPop = (e) => setView(e.state?.v || 'home')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // 开场动画
  const [splash, setSplash] = useState(settings.splashEnabled ? 1 : 0)
  const endSplash = useCallback(() => setSplash(0), [])

  // 对话
  const [chats, setChats] = useState(INITIAL_CHATS)
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [activeId, setActiveId] = useState('c1')
  const [sidebarOpen, setSidebarOpen] = useState(false) // 手机：抽屉
  const [collapsed, setCollapsed] = useState(false) // 电脑：收起
  const [settingsOpen, setSettingsOpen] = useState(false)

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

  // 打开页面、口令变化时读取（稍等一下，避免输入口令时每敲一个字就请求一次）
  useEffect(() => {
    const t = setTimeout(reloadModels, 400)
    return () => clearTimeout(t)
  }, [reloadModels])

  const active = chats.find((c) => c.id === activeId)

  const toggleSidebar = () => {
    if (window.matchMedia('(max-width: 719px)').matches) setSidebarOpen((o) => !o)
    else setCollapsed((c) => !c)
  }

  const newChat = () => {
    const id = 'c' + Date.now()
    setChats((cs) => [{ id, group: '今天', title: '新的对话' }, ...cs])
    setMessages((m) => ({ ...m, [id]: [] }))
    setActiveId(id)
    setSidebarOpen(false)
  }

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
        delete runs.current[chatId]
        setStatus(chatId, '')
      }
    }
  }

  // 发送
  const send = (text, modelId) => {
    const chatId = activeId
    const chat = chats.find((c) => c.id === chatId)
    const userLocalId = crypto.randomUUID()
    const assistantId = crypto.randomUUID()

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
      { kind: 'send', chatId, userLocalId, assistantId, text, sessionId: chat?.sessionId, prevTitle: chat?.title },
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
    const chatId = activeId
    const chat = chats.find((c) => c.id === chatId)
    if (!chat?.sessionId || !old.dbId || pending[chatId]) return
    const assistantId = crypto.randomUUID()

    setMessages((m) => ({
      ...m,
      [chatId]: (m[chatId] || []).map((x) =>
        x.id === old.id ? { id: assistantId, role: 'assistant', text: '', streaming: true } : x,
      ),
    }))

    runStream(
      { kind: 'regen', chatId, assistantId, old, sessionId: chat.sessionId },
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
    const chatId = activeId
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

    edit((list) => list.filter((x) => x.id !== run.userLocalId && x.id !== run.assistantId))
    setChats((cs) =>
      cs.map((c) => (c.id === chatId && run.prevTitle === '新的对话' ? { ...c, title: run.prevTitle } : c)),
    )

    if (run.sessionId && run.userDbId) {
      setStatus(chatId, 'retracting')
      retractRound(run.sessionId, run.userDbId, settings.accessCode)
        .then((res) => {
          if (res.session_deleted) {
            setChats((cs) => cs.map((c) => (c.id === chatId ? { ...c, sessionId: undefined } : c)))
          }
        })
        .catch((err) => window.alert(`数据库撤回失败：${err.message}`))
        .finally(() => setStatus(chatId, ''))
    } else {
      setStatus(chatId, '')
    }
    return run.text
  }

  // 删除一条消息：先改界面，再请求后端，失败就恢复
  const removeMessage = async (msg) => {
    if (!window.confirm('确定删除这条回复吗？')) return
    const chatId = activeId
    const index = (messages[chatId] || []).findIndex((x) => x.id === msg.id)

    setMessages((m) => ({ ...m, [chatId]: (m[chatId] || []).filter((x) => x.id !== msg.id) }))
    if (!msg.dbId) return

    try {
      await deleteMessage(msg.dbId, settings.accessCode)
    } catch (err) {
      setMessages((m) => {
        const list = [...(m[chatId] || [])]
        list.splice(Math.min(index, list.length), 0, msg)
        return { ...m, [chatId]: list }
      })
      window.alert(`删除失败：${err.message}`)
    }
  }

  return (
    <>
      {view === 'home' && <Home settings={settings} onGo={go} onOpenSettings={() => setSettingsOpen(true)} />}
      {view !== 'home' && view !== 'chat' && <Placeholder view={view} onBack={goHome} />}
      <div className={'app' + (collapsed ? ' sidebar-collapsed' : '')} hidden={view !== 'chat'}>
        <Sidebar
          title={settings.splashTitle || '我们的家'}
          chats={chats}
          activeId={activeId}
          open={sidebarOpen}
          onPick={(id) => {
            setActiveId(id)
            setSidebarOpen(false)
          }}
          onNew={newChat}
          onHome={() => {
            setSidebarOpen(false)
            goHome()
          }}
          onOpenSettings={() => {
            setSettingsOpen(true)
            setSidebarOpen(false)
          }}
        />
        {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} />}
        <ChatView
          title={active?.title || ''}
          messages={messages[activeId] || []}
          status={pending[activeId] || ''}
          models={models}
          onOpenSettings={() => setSettingsOpen(true)}
          onSend={send}
          onStop={stop}
          onRegenerate={regenerate}
          onDelete={removeMessage}
          onOpenSidebar={toggleSidebar}
        />
      </div>

      {settingsOpen && (
        <Settings
          settings={settings}
          update={update}
          reset={reset}
          models={models}
          modelsError={modelsError}
          onModelsChanged={reloadModels}
          onClose={() => setSettingsOpen(false)}
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