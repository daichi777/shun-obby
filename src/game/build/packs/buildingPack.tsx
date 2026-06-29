import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PackItem } from '../itemTypes'

// たてものパック。すべて three.js プリミティブのみ。
// 原点中心・底面 y=0・footprint 内に収まる。明るくかわいいローポリ。

// おうち — footprint [2,2] => x,z は ±1 以内
const House: React.FC = () => (
  <group>
    {/* 本体（パステルイエローの箱） */}
    <mesh castShadow position={[0, 0.45, 0]}>
      <boxGeometry args={[1.2, 0.9, 1.2]} />
      <meshStandardMaterial color="#ffe27a" />
    </mesh>
    {/* 赤い円すい屋根 */}
    <mesh castShadow position={[0, 1.18, 0]}>
      <coneGeometry args={[0.95, 0.7, 4]} />
      <meshStandardMaterial color="#ef3e36" />
    </mesh>
    {/* 屋根のてっぺんのまるいかざり */}
    <mesh castShadow position={[0, 1.6, 0]}>
      <sphereGeometry args={[0.08, 12, 12]} />
      <meshStandardMaterial color="#ffd54a" />
    </mesh>
    {/* えんとつ */}
    <mesh castShadow position={[0.42, 1.35, -0.2]}>
      <cylinderGeometry args={[0.1, 0.12, 0.45, 10]} />
      <meshStandardMaterial color="#c0584a" />
    </mesh>
    {/* 青い四角いドア（前面 z=+0.6） */}
    <mesh castShadow position={[0, 0.3, 0.61]}>
      <boxGeometry args={[0.32, 0.5, 0.04]} />
      <meshStandardMaterial color="#3d8bff" />
    </mesh>
    {/* ドアノブ */}
    <mesh castShadow position={[0.1, 0.3, 0.64]}>
      <sphereGeometry args={[0.035, 10, 10]} />
      <meshStandardMaterial color="#ffd54a" />
    </mesh>
    {/* まどふたつ */}
    <mesh castShadow position={[-0.38, 0.6, 0.61]}>
      <boxGeometry args={[0.26, 0.26, 0.04]} />
      <meshStandardMaterial color="#bdf0ff" />
    </mesh>
    <mesh castShadow position={[0.38, 0.6, 0.61]}>
      <boxGeometry args={[0.26, 0.26, 0.04]} />
      <meshStandardMaterial color="#bdf0ff" />
    </mesh>
  </group>
)

// さく — footprint [1,1] => x,z は ±0.5 以内。白いピケットフェンス1枚。
const Fence: React.FC = () => {
  const postX = [-0.35, 0, 0.35] as const
  return (
    <group>
      {/* たてのポスト3本（先がとがった感じに小さな箱＋三角） */}
      {postX.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh castShadow position={[0, 0.22, 0]}>
            <boxGeometry args={[0.12, 0.44, 0.08]} />
            <meshStandardMaterial color="#fdfdfd" />
          </mesh>
          {/* とんがり頭 */}
          <mesh castShadow position={[0, 0.48, 0]}>
            <coneGeometry args={[0.085, 0.12, 4]} />
            <meshStandardMaterial color="#fdfdfd" />
          </mesh>
        </group>
      ))}
      {/* よこのレール2本 */}
      <mesh castShadow position={[0, 0.14, 0]}>
        <boxGeometry args={[0.82, 0.06, 0.05]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
      <mesh castShadow position={[0, 0.32, 0]}>
        <boxGeometry args={[0.82, 0.06, 0.05]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
    </group>
  )
}

// はし — footprint [2,1] => x は ±1, z は ±0.5 以内。木の太鼓橋。
const Bridge: React.FC = () => {
  // ゆるくアーチした床板を、少しずつ高さを変えた箱で表現
  const planks = [
    { x: -0.78, y: 0.16 },
    { x: -0.4, y: 0.24 },
    { x: 0, y: 0.28 },
    { x: 0.4, y: 0.24 },
    { x: 0.78, y: 0.16 },
  ] as const
  const railPosts = [-0.78, -0.4, 0, 0.4, 0.78] as const
  const nearestPlankY = (x: number) =>
    planks.reduce(
      (best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best),
      planks[0],
    ).y
  return (
    <group>
      {/* アーチした床板 */}
      {planks.map((p) => (
        <mesh key={p.x} castShadow position={[p.x, p.y, 0]}>
          <boxGeometry args={[0.38, 0.1, 0.9]} />
          <meshStandardMaterial color="#b5773f" />
        </mesh>
      ))}
      {/* りょうがわのてすり（ポスト） */}
      {([-0.42, 0.42] as const).map((z) =>
        railPosts.map((x) => (
          <mesh key={`post-${z}-${x}`} castShadow position={[x, nearestPlankY(x) + 0.16, z]}>
            <boxGeometry args={[0.07, 0.22, 0.07]} />
            <meshStandardMaterial color="#8a5a2b" />
          </mesh>
        )),
      )}
      {/* 上のレール（両側） */}
      {([-0.42, 0.42] as const).map((z) => (
        <mesh key={`rail-${z}`} castShadow position={[0, 0.45, z]}>
          <boxGeometry args={[1.7, 0.06, 0.06]} />
          <meshStandardMaterial color="#9c6630" />
        </mesh>
      ))}
    </group>
  )
}

// たわー — footprint [2,2] => x,z は ±1 以内。むらさきの塔＋青いとんがり屋根。
const Tower: React.FC = () => {
  const flagRef = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (flagRef.current) {
      // はたが風にゆれる
      flagRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.12
    }
  })
  return (
    <group>
      {/* むらさきの円柱の塔 */}
      <mesh castShadow position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.42, 0.48, 1.9, 16]} />
        <meshStandardMaterial color="#9b5de5" />
      </mesh>
      {/* 青いとんがり屋根 */}
      <mesh castShadow position={[0, 2.25, 0]}>
        <coneGeometry args={[0.56, 0.7, 16]} />
        <meshStandardMaterial color="#3d8bff" />
      </mesh>
      {/* 四角いまど */}
      <mesh castShadow position={[0, 1.2, 0.43]}>
        <boxGeometry args={[0.24, 0.32, 0.05]} />
        <meshStandardMaterial color="#bdf0ff" />
      </mesh>
      {/* はたのぼう */}
      <mesh castShadow position={[0, 2.78, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
        <meshStandardMaterial color="#7a4a12" />
      </mesh>
      {/* はた（ゆれる） */}
      <mesh ref={flagRef} castShadow position={[0.13, 2.92, 0]}>
        <boxGeometry args={[0.24, 0.14, 0.02]} />
        <meshStandardMaterial color="#ff5da2" />
      </mesh>
    </group>
  )
}

export const buildingItems: PackItem[] = [
  { id: 'ouchi', name: 'おうち', emoji: '🏠', price: 9, footprint: [2, 2] as [number, number], Model: House },
  { id: 'saku', name: 'さく', emoji: '🪵', price: 1, footprint: [1, 1] as [number, number], Model: Fence },
  { id: 'hashi', name: 'はし', emoji: '🌉', price: 5, footprint: [2, 1] as [number, number], Model: Bridge },
  { id: 'tawa', name: 'たわー', emoji: '🏰', price: 8, footprint: [2, 2] as [number, number], Model: Tower },
]
