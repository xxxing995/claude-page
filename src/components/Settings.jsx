import { useEffect, useRef, useState } from 'react'
import { isDiskPath, resolveSrc } from '../hooks/useSettings.js'
import { CloseIcon } from './Icons.jsx'

const MAX_BYTES = 2 * 1024 * 1024

function Slider({ label, value, min, max, step, unit, onChange }) {
  return (
    <label className="field">
      <span className="field-head">
        <span>{label}</span>
        <span className="field-value">
          {Number(value).toFixed(step < 1 ? 1 : 0)} {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

export default function Settings({ settings, update, reset, onClose, onPreview }) {
  const fileRef = useRef(null)
  const [error, setError] = useState('')
  const [imgOk, setImgOk] = useState(true)
  const src = resolveSrc(settings)
  const diskPath = isDiskPath((settings.imagePath || '').trim()) && !settings.imageData

  useEffect(() => setImgOk(true), [src])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const onFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('请选择图片文件')
    if (file.size > MAX_BYTES) return setError('图片请控制在 2MB 以内')
    const reader = new FileReader()
    reader.onload = () => {
      update({ imageData: String(reader.result), imageName: file.name })
      setError('')
    }
    reader.onerror = () => setError('读取失败，请换一张试试')
    reader.readAsDataURL(file)
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="modal-head">
          <h2 id="settings-title">设置</h2>
          <button type="button" className="icon-btn" aria-label="关闭" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <section className="section">
          <div className="section-title">开场动画</div>

          <label className="switch-row">
            <span>启动时显示开场动画</span>
            <input
              type="checkbox"
              role="switch"
              checked={settings.splashEnabled}
              onChange={(e) => update({ splashEnabled: e.target.checked })}
            />
          </label>
          <div className="field">
            <label htmlFor="splash-title" className="field-head">
              <span>开场标题</span>
            </label>
            <input
              id="splash-title"
              className="text-input"
              type="text"
              maxLength={20}
              placeholder="留空则不显示标题"
              value={settings.splashTitle}
              onChange={(e) => update({ splashTitle: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="img-path" className="field-head">
              <span>图标图片路径</span>
            </label>
            <input
              id="img-path"
              className="text-input"
              type="text"
              placeholder="/logo.png 或 https://…"
              value={settings.imagePath}
              onChange={(e) => update({ imagePath: e.target.value, imageData: '', imageName: '' })}
            />
            <div className="hint">
              把图片放进项目的 <code>public/</code> 文件夹，再填 <code>/文件名</code> 即可。
            </div>
            {diskPath && (
              <div className="warn">
                浏览器不能直接读取磁盘路径，请把图片放进 public/，或用下面的“选择本地图片”。
              </div>
            )}
          </div>

          <div className="row">
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              选择本地图片
            </button>
            {settings.imageData && (
              <button type="button" className="btn btn-ghost" onClick={() => update({ imageData: '', imageName: '' })}>
                清除所选
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
          </div>
          {settings.imageName && <div className="hint">当前使用：{settings.imageName}</div>}
          {error && <div className="warn">{error}</div>}

          <div className="preview">
            {src && imgOk ? (
              <img src={src} alt="图标预览" onError={() => setImgOk(false)} />
            ) : (
              <span className="hint">{src ? '这个路径读取不到图片，开场会显示默认图标' : '未设置图片，开场会显示默认图标'}</span>
            )}
          </div>

          <Slider
            label="停留时间"
            value={settings.holdSeconds}
            min={0.5}
            max={3}
            step={0.1}
            unit="秒"
            onChange={(v) => update({ holdSeconds: v })}
          />
          <Slider
            label="渐隐时间"
            value={settings.fadeSeconds}
            min={1}
            max={3}
            step={0.1}
            unit="秒"
            onChange={(v) => update({ fadeSeconds: v })}
          />
          <Slider
            label="图标大小"
            value={settings.iconSize}
            min={64}
            max={200}
            step={8}
            unit="px"
            onChange={(v) => update({ iconSize: v })}
          />
        </section>

        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={reset}>
            恢复默认
          </button>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onPreview}>
            预览开场
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            完成
          </button>
        </div>
      </div>
    </div>
  )
}
