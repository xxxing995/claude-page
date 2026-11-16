import { useState } from 'react'
import { HouseIcon } from './Icons.jsx'

// 头像：有图片就用图片，加载失败或没配置时退回图标
export default function Avatar({ src, className = 'avatar', fallback = 'icon' }) {
  // 记下失败的那个地址而不是布尔值：换图（比如切模型）后可以重新尝试加载
  const [failedSrc, setFailedSrc] = useState('')
  const failed = !!src && failedSrc === src
  return (
    <div className={className}>
      {src && !failed ? (
        <img src={src} alt="" onError={() => setFailedSrc(src)} />
      ) : fallback === 'heart' ? (
        <span className="avatar-glyph">♡</span>
      ) : (
        <HouseIcon size={17} />
      )}
    </div>
  )
}
