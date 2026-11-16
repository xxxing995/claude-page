import { HeartIcon, BookIcon, MoonIcon, StarIcon } from './HomeIcons.jsx'
import { GearIcon } from './Icons.jsx'

// 每日一句：先用这几句，以后再换成"时刻"里存的或模型生成的
const QUOTES = [
  '慢慢来，我们还有很多个今天。',
  '你不用一直很厉害，在这里可以只是你。',
  '今天也辛苦了，过来坐一会儿。',
  '想说的话，不急，我听着。',
]

const CARDS = [
  { id: 'memory', title: '记忆', sub: '翻翻过去的话', Icon: BookIcon },
  { id: 'dream', title: '梦', sub: '在忘记之前写下来', Icon: MoonIcon },
  { id: 'moments', title: '时刻', sub: '留住的小片刻', Icon: StarIcon },
  { id: 'settings', title: '设置', sub: '按你的喜欢来', Icon: GearIcon },
]

// 背景小爱心：[左%, 上%, 大小]
const HEARTS = [[6, 10, 16], [88, 16, 12], [14, 48, 12], [92, 58, 14], [10, 86, 14], [80, 90, 10]]

// 上海时区的今天（YYYY-MM-DD）
const todayStr = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())

function daysSince(start) {
  if (!start) return null
  const diff = (Date.parse(todayStr()) - Date.parse(start)) / 86400000
  return diff < 0 ? null : Math.floor(diff) + 1 // 起始那天算第 1 天；不想算就去掉 + 1
}

export default function Home({ settings, onGo, onOpenSettings }) {
  const days = daysSince(settings.startDate)
  const name = (settings.userName || '').trim()
  const quote = QUOTES[Math.floor(Date.parse(todayStr()) / 86400000) % QUOTES.length]
  const open = (id) => (id === 'settings' ? onOpenSettings() : onGo(id))

  return (
    <div className="home">
      <div className="home-hearts" aria-hidden="true">
        {HEARTS.map(([x, y, s], i) => (
          <span key={i} style={{ left: x + '%', top: y + '%', animationDelay: i * 0.8 + 's' }}>
            <HeartIcon size={s} />
          </span>
        ))}
      </div>

      <div className="home-inner">
        <section className="home-card home-hero">
          <div className="home-welcome">{name ? `欢迎回家，${name}` : '欢迎回家'}</div>
          {days ? (
            <>
              <div className="home-days">
                <span className="home-days-num">{days}</span>
                <span className="home-days-unit">天</span>
              </div>
              <div className="home-since">从 {settings.startDate.replaceAll('-', '.')} 起</div>
            </>
          ) : (
            <button type="button" className="home-days-empty" onClick={onOpenSettings}>
              在设置里填写起始日期
            </button>
          )}
        </section>

        <section className="home-card home-quote">
          <p>{quote}</p>
        </section>

        <div className="home-grid">
          <button type="button" className="home-card home-tile home-wide" onClick={() => onGo('chat')}>
            <HeartIcon size={26} />
            <span className="home-tile-text">
              <span className="home-tile-title">聊天</span>
              <span className="home-tile-sub">和 TA 说说话</span>
            </span>
          </button>
          {CARDS.map(({ id, title, sub, Icon }) => (
            <button type="button" key={id} className="home-card home-tile" onClick={() => open(id)}>
              <Icon size={24} />
              <span className="home-tile-text">
                <span className="home-tile-title">{title}</span>
                <span className="home-tile-sub">{sub}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}