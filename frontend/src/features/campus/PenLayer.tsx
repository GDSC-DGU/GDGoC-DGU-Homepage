import { memo, type CSSProperties } from 'react'
import { penLayerClass, usePenNotes, type Note, type Stroke } from './penNotes'
import s from './campus.module.css'

/* 손글씨 층의 그림 부품. 메모 내용 · 자리는 penNotes.ts (SVG 지도와 3D 지도가 같이 쓴다) */

const Ink = memo(function Ink({ strokes, delay, dur, color }: { strokes: Stroke[]; delay: number; dur: number; color: string }) {
  return (
    <g className={s.penInk} style={{ '--delay': `${delay}s`, '--dur': `${dur}s`, stroke: color } as CSSProperties}>
      {strokes.map((p, i) => (
        <path key={i} d={p.d} strokeWidth={p.w} pathLength={1} />
      ))}
    </g>
  )
})

/** 메모 하나 (SVG 지도 좌표). scale: 화살표 끝을 기준으로 글씨 · 화살표를 키우는 배율 */
export function PenNoteArt({ note: n, scale = 1 }: { note: Note; scale?: number }) {
  return (
    <g data-pen={n.key}>
      {n.loop && <Ink strokes={n.loop} delay={n.delay} dur={0.8} color={n.color} />}
      <g transform={scale === 1 ? undefined : `translate(${n.tip[0]} ${n.tip[1]}) scale(${scale.toFixed(3)}) translate(${-n.tip[0]} ${-n.tip[1]})`}>
      <Ink strokes={n.arrow} delay={n.delay + (n.loop ? 0.7 : 0)} dur={0.5} color={n.color} />
      {n.lines.map((l, i) => (
        <text
          key={i}
          className={s.penText}
          x={l.x}
          y={l.y}
          fontSize={l.size}
          style={{ '--delay': `${n.delay + (n.loop ? 1.1 : 0.4) + i * 0.45}s` } as CSSProperties}
        >
          {l.text}
        </text>
      ))}
      {n.under && <Ink strokes={n.under} delay={n.delay + (n.loop ? 1.1 : 0.4) + n.lines.length * 0.45} dur={0.35} color={n.color} />}
      </g>
    </g>
  )
}

/**
 * @param scale 폰처럼 장면이 작게 그려질 때 글씨 · 화살표를 키우는 배율 (안내판의 labelScale 과 같은 값).
 *   동그라미는 건물을 둘러야 하므로 키우지 않고, 화살표 끝을 기준으로 메모만 키운다.
 */
export function PenLayer({ compact = false, animate = true, scale = 1 }: { compact?: boolean; animate?: boolean; scale?: number }) {
  const { notes, ready } = usePenNotes(compact)
  if (!ready) return null
  return (
    <g className={penLayerClass(animate)} aria-hidden="true" pointerEvents="none">
      {notes.map((n) => (
        <PenNoteArt key={n.key} note={n} scale={scale} />
      ))}
    </g>
  )
}
