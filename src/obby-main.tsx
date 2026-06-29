import { createRoot } from 'react-dom/client'
import './index.css'
import ObbyApp from './ObbyApp.tsx'

// Roblox 風 obby ゲーム専用エントリ（obby.html から読み込まれる）。
// StrictMode なし（imperative な入力リスナ等の二重マウントを避ける）。
createRoot(document.getElementById('root')!).render(<ObbyApp />)
