import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode は使わない（imperative なチャンク描画/入力リスナの二重マウントを避ける）。
createRoot(document.getElementById('root')!).render(<App />)
