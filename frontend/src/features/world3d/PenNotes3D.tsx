import { memo, type RefObject } from 'react'
import { Html } from '@react-three/drei'
import { PenNoteArt } from '@/features/campus/PenLayer'
import { penLayerClass, usePenNotes } from '@/features/campus/penNotes'
import { iso } from '@/lib/iso'
import { ISO_UNIT } from './projection'
import s from './world3d.module.css'

/**
 * 손글씨 메모 두 개 (campus/PenLayer 와 같은 메모 · 같은 선 · 같은 글씨)를 3D 지도 위에 붙인다.
 * 메모마다 붙은 자리(anchor: 건물 가운데 · 앞 벽)를 drei Html 로 따라가고, 카메라 확대만큼 같이 커진다
 * (직교 카메라에서 distanceFactor = 1/ISO_UNIT 이면 SVG 지도와 같은 배율). 그래서 커뮤니티를 두른 동그라미가
 * 처음 화면에서는 SVG 와 같은 자리에 있고, 카메라가 돌거나 다가가도 건물을 따라간다.
 * 3D 는 SVG 가 이미 메모를 그린 뒤에 나타나므로 다시 그리는 연출은 하지 않는다.
 */
export const PenNotes3D = memo(function PenNotes3D({ compact, scale, portal }: { compact: boolean; scale: number; portal: RefObject<HTMLElement | null> }) {
  const { notes, ready } = usePenNotes(compact)
  if (!ready) return null
  return (
    <>
      {notes.map((n) => {
        const [ax, ay] = iso(n.anchor[0], n.anchor[1], n.anchor[2])
        return (
          <Html key={n.key} position={[n.anchor[0], n.anchor[2], n.anchor[1]]} distanceFactor={1 / ISO_UNIT} zIndexRange={[2, 1]} portal={portal as RefObject<HTMLElement>} pointerEvents="none">
            <svg className={s.pen} width="1" height="1" aria-hidden="true" focusable="false">
              <g className={penLayerClass(false)} transform={`translate(${-ax} ${-ay})`}>
                <PenNoteArt note={n} scale={scale} />
              </g>
            </svg>
          </Html>
        )
      })}
    </>
  )
})
