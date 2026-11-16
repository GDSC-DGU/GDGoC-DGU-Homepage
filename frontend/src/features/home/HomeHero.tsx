import { Fragment, useCallback, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { EVENTS, GENERATIONS, PHOTOS } from '@/content'
import { HOME_CAROUSEL, HOME_SLIDES } from '@/content/home'
import { recruitStatus } from '@/content/recruitingStatus'
import { HERO } from '@/content/story'
import { withoutStalePlans } from '@/content/plan'
import { useSchedule } from '@/data/queries'
import type { EventPhoto } from '@/domain/types'
import { assetUrl } from '@/features/pages/projects/exhibit'
import { useToday } from '@/hooks/useToday'
import { fill } from './homeData'
import { carouselFaces, cylinder, dotDate, nextHighlight, recruitSlideText, wrapIndex } from './landing'
import { MoreLink } from './HomeHead'
import { LogoWordmark } from './LogoWordmark'
import { NextTicker } from './NextTicker'
import { Chevron, PlayPause } from './SlideControls'
import { useAutoplay } from './useReveal'
import s from './homeHero.module.css'

interface Slide {
  id: string
  cate: string
  photo: EventPhoto
  title: string
  body: string
  action: string
  to: string
}

const photoById = (id: string) => PHOTOS.find((p) => p.id === id)
const srcOf = (p: EventPhoto) => (p.src.startsWith('https://') ? p.src : assetUrl(p.src))

/** 슈어소프트테크 첫 화면: 5초마다 한 칸 */
const AUTO_MS = 5000
/** 밀어서 넘기는 거리 (px) */
const SWIPE = 40

function useSlides(): Slide[] {
  const today = useToday()
  const { data } = useSchedule()
  return useMemo(() => {
    const gens = [...GENERATIONS].sort((a, b) => a.n - b.n)
    const current = gens.find((g) => g.current) ?? gens[gens.length - 1]
    const start = gens[0]?.start?.slice(0, 4) ?? ''
    const next = nextHighlight(withoutStalePlans(data ?? EVENTS, today), today)
    const recruit = recruitSlideText(recruitStatus(today))
    const c = HOME_SLIDES
    const list: (Omit<Slide, 'photo'> & { photoId: string })[] = [
      { id: 'community', cate: c.community.cate, photoId: c.community.photo, title: fill(c.community.title, { gen: current?.n ?? '' }), body: fill(c.community.body, { start }), action: c.community.action, to: c.community.to },
      ...(next ? [{ id: 'next', cate: c.next.cate, photoId: c.next.photo, title: next.title, body: fill(c.next.body, { date: dotDate(next.date) }), action: c.next.action, to: c.next.to }] : []),
      { id: 'recruit', cate: c.recruit.cate, photoId: c.recruit.photo, ...recruit, action: c.recruit.action, to: c.recruit.to },
    ]
    // 사진이 없는(공개 동의 기록이 빠진) 슬라이드는 싣지 않는다
    return list.flatMap(({ photoId, ...rest }) => {
      const photo = photoById(photoId)
      return photo ? [{ ...rest, photo }] : []
    })
  }, [data, today])
}

/**
 * 첫 화면 (4기 Organizer 2026-11-16: 슈어소프트테크 첫 화면을 움직임까지 그대로).
 * - 이름(0.1초) → 한 줄(0.35초) → 슬라이드(0.55초) → 다가오는 일정(0.75초) 순서로 40px 아래에서 0.6초 동안 올라온다 (visualTitleFadeUp).
 * - 슬라이드는 3D 원통: 면이 원통 둘레에 서 있고 원통이 한 칸(0.5초)씩 돈다. 6면이 안 되면 앞 장을 되풀이해 채운다.
 *   가운데 면만 색이 있고 누를 수 있다. 옆 면은 흑백 · 30% (슈어소프트테크 값).
 * - 5초마다 저절로 돈다. 마우스를 올리거나 초점이 안에 있거나 멈춤 버튼을 누르면 쉰다. '동작 줄이기'면 돌지 않고 바로 바뀐다.
 * - 사진 위 글자는 그 장이 가리키는 곳의 제목이다 (무슨 행사 사진인지는 alt 에).
 */
export function HomeHero() {
  const slides = useSlides()
  const faces = useMemo(() => carouselFaces(slides.length), [slides.length])
  const n = faces.length
  const sceneRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)
  const [geo, setGeo] = useState<{ theta: number; apothem: number } | null>(null)
  const [hover, setHover] = useState(false)
  const [focusIn, setFocusIn] = useState(false)
  const [stopped, setStopped] = useState(false)
  const active = wrapIndex(step, n)

  // 면 폭을 재서 원통을 세운다 (크기가 바뀌면 다시)
  useLayoutEffect(() => {
    const scene = sceneRef.current
    if (!scene || n < 2) return
    const measure = () => {
      const w = scene.offsetWidth
      if (w > 0) setGeo(cylinder(w, n))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(scene)
    return () => ro.disconnect()
  }, [n])

  const go = useCallback((delta: number) => setStep((x) => x + delta), [])
  const next = useCallback(() => go(1), [go])
  useAutoplay(next, AUTO_MS, n < 2 || hover || focusIn || stopped)

  // 밀어서 넘기기 (폰)
  const startX = useRef<number | null>(null)
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') startX.current = e.clientX
  }
  const onPointerUp = (e: PointerEvent) => {
    if (startX.current === null) return
    const dx = e.clientX - startX.current
    startX.current = null
    if (Math.abs(dx) > SWIPE) go(dx < 0 ? 1 : -1)
  }

  const origin = geo ? `50% 50% ${-geo.apothem}px` : undefined
  return (
    <section className={s.hero} aria-labelledby="hero-title">
      <div className={`container ${s.top}`}>
        <h1 id="hero-title" className={`${s.title} ${s.in1}`}>
          <LogoWordmark name={HERO.name} className={s.wordmark} />
        </h1>
        <p className={`${s.lead} ${s.in2}`}>
          {HERO.pitch.map((line, i) => (
            <Fragment key={line}>
              {i > 0 && ' '}
              <span className={s.leadLine}>{line}</span>
            </Fragment>
          ))}
        </p>
      </div>

      {n > 0 && (
        <div
          className={`${s.visual} ${s.in3}`}
          role="group"
          aria-roledescription="슬라이드 묶음"
          aria-label={HOME_CAROUSEL.label}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onFocus={() => setFocusIn(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusIn(false)
          }}
        >
          <div className={s.carousel} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (startX.current = null)}>
            <div
              ref={sceneRef}
              id="hero-slides"
              className={s.scene}
              style={geo ? { transformOrigin: origin, transform: `rotateY(${-step * geo.theta}rad)` } : undefined}
              aria-live={stopped || hover || focusIn ? 'polite' : 'off'}
            >
              {faces.map((orig, i) => {
                const sl = slides[orig]
                const on = i === active
                const clone = i >= slides.length
                return (
                  <div
                    key={`${sl.id}-${i}`}
                    className={s.item}
                    data-active={on || undefined}
                    aria-hidden={clone || !on || undefined}
                    aria-roledescription={clone ? undefined : '슬라이드'}
                    aria-label={clone ? undefined : `${orig + 1} / ${slides.length}`}
                    style={i > 0 && geo ? { transformOrigin: origin, transform: `rotateY(${i * geo.theta}rad)` } : undefined}
                  >
                    <div className={s.card}>
                      <img className={s.img} src={srcOf(sl.photo)} alt={clone ? '' : sl.photo.alt} width={sl.photo.width} height={sl.photo.height} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
                      <div className={`on-dark ${s.text}`}>
                        <p className={s.cate} lang="en">
                          {sl.cate}
                        </p>
                        <h2 className={s.slideTitle}>{sl.title}</h2>
                        <p className={s.slideBody}>{sl.body}</p>
                        <div className={s.slideAction}>
                          <MoreLink to={sl.to} tone="dark" tabIndex={on ? undefined : -1}>
                            {sl.action}
                          </MoreLink>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          {n > 1 && (
            <div className={s.arrows}>
              <button type="button" className={s.arrow} aria-controls="hero-slides" aria-label={HOME_CAROUSEL.prev} onClick={() => go(-1)}>
                <Chevron dir="prev" />
              </button>
              <button type="button" className={s.arrow} aria-controls="hero-slides" aria-label={HOME_CAROUSEL.next} onClick={() => go(1)}>
                <Chevron dir="next" />
              </button>
            </div>
          )}
          {n > 1 && (
            <button type="button" className={s.pause} aria-controls="hero-slides" aria-pressed={stopped} aria-label={stopped ? HOME_CAROUSEL.play : HOME_CAROUSEL.pause} onClick={() => setStopped((x) => !x)}>
              <PlayPause paused={stopped} />
            </button>
          )}
        </div>
      )}

      <div className={`container ${s.in4}`}>
        <NextTicker />
      </div>
    </section>
  )
}
