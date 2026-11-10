import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, type To } from 'react-router-dom'
import { placeColor } from '@/config/places'
import type { PlaceId } from '@/domain/types'
import { ticketDate, ticketDday } from '@/features/common/ticketData'
import { useReducedMotion } from '@/hooks/useMediaQuery'
import { useToday } from '@/hooks/useToday'
import fontUrl from './galmuri11-bold-ks.woff2?url'
import { FONT_FAMILY, LedRenderer, type LedLayout, type LedLine, type LedPalette } from './ledMatrix'
import s from './ledBoard.module.css'

let fontReady: Promise<void> | null = null
/** 전광판 글꼴은 전광판이 화면에 올 때 처음 받는다 (KS X 1001 한글 2350자 + 영문, 40KB) */
function loadLedFont(): Promise<void> {
  if (!fontReady) {
    const face = new FontFace(FONT_FAMILY, `url(${fontUrl}) format("woff2")`)
    fontReady = face.load().then((f) => {
      document.fonts.add(f)
    })
  }
  return fontReady
}

/**
 * 버스 도착 안내판의 호박색 LED. 판 바탕은 따로 칠하지 않는다 (먹색 띠가 곧 전광판 판, 꺼진 점 격자가 판의 크기를 보여 준다).
 * soft 는 작은 글자(이름표 · 요일)용 어두운 호박색.
 */
const PALETTE: Omit<LedPalette, 'mark'> = {
  back: 'transparent',
  off: '#272a30',
  lit: '#ffb547',
  soft: '#b9802f',
}

const LAYOUT: Record<'default' | 'large', LedLayout> = {
  default: { pitch: 4, lineGap: 3, padX: 1, padY: 0, speed: 26, hold: 1400 },
  large: { pitch: 5, lineGap: 4, padX: 1, padY: 0, speed: 24, hold: 1600 },
}
/** 점 간격 후보 (CSS px). 큰 점부터 해 보고, 흐르지 않고 다 들어가는 첫 간격을 쓴다. 폰은 3 하나 (넘치면 흐름).
 * 넓은 화면은 가장 작은 간격으로도 넘치면 흐르지 않고 줄을 바꾼다 (DESIGN 6장: 흐르는 건 폰만. 화면 검토 2026-11-05) */
const PITCHES = { default: [4, 3], large: [5, 4, 3] } as const
const PHONE_PITCH = 3

/**
 * 전광판 한 장 (canvas). 화면 읽기 프로그램에는 children(같은 내용의 글)이 읽힌다.
 * 움직임 줄이기면 흐르지 않고 줄을 바꿔 다 보여 준다. 화면 밖이거나 탭이 숨으면 멈춘다.
 */
function LedCanvas({ lines, size, mark }: { lines: (narrow: boolean) => LedLine[]; size: 'default' | 'large'; mark: string }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()
  const [ready, setReady] = useState(false)

  // 글꼴은 판이 화면 가까이(600px 안) 올 때 처음 받는다
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    let alive = true
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        loadLedFont().then(
          () => alive && setReady(true),
          () => alive && setReady(true),
        )
      },
      { rootMargin: '600px 0px' },
    )
    io.observe(box)
    return () => {
      alive = false
      io.disconnect()
    }
  }, [])

  useEffect(() => {
    const box = boxRef.current
    const canvas = canvasRef.current
    if (!ready || !box || !canvas) return
    let renderer: LedRenderer | null = null
    let raf = 0
    let visible = false
    let introDone = false
    const t0 = performance.now()
    const animating = () => Boolean(renderer && (renderer.moving || renderer.introActive(performance.now() - t0)))

    const loop = (now: number) => {
      renderer?.draw(now - t0)
      if (animating()) raf = requestAnimationFrame(loop)
    }
    const sync = () => {
      cancelAnimationFrame(raf)
      if (visible && !reduced && document.visibilityState === 'visible' && animating()) raf = requestAnimationFrame(loop)
    }
    // 처음 화면에 들어올 때 한 번, 글자가 오른쪽에서 흘러 들어와 멈춘다 (실제 전광판처럼). 움직임 줄이기면 없음
    const intro = () => {
      if (introDone || reduced || !renderer) return
      introDone = true
      renderer.startIntro(performance.now() - t0)
    }
    const build = () => {
      const width = box.clientWidth
      const narrow = width < 560
      const base = LAYOUT[size]
      const pitches = width < 420 ? [PHONE_PITCH] : PITCHES[size]
      for (const pitch of pitches) {
        renderer = new LedRenderer(canvas, { ...PALETTE, mark }, { ...base, pitch })
        renderer.setScene(lines(narrow), width, true)
        if (!renderer.moving) break
      }
      // 움직임 줄이기 · 넓은 화면: 흐르는 대신 줄을 바꿔 다 보인다
      if ((reduced || width >= 420) && renderer?.moving) renderer.setScene(lines(narrow), width, false)
      sync()
    }
    build()
    const ro = new ResizeObserver(() => build())
    ro.observe(box)
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting
        if (visible) intro()
        sync()
      },
      { threshold: 0.6 },
    )
    io.observe(box)
    document.addEventListener('visibilitychange', sync)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [ready, reduced, size, mark, lines])

  return (
    <div ref={boxRef} className={s.screen} aria-hidden="true">
      <canvas ref={canvasRef} className={s.canvas} />
    </div>
  )
}

