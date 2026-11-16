import { useCallback, useEffect, useState } from 'react'

const KEY = 'our-home:settings'

// 三处固定图片：直接替换 public/ 下的同名文件即可换图，不需要改代码或重新构建。
// 接口图标不在这里，按 providers.id 取 /avatars/<id>.png。
export const FIXED_IMAGES = {
  splash: '/images/splash.png', // 开场图
  sidebar: '/images/sidebar-avatar.png', // 侧栏头像
  profile: '/images/profile-avatar.png', // 个人主页头像
}

export const DEFAULTS = {
  splashEnabled: true,
  splashTitle: '我们的家', // 新增
  imagePath: '', // 可选：自定义开场图路径（http(s) 或 public/ 下的路径）；留空用固定文件
  imageData: '', // 通过“选择本地图片”读取到的内容（data URL），优先级最高
  imageName: '',
  holdSeconds: 1, // 图标完整显示的停留时间
  fadeSeconds: 2, // 渐隐时间（1–3 秒）
  iconSize: 120,
  accessCode: '',
  theme: 'rose',
  userName: '',
  startDate: '',
}

export const THEMES = [
  { id: 'rose', name: '暖粉', colors: ['#f8f5f2', '#f0d5d8'] },
  { id: 'cream', name: '奶白橘', colors: ['#faf9f5', '#d97757'] },
]

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}')
    // 旧版本默认的 /logo.png 实际不存在，清掉它，避免挡住固定开场图
    if (saved.imagePath === '/logo.png') saved.imagePath = ''
    return { ...DEFAULTS, ...saved }
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
  const reset = useCallback(() => setSettings((s) => ({ ...DEFAULTS, accessCode: s.accessCode, theme: s.theme, userName: s.userName, startDate: s.startDate })), [])

  return { settings, update, reset }
}

// 浏览器出于安全限制，不能直接读取 C:\ 或 /Users/ 这类磁盘路径
export function isDiskPath(p) {
  return /^[a-zA-Z]:[\\/]/.test(p) || /^\\\\/.test(p) || /^\/(Users|home|mnt)\//.test(p) || /^file:/.test(p)
}

export function resolveSrc(s) {
  if (s.imageData) return s.imageData
  const p = (s.imagePath || '').trim()
  if (!p || isDiskPath(p)) return FIXED_IMAGES.splash
  if (/^(https?:|data:|blob:|\/|\.\/)/.test(p)) return p
  return '/' + p
}

// 上传的图片是统一覆盖层；没有上传时，各位置读各自的固定文件，互不影响
export const sidebarAvatarSrc = (s) => s.imageData || FIXED_IMAGES.sidebar
export const profileAvatarSrc = (s) => s.imageData || FIXED_IMAGES.profile
