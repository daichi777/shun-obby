// プレイヤーの最新の物理状態を、Canvas内の他コンポーネント（水しぶき検出・浮き輪など）から
// 毎フレーム読めるようにする軽量シグナル。zustand を使わない（＝再レンダーゼロ）ので
// useFrame からの読み書きに最適。Player.tsx が毎フレーム書き込み、各所が getter で読む。

export interface PlayerSignal {
  x: number
  y: number
  z: number
  vy: number // 鉛直速度（着水＝下向きに速いか の判定に使う）
  speedH: number // 水平速度（勢いよく入ったか）
  onGround: boolean
  valid: boolean // Player がまだ初期化前なら false
}

export const playerSignal: PlayerSignal = {
  x: 0,
  y: 0,
  z: 0,
  vy: 0,
  speedH: 0,
  onGround: false,
  valid: false,
}
