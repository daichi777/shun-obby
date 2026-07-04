import { useRef } from 'react'
import type { FC } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PackItem } from '../itemTypes'

// nature パック（き / おはな / きのこ / にじ）
// three.js プリミティブのみ・原点中心・底面 y=0・footprint 内に収まるよう設計。
// 「ぷっくり・まるっこいトイ」美学：ベース色＋アクセント＋ハイライトの3層、面取り・段差でリッチに。
// CELL=4 前提のチャンキーサイズ（各アイテムの目標ユニット高さに合わせて低く作る）。

// き: 根元がふくらんだ太い幹＋2〜3段のもこもこ葉（明暗2色でボリューム）＋赤い実。
// footprint [1,1] → x,z ともに ±0.5 以内。目標高さ ≈0.85（実測 ≈0.90）。
const Tree: FC = () => (
  <group>
    {/* 根元のふくらみ（面取り・暗めブラウン） */}
    <mesh castShadow position={[0, 0.05, 0]} scale={[1, 0.5, 1]}>
      <sphereGeometry args={[0.15, 12, 10]} />
      <meshStandardMaterial color="#7a4a24" roughness={0.85} />
    </mesh>
    {/* 幹（すこし上細り） */}
    <mesh castShadow position={[0, 0.16, 0]}>
      <cylinderGeometry args={[0.085, 0.115, 0.3, 8]} />
      <meshStandardMaterial color="#9c5a2c" roughness={0.8} />
    </mesh>
    {/* 下段のもこもこ（いちばん大きい・ベース緑） */}
    <mesh castShadow position={[0, 0.5, 0]}>
      <sphereGeometry args={[0.3, 14, 12]} />
      <meshStandardMaterial color="#54b95a" roughness={0.7} />
    </mesh>
    {/* 奥ひだり（アクセント＝暗め緑で影の房） */}
    <mesh castShadow position={[-0.2, 0.45, -0.1]}>
      <sphereGeometry args={[0.18, 12, 10]} />
      <meshStandardMaterial color="#3f9e46" roughness={0.72} />
    </mesh>
    {/* 手前みぎ（アクセント緑） */}
    <mesh castShadow position={[0.21, 0.47, 0.08]}>
      <sphereGeometry args={[0.19, 12, 10]} />
      <meshStandardMaterial color="#46a94d" roughness={0.72} />
    </mesh>
    {/* 上段のもこもこ（ハイライト＝明るい緑） */}
    <mesh castShadow position={[0.02, 0.68, 0]}>
      <sphereGeometry args={[0.22, 14, 12]} />
      <meshStandardMaterial color="#63c95e" roughness={0.66} />
    </mesh>
    {/* てっぺんの小さなハイライト房 */}
    <mesh castShadow position={[-0.1, 0.74, 0.1]}>
      <sphereGeometry args={[0.13, 10, 10]} />
      <meshStandardMaterial color="#7fd97a" roughness={0.6} />
    </mesh>
    {/* りんご（赤い実・葉から顔をだす） */}
    <mesh castShadow position={[0.28, 0.52, 0.16]}>
      <sphereGeometry args={[0.05, 10, 10]} />
      <meshStandardMaterial color="#ff5a52" roughness={0.5} />
    </mesh>
    <mesh castShadow position={[-0.24, 0.62, 0.18]}>
      <sphereGeometry args={[0.05, 10, 10]} />
      <meshStandardMaterial color="#ff5a52" roughness={0.5} />
    </mesh>
    <mesh castShadow position={[0.1, 0.72, -0.2]}>
      <sphereGeometry args={[0.045, 10, 10]} />
      <meshStandardMaterial color="#ff5a52" roughness={0.5} />
    </mesh>
  </group>
)

