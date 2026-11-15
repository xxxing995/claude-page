import { useEffect, useRef, useState } from 'react'
import { HouseIcon } from './Icons.jsx'

/**
 * 开场动画：图标淡入 → 停留 hold 秒 → 整层渐隐 fade 秒 → onDone
 * 点击任意位置可以跳过。
 */
export default function Splash({ src, title, hold, fade, size, onDone }) {
  const [fading, setFading] = useState(false)
  const [failed, setFailed] = useState(false)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    // 至少停留 0.3 秒，保证渐隐的 transition 一定会触发
    const holdMs = Math.max(hold, 0.3) * 1000
    const t1 = setTimeout(() => setFading(true), holdMs)
    const t2 = setTimeout(() => doneRef.current(), holdMs + fade * 1000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [hold, fade])

  useEffect(() => setFailed(false), [src])

  const showImage = src && !failed

  return (
    <div
      className="splash"
      style={{ opacity: fading ? 0 : 1, transition: `opacity ${fade}s ease` }}
      role="button"
      tabIndex={0}
      aria-label="跳过开场动画"
      onClick={() => doneRef.current()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && doneRef.current()}
    >
      {showImage ? (
        <img
          className="splash-icon"
          src={src}
          alt=""
          draggable={false}
          style={{ width: size, height: size }}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="splash-icon splash-fallback" style={{ width: size, height: size }}>
          <HouseIcon size={Math.round(size * 0.5)} />
        </div>
      )}
      <div className="splash-name">{title}</div>
    </div>
  )
}
