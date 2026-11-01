import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useFontsReady } from '@/hooks/useFontsReady'
import { useReducedMotion } from '@/hooks/useMediaQuery'
import s from './logoWordmark.module.css'

/** 로고의 두 꺾쇠 (public/brand: 4기 Organizer 가 준 GDG DGU 로고를 반으로 나눈 것). 원본 로고에서 두 꺾쇠 사이 틈 = 높이의 32/137 */
const CHEVRON = { w: 124, h: 137, gap: 32 } as const
const src = (name: string) => `${import.meta.env.BASE_URL}brand/${name}`
/** 글꼴이 늦게 와도 이만큼 기다리면 그냥 연다 (ms) */
const FONT_WAIT = 1200

/**
 * 홈 첫 화면 이름: 처음에는 로고(두 꺾쇠가 붙어 있는 모양)로 시작했다가, 꺾쇠가 양쪽으로 벌어지면서 가운데에서 'GDGoC DGU' 가 드러난다.
 * - 꺾쇠는 꾸밈(alt="")이라 h1 의 이름은 글자 그대로 'GDGoC DGU'.
 * - 벌어질 거리는 글자 폭을 재서 정한다 (글꼴을 받은 뒤 다시 잰다). 재기 전에는 열린 모양 그대로 둔다.
 * - '동작 줄이기' 면 처음부터 열린 모양.
 */
export function LogoWordmark({ name, id, className = '' }: { name: string; id?: string; className?: string }) {
  const reduce = useReducedMotion()
  const fonts = useFontsReady()
  const boxRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [d, setD] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [waited, setWaited] = useState(false)

  // 닫힌 모양에서 꺾쇠가 움직일 거리: (글자 폭 + 양쪽 간격 - 로고의 원래 틈) / 2
  useLayoutEffect(() => {
    const box = boxRef.current
    const text = textRef.current
    if (!box || !text) return
    const measure = () => {
      // offsetHeight: 나타날 때의 scale 에 흔들리지 않는 원래 높이
      const chevron = box.querySelector('img')?.offsetHeight ?? 0
      const gap = parseFloat(getComputedStyle(box).columnGap) || 0
      setD(Math.max(0, (text.offsetWidth + gap * 2 - (chevron * CHEVRON.gap) / CHEVRON.h) / 2))
    }
    // 처음 재는 것도 ResizeObserver 가 맡는다 (붙이자마자 한 번 불린다)
    const ro = new ResizeObserver(measure)
    ro.observe(text)
    return () => ro.disconnect()
  }, [fonts])

  useEffect(() => {
    if (fonts) return
    const t = window.setTimeout(() => setWaited(true), FONT_WAIT)
    return () => window.clearTimeout(t)
  }, [fonts])

  // 잰 뒤 닫힌 모양을 한 번 그리고 나서 연다 (두 프레임 뒤)
  const canOpen = !reduce && d !== null && (fonts || waited)
  useEffect(() => {
    if (!canOpen || open) return
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setOpen(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [canOpen, open])

  // 상태: 동작 줄이기 · 아직 못 잼 → 그냥 열린 모양, 열기 전 → 닫힘, 연 뒤 → 벌어지는 중/끝
  const state = reduce || d === null ? 'static' : open ? 'open' : 'closed'
  return (
    <span ref={boxRef} id={id} className={`${s.mark} ${className}`} data-state={state} style={{ '--d': `${d ?? 0}px` } as CSSProperties}>
      <img className={`${s.chevron} ${s.left}`} src={src('gdg-dgu-left.png')} alt="" width={CHEVRON.w} height={CHEVRON.h} />
      <span ref={textRef} className={s.text}>
        {name}
      </span>
      <img className={`${s.chevron} ${s.right}`} src={src('gdg-dgu-right.png')} alt="" width={CHEVRON.w} height={CHEVRON.h} />
    </span>
  )
}