// おはな: 細い茎＋左右の葉＋がく＋花びら（外側/内側で色差の2重リング）＋黄色い芯。
// footprint [1,1] → 幅は控えめ（花の最外 x≈0.19 < 0.2）。目標高さ ≈0.42。
const Flower: FC = () => {
  const outer = [0, 1, 2, 3, 4] as const
  const inner = [0, 1, 2, 3, 4] as const
  return (
    <group>
      {/* 茎 */}
      <mesh castShadow position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.018, 0.028, 0.28, 6]} />
        <meshStandardMaterial color="#3fae57" roughness={0.75} />
      </mesh>
      {/* 葉っぱ（ひだり） */}
      <mesh castShadow position={[-0.09, 0.15, 0]} rotation={[0, 0, 0.95]} scale={[1, 0.35, 0.5]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color="#52c46a" roughness={0.72} />
      </mesh>
      {/* 葉っぱ（みぎ） */}
      <mesh castShadow position={[0.09, 0.1, 0]} rotation={[0, 0, -0.95]} scale={[1, 0.35, 0.5]}>
        <sphereGeometry args={[0.08, 10, 8]} />
        <meshStandardMaterial color="#5ccf74" roughness={0.72} />
      </mesh>
      {/* がく（花と茎をつなぐ緑のふくらみ） */}
      <mesh castShadow position={[0, 0.31, 0]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#4fb862" roughness={0.72} />
      </mesh>
      {/* 花びら 外リング（濃いピンク・ぷっくり平たい） */}
      {outer.map((i) => {
        const a = (i / 5) * Math.PI * 2
        return (
          <mesh
            key={`o${i}`}
            castShadow
            position={[Math.cos(a) * 0.11, 0.35, Math.sin(a) * 0.11]}
            scale={[1, 0.5, 1]}
          >
            <sphereGeometry args={[0.08, 10, 10]} />
            <meshStandardMaterial color="#ff6aa8" roughness={0.55} />
          </mesh>
        )
      })}
      {/* 花びら 内リング（淡いピンク・色差／半ステップずらし） */}
      {inner.map((i) => {
        const a = (i / 5) * Math.PI * 2 + Math.PI / 5
        return (
          <mesh
            key={`i${i}`}
            castShadow
            position={[Math.cos(a) * 0.06, 0.375, Math.sin(a) * 0.06]}
            scale={[1, 0.55, 1]}
          >
            <sphereGeometry args={[0.05, 10, 10]} />
            <meshStandardMaterial color="#ffc2dd" roughness={0.5} />
          </mesh>
        )
      })}
      {/* 芯（黄色） */}
      <mesh castShadow position={[0, 0.39, 0]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#ffd23a" roughness={0.5} />
      </mesh>
    </group>
  )
}

// きのこ: ぷっくり半球のかさ（なめらか）＋白い水玉＋太い柄＋小さなほっぺ＆目。
// footprint [1,1] → かさ半径 0.24 < 0.5。目標高さ ≈0.4（実測 ≈0.41）。
const Mushroom: FC = () => (
  <group>
    {/* 柄（太いクリーム色・すこし面取り） */}
    <mesh castShadow position={[0, 0.1, 0]}>
      <cylinderGeometry args={[0.1, 0.135, 0.2, 12]} />
      <meshStandardMaterial color="#fff3e0" roughness={0.7} />
    </mesh>
    {/* かさ（赤い半球・なめらか・軽く押しつぶしてぷっくり） */}
    <mesh castShadow position={[0, 0.18, 0]} scale={[1, 0.85, 1]}>
      <sphereGeometry args={[0.24, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#f0483f" roughness={0.55} />
    </mesh>
    {/* 白い水玉（かさの上に散らす・すこし平たく） */}
    <mesh castShadow position={[0, 0.37, 0]} scale={[1, 0.6, 1]}>
      <sphereGeometry args={[0.05, 10, 10]} />
      <meshStandardMaterial color="#fffaf2" roughness={0.6} />
    </mesh>
    <mesh castShadow position={[0.14, 0.29, 0.06]} scale={[1, 0.6, 1]}>
      <sphereGeometry args={[0.045, 10, 10]} />
      <meshStandardMaterial color="#fffaf2" roughness={0.6} />
    </mesh>
    <mesh castShadow position={[-0.12, 0.28, 0.08]} scale={[1, 0.6, 1]}>
      <sphereGeometry args={[0.04, 10, 10]} />
      <meshStandardMaterial color="#fffaf2" roughness={0.6} />
    </mesh>
    <mesh castShadow position={[0.05, 0.27, -0.16]} scale={[1, 0.6, 1]}>
      <sphereGeometry args={[0.04, 10, 10]} />
      <meshStandardMaterial color="#fffaf2" roughness={0.6} />
    </mesh>
    <mesh castShadow position={[-0.1, 0.26, -0.13]} scale={[1, 0.6, 1]}>
      <sphereGeometry args={[0.035, 10, 10]} />
      <meshStandardMaterial color="#fffaf2" roughness={0.6} />
    </mesh>
    {/* 目（ちいさな黒い点・控えめ） */}
    <mesh position={[0.045, 0.13, 0.11]}>
      <sphereGeometry args={[0.016, 8, 8]} />
      <meshStandardMaterial color="#4a3a34" roughness={0.5} />
    </mesh>
    <mesh position={[-0.045, 0.13, 0.11]}>
      <sphereGeometry args={[0.016, 8, 8]} />
      <meshStandardMaterial color="#4a3a34" roughness={0.5} />
    </mesh>
    {/* ほっぺ（ピンク・平たく） */}
    <mesh position={[0.085, 0.11, 0.1]} scale={[1, 0.75, 0.5]}>
      <sphereGeometry args={[0.028, 8, 8]} />
      <meshStandardMaterial color="#ff9ec2" roughness={0.6} />
    </mesh>
    <mesh position={[-0.085, 0.11, 0.1]} scale={[1, 0.75, 0.5]}>
      <sphereGeometry args={[0.028, 8, 8]} />
      <meshStandardMaterial color="#ff9ec2" roughness={0.6} />
    </mesh>
  </group>
)

// にじ: 6色の太い半円アーチ＋両端のふわふわ雲（球の房）。接地。
// footprint [2,2] → x,z ともに ±1 以内（アーチ最外 r=0.80）。目標高さ ≈0.85（実測 ≈0.88）。
// useFrame でゆっくり上下にふわり（静止時は接地・常に地面以上）。
const Rainbow: FC = () => {
  const ref = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (ref.current) {
      // 0〜+0.04 の範囲でふわり浮く（静止時は y≈0 接地・常に地面以上）。
      ref.current.position.y = (Math.sin(state.clock.elapsedTime * 1.2) + 1) * 0.02
    }
  })
  // 外側→内側。中心線半径をそろえて隙間なく重ねる（間隔=2*tube）。
  const tube = 0.06
  const bands: { r: number; color: string }[] = [
    { r: 0.8, color: '#ff5c5c' }, // 赤
    { r: 0.68, color: '#ff9f45' }, // 橙
    { r: 0.56, color: '#ffd84d' }, // 黄
    { r: 0.44, color: '#58cc6a' }, // 緑
    { r: 0.32, color: '#4aa8ff' }, // 青
    { r: 0.2, color: '#a578e8' }, // 紫
  ]
  // ふわふわ雲（球の房）。ベース白＋うっすら青の影で立体感。
  const cloudPuffs: { p: [number, number, number]; r: number; color: string }[] = [
    { p: [0, 0.15, 0], r: 0.16, color: '#ffffff' },
    { p: [0.16, 0.11, 0.05], r: 0.11, color: '#ffffff' },
    { p: [-0.15, 0.1, -0.04], r: 0.11, color: '#eef4ff' },
    { p: [0.02, 0.1, -0.12], r: 0.09, color: '#eef4ff' },
  ]
  return (
    <group ref={ref}>
      {/* アーチ本体（上半分の半リング・XY平面）。足元は y≈0 で接地 */}
      <group position={[0, 0.02, 0]}>
        {bands.map((b) => (
          <mesh key={b.color} castShadow>
            <torusGeometry args={[b.r, tube, 8, 20, Math.PI]} />
            <meshStandardMaterial color={b.color} roughness={0.6} />
          </mesh>
        ))}
      </group>
      {/* 左の雲（アーチの足を包む） */}
      <group position={[-0.5, 0, 0]}>
        {cloudPuffs.map((c, i) => (
          <mesh key={`l${i}`} castShadow position={c.p}>
            <sphereGeometry args={[c.r, 12, 10]} />
            <meshStandardMaterial color={c.color} roughness={0.85} />
          </mesh>
        ))}
      </group>
      {/* 右の雲（左右ミラー） */}
      <group position={[0.5, 0, 0]} scale={[-1, 1, 1]}>
        {cloudPuffs.map((c, i) => (
          <mesh key={`r${i}`} castShadow position={c.p}>
            <sphereGeometry args={[c.r, 12, 10]} />
            <meshStandardMaterial color={c.color} roughness={0.85} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export const natureItems: PackItem[] = [
  {
    id: 'ki',
    name: 'き',
    emoji: '🌳',
    price: 4,
    footprint: [1, 1],
    Model: Tree,
    // 幹だけ軽く固体化（葉はすり抜けOK）。friction は渡さない（rapier既定）。
    collider: { boxes: [{ args: [0.13, 0.2, 0.13], position: [0, 0.2, 0] }] },
  },
  { id: 'ohana', name: 'おはな', emoji: '🌷', price: 1, footprint: [1, 1], Model: Flower, collider: 'none' },
  { id: 'kinoko', name: 'きのこ', emoji: '🍄', price: 2, footprint: [1, 1], Model: Mushroom, collider: 'none' },
  { id: 'niji', name: 'にじ', emoji: '🌈', price: 7, footprint: [2, 2], Model: Rainbow, collider: 'none' },
]
