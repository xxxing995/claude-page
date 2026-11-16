import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 版本号只从 package.json 取 version 字段，用 define 注入，
// 不整体 import 进前端包；发版时只改 package.json 这一处。
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true, // 端口被占用时直接报错，不再悄悄换成 5174
  },
})
