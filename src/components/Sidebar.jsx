import { HouseIcon, PlusIcon, GearIcon } from './Icons.jsx'

export default function Sidebar({ chats, activeId, open, onPick, onNew, onOpenSettings, onHome, title }) {
  return (
    <aside className={'sidebar' + (open ? ' open' : '')}>
      <button type="button" className="brand" onClick={onHome} aria-label="回到首页">
        <span className="brand-mark">
          <HouseIcon />
        </span>
        <span className="brand-name">{title}</span>
      </button>

      <button type="button" className="new-chat" onClick={onNew}>
        <PlusIcon />
        <span>开始新的对话</span>
      </button>

      <nav className="chat-list" aria-label="对话列表">
        {chats.map((c, i) => (
          <div key={c.id}>
            {(i === 0 || chats[i - 1].group !== c.group) && <div className="group-label">{c.group}</div>}
            <button
              type="button"
              className={'chat-item' + (c.id === activeId ? ' active' : '')}
              aria-current={c.id === activeId ? 'true' : undefined}
              onClick={() => onPick(c.id)}
            >
              <span>{c.title}</span>
            </button>
          </div>
        ))}
      </nav>

      <button type="button" className="side-link" onClick={onOpenSettings}>
        <GearIcon />
        <span>设置</span>
      </button>
    </aside>
  )
}
