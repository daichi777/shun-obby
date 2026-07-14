import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // マルチページ: index.html（ボクセル）と obby.html（Roblox風広場）の両方をビルドする。
    // これが無いと dist に index.html しか出ず、デプロイ先で obby が 404 になる。
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        obby: fileURLToPath(new URL('./obby.html', import.meta.url)),
      },
    },
  },
  test: {
    // voxel コアの純関数（coords など）を Node 環境でユニットテストする
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
