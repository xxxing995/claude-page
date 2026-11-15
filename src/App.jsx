import { useCallback, useState } from 'react'
import Splash from './components/Splash.jsx'
import Sidebar from './components/Sidebar.jsx'
import ChatView from './components/ChatView.jsx'
import Settings from './components/Settings.jsx'
import { useSettings, resolveSrc } from './hooks/useSettings.js'
import { INITIAL_CHATS, INITIAL_MESSAGES } from './data.js'

export default function App() {
  const { settings, update, reset } = useSettings()

  // 开场动画：启动时按设置决定是否显示；设置页里的“预览开场”会重新播放
  const [splash, setSplash] = useState(settings.splashEnabled ? 1 : 0)
  const endSplash = useCallback(() => setSplash(0), [])

  const [chats, setChats] = useState(INITIAL_CHATS)
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [activeId, setActiveId] = useState('c1')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const active = chats.find((c) => c.id === activeId)

  const newChat = () => {
    const id = 'c' + Date.now()
    setChats((cs) => [{ id, group: '今天', title: '新的对话' }, ...cs])
    setMessages((m) => ({ ...m, [id]: [] }))
    setActiveId(id)
    setSidebarOpen(false)
  }

  const send = (text /*, modelId */) => {
    setMessages((m) => ({
      ...m,
      [activeId]: [...(m[activeId] || []), { id: Date.now(), role: 'user', text }],
    }))
    setChats((cs) =>
      cs.map((c) => (c.id === activeId && c.title === '新的对话' ? { ...c, title: text.slice(0, 16) } : c)),
    )
    // TODO: 在这里调用你的模型接口，拿到回复后用同样的方式追加一条
    // { id, role: 'assistant', blocks: [{ type: 'p', text: '…' }] }
  }

  const [collapsed, setCollapsed] = useState(false) // 电脑端：侧边栏是否收起

  const toggleSidebar = () => {
    if (window.matchMedia('(max-width: 719px)').matches) {
      setSidebarOpen((o) => !o) // 手机：抽屉
    } else {
      setCollapsed((c) => !c) // 电脑：收起/展开
    }
  }

  return (
    <>
      <div className={'app' + (collapsed ? ' sidebar-collapsed' : '')}>
        <Sidebar
          chats={chats}
          title={settings.splashTitle || '我们的家'}
          activeId={activeId}
          open={sidebarOpen}
          onPick={(id) => {
            setActiveId(id)
            setSidebarOpen(false)
          }}
          onNew={newChat}
          onOpenSettings={() => {
            setSettingsOpen(true)
            setSidebarOpen(false)
          }}
        />
        {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} />}
        <ChatView
          title={active?.title || ''}
          messages={messages[activeId] || []}
          onSend={send}
          onOpenSidebar={toggleSidebar}
        />
      </div>

      {settingsOpen && (
        <Settings
          settings={settings}
          update={update}
          reset={reset}
          onClose={() => setSettingsOpen(false)}
          onPreview={() => setSplash((n) => n + 1)}
        />
      )}

      {splash > 0 && (
        <Splash
          key={splash}
          title={settings.splashTitle}
          src={resolveSrc(settings)}
          hold={settings.holdSeconds}
          fade={settings.fadeSeconds}
          size={settings.iconSize}
          onDone={endSplash}
        />
      )}
    </>
  )
}
