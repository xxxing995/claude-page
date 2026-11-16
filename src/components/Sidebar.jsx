/* global __APP_VERSION__ */
import { Fragment } from 'react'
import { CloseIcon, PlusIcon } from './Icons.jsx'
import Avatar from './Avatar.jsx'
import ProviderStrip from './ProviderStrip.jsx'

const MODULES = [
  { id: 'profile', title: '个人主页' },
  { id: 'memory', title: '记忆' },
  { id: 'dream', title: '梦' },
  { id: 'moments', title: '时刻' },
]

const DATE_PARTS = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
}).formatToParts(new Date())

const part = (type) => DATE_PARTS.find((p) => p.type === type)?.value || ''
const TODAY_LABEL = `${part('month').replace('月', '')} 月 ${part('day').replace('日', '')} 日 · ${part('weekday')}`

export default function Sidebar({
  title,
  avatarSrc,
  chats,
  activeId,
  open,
  providers,
  centerProviderId,
  onPick,
  onNew,
  onOpenSettings,
  onDeleteChat,
  onOpenModule,
  onClose,
}) {
  return (
    <aside className={'sidebar' + (open ? ' open' : '')}>
      <div className="sb-top">
        <button type="button" className="sb-close" aria-label="关闭侧栏" onClick={onClose}>
          <CloseIcon size={18} />
        </button>

        <Avatar className="sb-avatar" fallback="heart" src={avatarSrc} />
        <div className="sb-name">{title}</div>
        <div className="sb-date">{TODAY_LABEL}</div>

        <ProviderStrip providers={providers} centerId={centerProviderId} resetKey={activeId} />
      </div>

      <nav className="sb-nav" aria-label="模块">
        {MODULES.map((m) => (
          <button key={m.id} type="button" className="idx-row" onClick={() => onOpenModule(m.id, m.title)}>
            <span>{m.title}</span>
          </button>
        ))}
      </nav>

      <div className="sb-chats" aria-label="对话列表">
        <div className="idx-label">对话</div>
        <button type="button" className="idx-row idx-new" onClick={onNew}>
          <span>新对话</span>
          <PlusIcon size={16} />
        </button>

        {chats.map((c, i) => (
          <Fragment key={c.id}>
            {(i === 0 || chats[i - 1].group !== c.group) && <div className="idx-group">{c.group}</div>}
            <button
              type="button"
              className={'idx-row idx-chat' + (c.id === activeId ? ' active' : '')}
              aria-current={c.id === activeId ? 'true' : undefined}
              onClick={() => onPick(c.id)}
            >
              <span>{c.title}</span>
            </button>
          </Fragment>
        ))}
      </div>

      <div className="sb-foot">
        <button type="button" className="idx-row idx-settings" onClick={onOpenSettings}>
          <span>设置</span>
          <span className="idx-pill">Settings</span>
        </button>
        {onDeleteChat && (
          <button type="button" className="idx-row idx-sub" onClick={onDeleteChat}>
            <span>删除当前对话</span>
          </button>
        )}
        <div className="sb-mark">SHUISHUI · v{__APP_VERSION__}</div>
      </div>
    </aside>
  )
}