export interface LedTicketProps {
  date: string
  endDate?: string | null
  title: string
  kicker: string
  meta?: string
  /** 장소색 네모 (일정이 어느 장소 일인지) */
  place?: PlaceId
  to?: To
  href?: string
  size?: 'default' | 'large'
  today?: string
  className?: string
}

/**
 * 다음 모임 전광판: Ticket 과 같은 내용(작은 글자 · 날짜 · 제목 · D-day)을 버스 도착 안내판처럼 점으로 찍는다.
 * 점 색은 따뜻한 흰색 하나, 장소색은 맨 앞 네모 하나에만 (DESIGN 4장: 장소색은 표식에만).
 * D-day 는 뒤집은 칸(켜진 점 바탕 + 꺼진 글자). 내용은 Ticket 과 같은 계산(ticketData)을 쓴다.
 */
export function LedTicket({ date, endDate, title, kicker, meta, place, to, href, size = 'default', today: todayProp, className = '' }: LedTicketProps) {
  const now = useToday()
  const today = todayProp ?? now
  const start = ticketDate(date, today)
  // 여러 날 일정은 기간으로 ('11.03~30'). 시작일 하나만 보이면 그날 하루 일정처럼 읽힌다 (화면 검토 2026-11-05)
  const range = Boolean(endDate && endDate !== date)
  const endLabel = endDate ? (endDate.slice(0, 7) === date.slice(0, 7) ? String(Number(endDate.slice(8))) : ticketDate(endDate, today).day) : ''
  const day = range ? `${start.day}~${endLabel}` : start.day
  const week = range ? '' : start.week
  const dday = ticketDday(date, endDate, today)
  const mark = place ? resolveColor(placeColor(place)) : PALETTE.lit
  const out = Boolean(href)

  // 줄 구성은 판 폭으로 고른다 (넓으면 한 줄, 좁으면 두 줄). 같은 함수면 다시 그리지 않도록 의존 값만 묶는다
  const hasLink = Boolean(to || href)
  const lines = useMemo(
    () => (narrow: boolean): LedLine[] => {
      const head = [{ tone: 'mark' as const, size: 8, after: 6 }, { text: kicker, tone: 'soft' as const }]
      const when = week ? [{ text: day, after: 4 }, { text: week, tone: 'soft' as const }] : [{ text: day }]
      // 화살표는 넓은 판에서만 (폰은 판 전체가 링크라 자리를 아낀다)
      const arrow = hasLink && !narrow
      const tail = [{ text: dday, tone: 'invert' as const, after: arrow ? 8 : 0 }, ...(arrow ? [{ text: out ? '↗' : '→' }] : [])]
      const metaLine: LedLine[] = meta && size === 'large' ? [{ body: [{ text: meta, tone: 'soft' }] }] : []
      // 좁은 판(폰): 작은 글자 · D-day / 날짜 / 제목(넘치면 흐름) / 장소. 제목이 판 폭을 다 쓰게 날짜와 나눈다
      if (narrow) return [{ left: head, right: tail }, { left: when }, { body: [{ text: title }] }, ...metaLine]
      if (size === 'large') return [{ left: head, right: tail }, { left: when, body: [{ text: title }] }, ...metaLine]
      return [{ left: [...head.slice(0, 1), { ...head[1], after: 14 }, ...when], body: [{ text: title }], right: tail }]
    },
    [kicker, day, week, title, dday, meta, size, hasLink, out],
  )

  const label: ReactNode = (
    <span className="visually-hidden">
      {kicker} {day} {week} {title} {meta} {dday}
      {out && ' (새 창)'}
    </span>
  )
  const cls = `${s.board} ${size === 'large' ? s.large : ''} ${className}`
  const body = (
    <>
      <LedCanvas lines={lines} size={size} mark={mark} />
      {label}
    </>
  )
  if (to)
    return (
      <Link className={`${cls} ${s.linked}`} to={to} data-led>
        {body}
      </Link>
    )
  if (href)
    return (
      <a className={`${cls} ${s.linked}`} href={href} target="_blank" rel="noreferrer" data-led>
        {body}
      </a>
    )
  return (
    <div className={cls} data-led>
      {body}
    </div>
  )
}

/** 'var(--place-community)' 같은 토큰 이름이면 실제 색으로 */
function resolveColor(c: string): string {
  const m = /^var\((--[\w-]+)\)$/.exec(c)
  if (!m) return c
  const v = getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim()
  return /^#[0-9a-f]{6}$/i.test(v) ? v : '#ffffff'
}
