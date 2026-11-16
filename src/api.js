const API_URL = import.meta.env.VITE_API_URL

export async function streamChat({ sessionId, model, content, regenerateId, accessCode, signal, onMeta, onDelta, onReasoning, onDone }) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Access-Code': accessCode || '' },
    body: JSON.stringify({
      session_id: sessionId ?? null,
      model,
      content: content ?? '',
      regenerate_message_id: regenerateId ?? null,
    }),
    signal,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `请求失败（${res.status}）`)
  }

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const parts = buf.split('\n\n')
    buf = parts.pop()
    for (const part of parts) {
      let event = 'message'
      let data = ''
      for (const line of part.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data += line.slice(5).trim()
      }
      if (!data) continue
      const obj = JSON.parse(data)
      if (event === 'meta') onMeta?.(obj)
      else if (event === 'delta') onDelta?.(obj.text)
      else if (event === 'reasoning') onReasoning?.(obj.text)
      else if (event === 'done') onDone?.(obj)
      else if (event === 'error') throw new Error(obj.message || '生成中断')
    }
  }
}

// 把回复文本按空行拆成段落
export function textToBlocks(text) {
  return text
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((t) => ({ type: 'p', text: t }))
}

async function del(path, accessCode) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: { 'X-Access-Code': accessCode || '' },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `删除失败（${res.status}）`)
  }
}

export const deleteMessage = (id, accessCode) => del(`/api/messages/${id}`, accessCode)
export const deleteSession = (id, accessCode) => del(`/api/sessions/${id}`, accessCode)

export async function retractRound(sessionId, userMessageId, accessCode) {
  const res = await fetch(`${API_URL}/api/chat/retract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Access-Code': accessCode || '' },
    body: JSON.stringify({ session_id: sessionId, user_message_id: userMessageId }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `撤回失败（${res.status}）`)
  return data
}

async function call(method, path, body, accessCode) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Access-Code': accessCode || '' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`)
  return data
}

export const listModels = (accessCode) => call('GET', '/api/models', null, accessCode)
export const listSessions = (accessCode) => call('GET', '/api/sessions', null, accessCode)
export const listMessages = (sessionId, accessCode) => call('GET', `/api/sessions/${sessionId}/messages`, null, accessCode)
export const listProviders = (accessCode) => call('GET', '/api/providers', null, accessCode)
export const discoverModels = (data, accessCode) => call('POST', '/api/providers/discover', data, accessCode)
export const createProvider = (data, accessCode) => call('POST', '/api/providers', data, accessCode)
export const updateProvider = (id, data, accessCode) => call('PATCH', `/api/providers/${id}`, data, accessCode)
export const deleteProvider = (id, accessCode) => call('DELETE', `/api/providers/${id}`, null, accessCode)