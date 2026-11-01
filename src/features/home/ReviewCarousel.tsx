import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import type { Voice } from '@/content/story'
import { useReducedMotion } from '@/hooks/useMediaQuery'
import { useOffscreen } from '@/hooks/useOffscreen'
import s from './voices.module.css'

/** 자동으로 넘어가는 간격 (ms). 한 장을 읽기에 넉넉하게 */
const INTERVAL = 7000
/** 이만큼 밀면 넘긴다 (px, 터치 · 마우스 끌기) */
const SWIPE = 40

/** 파트 색 (구글 4색, 따옴표 · 이름 동그라미에만) */
const PART_COLOR: Record<string, string> = {
  'AI/ML': 'var(--g-yellow)',
  Frontend: 'var(--g-blue)',
  Backend: 'var(--g-green)',
  Marketing: 'var(--g-red)',
  'Product Design': 'var(--g-red)',
}
const partColor = (part: string) => PART_COLOR[part] ?? 'var(--ink-500)'
/** 이름 동그라미 글자: 이름 뒤 두 글자 */
const initials = (name: string) => [...name].slice(-2).join('')

/** 지금 장에서 몇 칸 떨어져 있는지 (돌아가는 목록이라 가까운 쪽으로) */
function slideOffset(i: number, index: number, n: number): number {
  const off = (((i - index) % n) + n) % n
  return off > n / 2 ? off - n : off
}

/**
 * 인터뷰 (WAI-ARIA Carousel 패턴, 4기 피드백 2026-11):
 * - 한 번에 한 사람만 크게 보인다 (양옆 카드를 두지 않는다: 리뷰 여러 개가 한꺼번에 읽히지 않게).
 *   다음 사람은 옆에서 살짝 밀려 들어오며 나타난다. 끝에서 처음으로 이어진다.
 * - 7초마다 저절로 넘어간다 (마우스를 올려도 계속). [멈춤] 버튼으로 멈출 수 있고, '동작 줄이기' 면 저절로 넘기지 않는다.
 * - 넓은 화면: 왼쪽에 제목 · 큰 번호(01 / 10) · 남은 시간 줄 · 멈춤 · 이전 · 다음, 오른쪽에 카드 (옆 공간을 쓴다).
 *   좁은 화면: 제목 → 카드 → 번호 · 버튼. 터치로 밀어 넘길 수도 있다.
 * - 저절로 넘어가는 동안에는 읽기 프로그램에 알리지 않고, 멈춘 뒤 넘기면 알린다. 지금 사람이 아닌 카드는 읽지 않는다.
 */
/** 01 · 02 … */
const pad2 = (n: number) => String(n).padStart(2, '0')

export function ReviewCarousel({ voices, sample = false, head }: { voices: readonly Voice[]; sample?: boolean; head: ReactNode }) {
  const n = voices.length
  const reduce = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const offscreen = useOffscreen(rootRef)
  const [index, setIndex] = useState(0)
  const [stopped, setStopped] = useState(false)
  const startX = useRef<number | null>(null)
  const slidesId = useId()

  const rotating = n > 1 && !stopped && !reduce
  const running = rotating && !offscreen
  // 사람이 직접 넘기면(index 가 바뀌면) 시계를 처음부터 다시 잰다
  useEffect(() => {
    if (!running) return
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % n), INTERVAL)
    return () => window.clearTimeout(t)
  }, [running, n, index])

  const go = (step: number) => setIndex((i) => (i + step + n) % n)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    startX.current = e.clientX
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (startX.current === null) return
    const dx = e.clientX - startX.current
    startX.current = null
    if (Math.abs(dx) >= SWIPE) go(dx < 0 ? 1 : -1)
  }

  if (n === 0) return null
  return (
    <div ref={rootRef} className={`container ${s.carousel}`} role="region" aria-roledescription="캐러셀" aria-label="지난 기수 멤버 인터뷰">
      <div className={s.headArea}>{head}</div>

      <div id={slidesId} className={s.stage} aria-live={running ? 'off' : 'polite'} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (startX.current = null)}>
        {voices.map((v, i) => {
          const off = slideOffset(i, index, n)
          const isCurrent = off === 0
          return (
            <div
              key={v.id}
              className={s.card}
              role="group"
              aria-roledescription="슬라이드"
              aria-label={`${i + 1} / ${n}, ${v.name}`}
              aria-hidden={!isCurrent}
              data-side={isCurrent ? 'current' : off < 0 ? 'before' : 'after'}
            >
              <figure className={s.figure} style={{ '--pc': partColor(v.part) } as CSSProperties}>
                {sample && <span className={s.sampleTag}>예시</span>}
                <span className={s.qmark} aria-hidden="true">
                  “
                </span>
                <blockquote className={s.quote}>
                  {v.headline && <p className={s.headline}>{v.headline}</p>}
                  <p className={s.body}>{v.quote}</p>
                </blockquote>
                <figcaption className={s.who}>
                  <span className={s.avatar} aria-hidden="true">
                    {initials(v.name)}
                  </span>
                  <span className={s.whoText}>
                    <span className={s.name}>{v.name}</span>
                    <span className={s.meta}>
                      {v.generation !== undefined && (
                        <>
                          <span className="num">{v.generation}</span>기 ·{' '}
                        </>
                      )}
                      {v.part} 파트
                    </span>
                  </span>
                </figcaption>
              </figure>
            </div>
          )
        })}
      </div>

      {n > 1 && (
        <div className={s.metaArea}>
          {/* 큰 번호 + 다음 사람까지 남은 시간 (저절로 넘어가는 동안만 줄이 찬다) */}
          <p className={`num ${s.counter}`} aria-hidden="true">
            <span className={s.now}>{pad2(index + 1)}</span>
            <span className={s.total}>/ {pad2(n)}</span>
          </p>
          <span className={s.progress} aria-hidden="true">
            <span key={`${index}-${running}`} data-running={running || undefined} style={{ '--t': `${INTERVAL}ms` } as CSSProperties} />
          </span>
          <div className={s.controls}>
            <button type="button" className={s.ctrl} aria-controls={slidesId} onClick={() => setStopped((v) => !v)} disabled={reduce}>
              {rotating ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 6v12M15 6v12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5.5v13l10.5-6.5z" />
                </svg>
              )}
              <span className="visually-hidden">{rotating ? '자동 넘김 멈추기' : '자동 넘김 다시 켜기'}</span>
            </button>
            <button type="button" className={s.ctrl} aria-controls={slidesId} onClick={() => go(-1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
              <span className="visually-hidden">이전 사람</span>
            </button>
            <button type="button" className={s.ctrl} aria-controls={slidesId} onClick={() => go(1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
              <span className="visually-hidden">다음 사람</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
