import { useEffect, useState } from 'react'
import { listProviders, discoverModels, createProvider, updateProvider, deleteProvider } from '../api.js'

// 和后端一致：去掉结尾的 / 和 /v1，用来判断地址有没有变
const norm = (u) => (u || '').trim().replace(/\/+$/, '').replace(/\/v1$/, '')

export default function ProvidersEditor({ models, accessCode, onChanged, autoAdd = false }) {
  const [providers, setProviders] = useState([])
  const [listError, setListError] = useState('')

  // autoAdd：从对话页点“添加 API”进来时，直接展开新增表单
  const [form, setForm] = useState(autoAdd ? { name: '', base_url: '', api_key: '' } : null) // { id?, name, base_url, api_key }
  const [rows, setRows] = useState(null) // 读取到的模型：[{ up, label, checked, missing? }]
  const [defaultUp, setDefaultUp] = useState(null)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setProviders(await listProviders(accessCode))
      setListError('')
    } catch (e) {
      setProviders([])
      setListError(e.message)
    }
  }
  useEffect(() => {
    load()
  }, [accessCode]) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setError('')
    setFilter('')
    setShowKey(false)
    setConnecting(false)
  }
  const openNew = () => {
    reset()
    setForm({ name: '', base_url: '', api_key: '' })
    setRows(null)
    setDefaultUp(null)
    setConnected(false)
  }
  const openEdit = (p) => {
    reset()
    const mine = models.filter((m) => m.provider_id === p.id)
    setForm({ id: p.id, name: p.name, base_url: p.base_url, api_key: '' })
    setRows(mine.map((m) => ({ up: m.upstream_model, label: m.label, checked: true })))
    setDefaultUp(mine.find((m) => m.is_default)?.upstream_model ?? null)
    setConnected(true) // 没改地址和密钥就不用重新连接
  }
  const close = () => {
    reset()
    setForm(null)
    setRows(null)
  }

  // 地址或密钥一改，就需要重新连接
  const setUrl = (v) => {
    setForm((f) => ({ ...f, base_url: v }))
    setConnected(false)
  }
  const setKey = (v) => {
    setForm((f) => ({ ...f, api_key: v }))
    setConnected(false)
  }

  const orig = form?.id ? providers.find((p) => p.id === form.id) : null
  const canUseStored = !!orig && norm(orig.base_url) === norm(form?.base_url)
  const canConnect = !!form && !!form.base_url.trim() && (!!form.api_key.trim() || canUseStored)

  // 步骤 3：连接，读取可选模型
  const connect = async () => {
    setConnecting(true)
    setError('')
    try {
      const { models: ids } = await discoverModels(
        { provider_id: form.id, base_url: form.base_url, api_key: form.api_key },
        accessCode,
      )
      setRows((prev) => {
        const old = new Map((prev || []).map((r) => [r.up, r]))
        const merged = ids.map((up) => old.get(up) ?? { up, label: up.slice(0, 30), checked: false })
        for (const r of prev || []) if (!ids.includes(r.up)) merged.push({ ...r, missing: true }) // 以前加过、这次没返回的也保留
        return merged
      })
      setConnected(true)
    } catch (e) {
      setError(e.message)
      setConnected(false)
    } finally {
      setConnecting(false)
    }
  }

  const toggle = (up, checked) => {
    setRows((rs) => rs.map((r) => (r.up === up ? { ...r, checked } : r)))
    if (!checked && defaultUp === up) setDefaultUp(null)
  }
  const rename = (up, label) => setRows((rs) => rs.map((r) => (r.up === up ? { ...r, label } : r)))

  const picked = (rows || []).filter((r) => r.checked)
  const canSave = !busy && connected && !!form?.name.trim() && picked.length > 0

  // 步骤 4：保存
  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const payload = {
        name: form.name,
        base_url: form.base_url,
        api_key: form.api_key,
        models: picked.map((r) => ({ upstream_model: r.up, label: r.label })),
        default_upstream: defaultUp,
      }
      if (form.id) await updateProvider(form.id, payload, accessCode)
      else await createProvider(payload, accessCode)
      close()
      await load()
      await onChanged()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (p) => {
    const n = models.filter((m) => m.provider_id === p.id).length
    if (!window.confirm(`删除“${p.name}”${n ? `及其下的 ${n} 个模型` : ''}？`)) return
    try {
      await deleteProvider(p.id, accessCode)
      await load()
      await onChanged()
    } catch (e) {
      window.alert(`删除失败：${e.message}`)
    }
  }

  const shown = (rows || []).filter((r) => r.up.toLowerCase().includes(filter.trim().toLowerCase()))

  return (
    <section className="section">
      <div className="section-title">接口与密钥</div>

      {listError && <div className="warn">读取失败：{listError}（请先在“基础”页填写正确的访问口令）</div>}

      {providers.map((p) => (
        <div className="model-row" key={p.id}>
          <div className="model-row-main">
            <div className="model-row-title">
              <span>{p.name}</span>
              <span className="tag">id {p.id}</span>
              <span className="tag">密钥已保存</span>
            </div>
            <div className="model-row-sub">{p.base_url}</div>
            <div className="model-row-sub">{models.filter((m) => m.provider_id === p.id).length} 个模型</div>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => openEdit(p)}>
            编辑
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => remove(p)}>
            删除
          </button>
        </div>
      ))}

      {!form && (
        <div className="row">
          <button type="button" className="btn" onClick={openNew}>
            添加接口
          </button>
        </div>
      )}

      {form && (
        <div className="model-form">
          <label className="field">
            <span>名称</span>
            <input
              className="text-input"
              value={form.name}
              placeholder="随便起，如：我的中转站"
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>

          <label className="field">
            <span>1. API 地址</span>
            <input
              className="text-input"
              value={form.base_url}
              placeholder="https://api.example.com（不用带 /v1）"
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>

          <div className="field">
            <span>2. 密钥</span>
            <div className="key-row">
              <input
                className="text-input"
                type={showKey ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.api_key}
                placeholder={form.id ? '留空则使用已保存的密钥' : '粘贴你的 API 密钥'}
                onChange={(e) => setKey(e.target.value)}
              />
              <button type="button" className="btn" onClick={() => setShowKey((v) => !v)}>
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
            {form.id && !canUseStored && <div className="hint">更换了 API 地址，需要重新输入密钥。</div>}
          </div>

          <div className="field">
            <span>3. 连接并读取可选模型</span>
            <div className="row">
              <button type="button" className="btn" disabled={!canConnect || connecting} onClick={connect}>
                {connecting ? '连接中…' : connected && rows?.length ? '重新连接' : '连接'}
              </button>
            </div>
            {connected && rows && <div className="hint">连接成功，下面勾选要使用的模型。</div>}
          </div>

          {error && <div className="warn">{error}</div>}

          {rows && rows.length > 0 && (
            <div className="field">
              <span>勾选要使用的模型（已选 {picked.length} 个）</span>
              {rows.length > 8 && (
                <input
                  className="text-input"
                  value={filter}
                  placeholder="搜索模型名"
                  onChange={(e) => setFilter(e.target.value)}
                />
              )}
              <div className="pick-list">
                {shown.map((r) => (
                  <div className="pick-row" key={r.up}>
                    <label className="pick-main">
                      <input type="checkbox" checked={r.checked} onChange={(e) => toggle(r.up, e.target.checked)} />
                      <span>
                        {r.up}
                        {r.missing ? '（接口这次没有返回）' : ''}
                      </span>
                    </label>
                    {r.checked && (
                      <div className="pick-extra">
                        <input
                          className="text-input"
                          aria-label={`${r.up} 的显示名`}
                          maxLength={30}
                          value={r.label}
                          onChange={(e) => rename(r.up, e.target.value)}
                        />
                        <label className="pick-default">
                          <input
                            type="radio"
                            name="default-model"
                            checked={defaultUp === r.up}
                            onChange={() => setDefaultUp(r.up)}
                          />
                          默认
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="hint">右边的输入框是在对话顶部显示的名字，可以改。取消勾选并保存，会移除这个模型。</div>
            </div>
          )}

          <div className="row">
            <button type="button" className="btn btn-primary" disabled={!canSave} onClick={save}>
              4. 保存
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={close}>
              取消
            </button>
          </div>
          {!connected && <div className="hint">需要先连接成功，才能保存。</div>}
        </div>
      )}
    </section>
  )
}