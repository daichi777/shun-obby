// Roblox 風 obby＋広場ゲームの組み立て（旧メイン体験）。
// 現在のメイン(index.html)は Minecraft 風ボクセルに切り替わっているため、
// こちらは専用エントリ obby.html / obby-main.tsx から起動する（ボクセル側は無改変）。
//
// 部品はすべて温存ずみ: Player / Course(+Environment) / Coin / PlacementSystem(設置)
// / BuildUI(おみせ等) / TouchControls(モバイル) / Sparkles(コインのキラキラ)。

import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { KeyboardControls, Sky } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { Player } from './game/Player'
import { Course } from './game/Course'
import { EnvNpcs } from './game/EnvNpcs'
import { Coin } from './game/Coin'
import { COINS } from './game/level'
import { Sparkles } from './game/fx/Sparkles'
import { PlacementSystem } from './game/build/PlacementSystem'
import { setupBuildDebug } from './game/build/debug'
import { loadSave, startAutosave } from './game/build/persist'
import { BuildUI } from './ui/BuildUI'
import { TopTabs } from './ui/TopTabs'
import { StatusBar } from './ui/StatusBar'
import { QuestPanel } from './ui/QuestPanel'
import { Hotbar } from './ui/Hotbar'
import { IndexPanel } from './ui/IndexPanel'
import { TouchControls } from './ui/mobile/TouchControls'
import { useGame } from './store'

// ecctrl が読む入力マップ（forward/backward/leftward/rightward/jump/run）
const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'leftward', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'rightward', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'run', keys: ['Shift'] },
]

function Hud() {
  // コイン数は StatusBar（左上）に移動。ここは操作ヒントだけ。
  return (
    <div className="hud">
      <div className="hint">
        WASD / やじるし で うごく ・ スペース で ジャンプ
        <br />
        F で いちにんしょう（のりこみ視点）・ コインを あつめて 🏪おみせで かおう！
      </div>
    </div>
  )
}

export default function ObbyApp() {
  const setTotal = useGame((s) => s.setTotal)
  useEffect(() => {
    setTotal(COINS.length)
    setupBuildDebug()
    loadSave() // 前回の作品（おさいふ・もちもの・設置したもの）を復元
    startAutosave() // 変更を自動保存（ページを閉じても残る）
  }, [setTotal])

  return (
    <>
      <Hud />
      <TopTabs />
      <StatusBar />
      <QuestPanel />
      <Hotbar />
      <IndexPanel />
      <BuildUI />
      <TouchControls />
      <Canvas shadows camera={{ position: [0, 8, 13], fov: 72, near: 0.1, far: 600 }}>
        <Sky sunPosition={[20, 30, 10]} />
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[60, 90, 40]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={1}
          shadow-camera-far={320}
          shadow-camera-left={-72}
          shadow-camera-right={72}
          shadow-camera-top={72}
          shadow-camera-bottom={-72}
          shadow-bias={-0.0005}
        />
        <Physics>
          <KeyboardControls map={keyboardMap}>
            <Player />
          </KeyboardControls>
          <Course />
          {COINS.map((pos, i) => (
            <Coin key={i} position={pos} />
          ))}
          <PlacementSystem />
          <Sparkles />
        </Physics>
        {/* 散策する常駐NPC（見た目だけ・物理なしなので Physics の外） */}
        <EnvNpcs />
      </Canvas>
    </>
  )
}
