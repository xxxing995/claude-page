import { useCallback, useEffect, useRef, useState } from 'react'
import { providerIconSrc } from '../providerIcon.js'

// 没有文件或加载失败时留空白圆圈，不放任何假图
function ProviderIcon({ id }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return <img src={providerIconSrc(id)} alt="" onError={() => setFailed(true)} />
}

// 接口条：横向滚动 + 吸附，中心位固定为当前选中模型所属的接口
export default function ProviderStrip({ providers, centerId, resetKey }) {
  const trackRef = useRef(null)
  const items = useRef(new Map())
  const [fitted, setFitted] = useState(true)

  // 内容比可视宽度窄时不再滚动，直接居中排开
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const measure = () => {
      const nodes = [...items.current.values()]
      const content = nodes.reduce((sum, n) => sum + n.offsetWidth, 0) + Math.max(0, nodes.length - 1) * 10
      setFitted(nodes.length === 0 || content <= el.clientWidth)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [providers])

  const centerOn = useCallback(() => {
    const el = trackRef.current
    const item = items.current.get(centerId)
    if (!el || !item) return
    const box = el.getBoundingClientRect()
    const rect = item.getBoundingClientRect()
    const left = rect.left - box.left + el.scrollLeft - (el.clientWidth - rect.width) / 2
    el.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  }, [centerId])

  // 进入页面、切换模型、切换会话、尺寸变化时回到中心位
  useEffect(() => {
    centerOn()
  }, [centerOn, resetKey, providers.length, fitted])

  // 手动滑走后，点页面其他地方自动回弹到中心位
  useEffect(() => {
    const onDown = (e) => {
      const el = trackRef.current
      if (!el || el.contains(e.target)) return
      const item = items.current.get(centerId)
      if (!item) return
      const box = el.getBoundingClientRect()
      const rect = item.getBoundingClientRect()
      const target = Math.max(0, rect.left - box.left + el.scrollLeft - (el.clientWidth - rect.width) / 2)
      if (Math.abs(el.scrollLeft - target) > 2) el.scrollTo({ left: target, behavior: 'smooth' })
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [centerId])

  if (!providers.length) {
    return (
      <div className="provider-strip is-empty" aria-label="接口">
        <span className="provider-chip is-blank" aria-hidden="true" />
        <span className="provider-hint">还没有配置接口</span>
      </div>
    )
  }

  return (
    <div className="provider-strip" ref={trackRef} aria-label="接口">
      <div className={'provider-track' + (fitted ? ' is-fitted' : '')}>
        {providers.map((p) => (
          <button
            key={p.id}
            type="button"
            ref={(node) => {
              if (node) items.current.set(p.id, node)
              else items.current.delete(p.id)
            }}
            className={'provider-chip' + (p.id === centerId ? ' is-center' : '')}
            aria-label={p.name || '接口'}
            aria-current={p.id === centerId ? 'true' : undefined}
          >
            <ProviderIcon id={p.id} />
          </button>
        ))}
      </div>
    </div>
  )
}
