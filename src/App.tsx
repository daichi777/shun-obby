// Minecraft クローン（kids-voxel）のエントリ。
// 旧 obby（Player/Course/Coin/build/*/fx/mobile）の各ファイルはそのまま温存しており
// 将来「かざりレイヤー」等で再利用できるが、現在のメイン体験は voxel クローン。
import { VoxelGame } from './game/voxel/VoxelGame'
import { AmbientBgm } from './game/AmbientBgm'

export default function App() {
  return (
    <>
      {/* しずかな生成型ピアノ BGM（Minecraft 風の世界にあわせたリラックス系） */}
      <AmbientBgm />
      <VoxelGame />
    </>
  )
}
