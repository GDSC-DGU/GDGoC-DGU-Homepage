import { useLayoutEffect, useRef, useState } from 'react'
import type { Footprint } from '@/domain/types'
import { useFontsReady } from '@/hooks/useFontsReady'
import { isYmd, monthDay, weekday } from '@/lib/date'
import { iso, type Point3 } from '@/lib/iso'
import { FLOOR } from '@/features/campus/geometry'
import { Poly } from '@/features/campus/primitives'
import { ROOF_RISE, SCREEN } from '@/features/campus/roofs/heights'
import s from './placehero.module.css'

/** 지붕 턱 높이 (roofs/ScreenRoof.tsx 의 PARAPET 과 같다) */
const PARAPET = 0.1
/** 화면 틀 안쪽 여백 (격자) · 글자 여백 (SVG) */
const BEZEL = 0.09
const PAD = 4.5
const TITLE_SIZE = 7
const TITLE_MIN = 5.6

/** '2026-10-27' → '10.27 화'. 이미 다듬은 글이면 그대로 */
const screenDate = (date: string) => (isYmd(date) ? `${monthDay(date)} ${weekday(date)}` : date)

/**
 * 강당 지붕 화면에 실제 다음 일정을 띄운다. 화면 면(+y)에 글자를 눕힌다.
 * 일정이 없으면 빈 흰 화면 (홈 지도의 회색 줄 = '아무 슬라이드' 를 덮는다).
 * 제목이 화면보다 길면 글자를 조금 줄이고, 그래도 길면 말줄임.
 */
export function ScreenSlide({ fp, screen }: { fp: Footprint; screen?: { date: string; title: string } }) {
  const top = FLOOR + fp.h
  const frameZ = top + PARAPET + SCREEN.legs
  const frameH = top + ROOF_RISE.screen - frameZ
  const Y = fp.y + SCREEN.dy + SCREEN.d + 0.006
  const S = (u: number, z: number): Point3 => [fp.x + SCREEN.dx + u, Y, frameZ + z]
  const inner = [S(BEZEL, BEZEL), S(SCREEN.w - BEZEL, BEZEL), S(SCREEN.w - BEZEL, frameH - BEZEL), S(BEZEL, frameH - BEZEL)]
  const [ox, oy] = iso(...(S(BEZEL, frameH - BEZEL) as [number, number, number]))
  const avail = (SCREEN.w - BEZEL * 2) * 32 - PAD * 2
  return (
    <g>
      <Poly pts={inner} className={s.screenBlank} />
      {screen && (
        <g transform={`matrix(1 0.5 0 1 ${ox.toFixed(1)} ${oy.toFixed(1)})`}>
          <text x={PAD} y={13.2} className={s.screenDate}>
            {screenDate(screen.date)}
          </text>
          <FitText x={PAD} y={22.6} text={screen.title} max={avail} />
        </g>
      )}
    </g>
  )
}

function FitText({ x, y, text, max }: { x: number; y: number; text: string; max: number }) {
  // 보이지 않는 같은 글자로 원래 크기 폭을 잰다 (React 가 그리는 글자는 건드리지 않는다)
  const probe = useRef<SVGTextElement>(null)
  const fontsReady = useFontsReady()
  const [fit, setFit] = useState({ size: TITLE_SIZE, text })
  useLayoutEffect(() => {
    const w = probe.current?.getComputedTextLength() ?? 0
    if (w <= max || w === 0) return setFit({ size: TITLE_SIZE, text })
    const size = (TITLE_SIZE * max) / w
    if (size >= TITLE_MIN) return setFit({ size, text })
    const keep = Math.max(1, Math.floor((text.length * max * TITLE_SIZE) / (w * TITLE_MIN)) - 1)
    setFit({ size: TITLE_MIN, text: `${text.slice(0, keep).trimEnd()}…` })
  }, [text, max, fontsReady])
  return (
    <>
      <text ref={probe} x={x} y={y} className={s.screenTitle} style={{ fontSize: `${TITLE_SIZE}px` }} visibility="hidden">
        {text}
      </text>
      <text x={x} y={y} className={s.screenTitle} style={{ fontSize: `${fit.size.toFixed(2)}px` }}>
        {fit.text}
      </text>
    </>
  )
}
