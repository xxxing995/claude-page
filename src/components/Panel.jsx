import { useEffect } from 'react'
import { CloseIcon } from './Icons.jsx'
import Avatar from './Avatar.jsx'

const TITLES = {
  doc: '文档',
  tasks: '任务',
  more: '更多',
  attach: '附件',
  memory: '记忆',
  dream: '梦',
  moments: '时刻',
  profile: '个人主页',
}

// 上海时区的今天（YYYY-MM-DD）
const todayStr = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())

function daysSince(start) {
  if (!start) return null
  const diff = (Date.parse(todayStr()) - Date.parse(start)) / 86400000
  return diff < 0 ? null : Math.floor(diff) + 1
}

// 占位面板：右上三个按钮和侧栏模块共用，只有标题和关闭，没有实际功能
export default function Panel({ panel, avatarSrc, settings, onClose }) {
  const kind = panel.kind
  const heading = panel.title || TITLES[kind] || ''

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const days = daysSince(settings.startDate)
  const name = (settings.userName || '').trim() || settings.splashTitle || '我们的家'

  return (
    <div className="panel-backdrop" onClick={onClose}>
      <section
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>{heading}</h2>
          <button type="button" className="icon-btn" aria-label="关闭" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="panel-body">
          {kind === 'profile' && (
            <div className="panel-profile">
              <Avatar className="sb-avatar" fallback="heart" src={avatarSrc} />
              <div className="sb-name">{name}</div>
              <div className="sb-date">
                {days
                  ? `第 ${days} 天 · 从 ${(settings.startDate || '').replaceAll('-', '.')} 起`
                  : '还没填写起始日期'}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
