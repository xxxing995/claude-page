import { useCallback, useEffect, useState } from 'react'

const KEY = 'our-home:settings'

export const DEFAULTS = {
  splashEnabled: true,
  splashTitle: '我们的家', // 新增
  imagePath: '/logo.png', // 放在 public/ 目录下的图片，或一个 http(s) 地址
  imageData: '', // 通过“选择本地图片”读取到的内容（data URL），优先于路径
  imageName: '',
  holdSeconds: 1, // 图标完整显示的停留时间
  fadeSeconds: 2, // 渐隐时间（1–3 秒）
  iconSize: 120,
  accessCode: '',
}

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { ...DEFAULTS }
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      // 存储空间不足（比如图片太大）时忽略，本次会话内仍然生效
    }
  }, [settings])

  const update = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), [])
  const reset = useCallback(() => setSettings((s) => ({ ...DEFAULTS, accessCode: s.accessCode })), [])

  return { settings, update, reset }
}

// 浏览器出于安全限制，不能直接读取 C:\ 或 /Users/ 这类磁盘路径
export function isDiskPath(p) {
  return /^[a-zA-Z]:[\\/]/.test(p) || /^\\\\/.test(p) || /^\/(Users|home|mnt)\//.test(p) || /^file:/.test(p)
}

export function resolveSrc(s) {
  if (s.imageData) return s.imageData
  const p = (s.imagePath || '').trim()
  if (!p || isDiskPath(p)) return ''
  if (/^(https?:|data:|blob:|\/|\.\/)/.test(p)) return p
  return '/' + p
}
