// Minecraft クローン本体のシーン組み立て。
// Canvas（一人称カメラ）+ Sky/ライト/フォグ + チャンク描画 + プレイヤー + 設置/破壊。

import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import { ChunkRenderer } from './ChunkRenderer'
import { VoxelPlayer } from './VoxelPlayer'
import { VoxelInteraction } from './VoxelInteraction'
import { VoxelHud } from '../../ui/VoxelHud'
import { setupVoxelDebug } from './debug'
import { WORLD_SIZE_X, WORLD_SIZE_Z } from './constants'

export function VoxelGame() {
  useEffect(() => {
    setupVoxelDebug()
  }, [])

  const cx = WORLD_SIZE_X / 2
  const cz = WORLD_SIZE_Z / 2

  return (
    <>
      <VoxelHud />
      <Canvas
        camera={{ position: [cx, 40, cz], fov: 75, near: 0.1, far: 500 }}
        gl={{ antialias: true }}
      >
        <Sky sunPosition={[100, 90, 40]} turbidity={4} rayleigh={1.2} />
        <fog attach="fog" args={['#cfeaff', 70, 240]} />
        {/* 光は頂点カラー(sky/block light × face shade)に焼き込み済みのため
            MeshBasicMaterial はシーンライト不要。二重照明を避けるためライトは置かない。 */}
        <ChunkRenderer />
        <VoxelPlayer />
        <VoxelInteraction />
      </Canvas>
    </>
  )
}
