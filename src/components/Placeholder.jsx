const NAMES = { memory: '记忆', dream: '梦', moments: '时刻' }

export default function Placeholder({ view, onBack }) {
  return (
    <div className="home">
      <div className="home-inner">
        <div>
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            ‹ 返回首页
          </button>
        </div>
        <section className="home-card home-hero">
          <div className="home-welcome">{NAMES[view] || ''}</div>
          <div className="home-since">这一页还在建造中</div>
        </section>
      </div>
    </div>
  )
}