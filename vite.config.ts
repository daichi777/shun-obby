import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // voxel コアの純関数（coords など）を Node 環境でユニットテストする
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
