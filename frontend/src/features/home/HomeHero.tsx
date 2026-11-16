import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { EVENTS, GENERATIONS, PHOTOS } from '@/content'
import { HOME_SLIDES } from '@/content/home'
import { recruitStatus } from '@/content/recruitingStatus'
import { HERO } from '@/content/story'
import { withoutStalePlans } from '@/content/plan'
import { useSchedule } from '@/data/queries'
import type { EventPhoto } from '@/domain/types'
import { assetUrl } from '@/features/pages/projects/exhibit'
import { useReducedMotion } from '@/hooks/useMediaQuery'
import { useToday } from '@/hooks/useToday'
import { fill } from './homeData'
import { dotDate, nextHighlight, recruitSlideText } from './landing'
import { LogoWordmark } from './LogoWordmark'
import s from './homeHero.module.css'

interface Slide {
  id: string
  photo: EventPhoto
  title: string
  body: string
  action: string
  to: string
}

const photoById = (id: string) => PHOTOS.find((p) => p.id === id)
const srcOf = (p: EventPhoto) => (p.src.startsWith('https://') ? p.src : assetUrl(p.src))

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
      { id: 'community', photoId: c.community.photo, title: fill(c.community.title, { gen: current?.n ?? '' }), body: fill(c.community.body, { start }), action: c.community.action, to: c.community.to },
      ...(next ? [{ id: 'next', photoId: c.next.photo, title: next.title, body: fill(c.next.body, { date: dotDate(next.date) }), action: c.next.action, to: c.next.to }] : []),
      { id: 'recruit', photoId: c.recruit.photo, ...recruit, action: c.recruit.action, to: c.recruit.to },
    ]
    // 사진이 없는(공개 동의 기록이 빠진) 슬라이드는 싣지 않는다
    return list.flatMap(({ photoId, ...rest }) => {
      const photo = photoById(photoId)
      return photo ? [{ ...rest, photo }] : []
    })
  }, [data, today])
}

function Chevron({ dir }: { dir: 'prev' | 'next' }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d={dir === 'prev' ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * 첫 화면 (4기 Organizer 2026-11-16: 슈어소프트테크 첫 화면처럼 큰 이름 + 한 줄 + 사진 슬라이드. 캠퍼스 지도는 뺀다).
 * 이름은 예전처럼 로고에서 꺾쇠가 벌어지며 'GDGoC DGU' 가 된다 (LogoWordmark).
 * 슬라이드는 가운데 한 장이 크게, 양옆 장이 조금 보인다. 옆으로 밀거나 양쪽 버튼 · 아래 점으로 넘긴다. 저절로 넘어가지 않는다.
 * 사진 위 글자는 행사 설명이 아니라 그 장이 가리키는 곳의 제목이다 (무슨 행사 사진인지는 alt 에).
 */
export function HomeHero() {
  const slides = useSlides()
  const reduce = useReducedMotion()
  const trackRef = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)

  // 가운데에 온 장을 찾는다 (밀어서 넘겨도 버튼 · 점이 따라온다)
  useEffect(() => {
    const track = trackRef.current
    if (!track || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        // isIntersecting 은 조금만 보여도 true 라, 60% 넘게 보이는 장만 고른다
        for (const e of entries) if (e.intersectionRatio >= 0.6) setActive(Number((e.target as HTMLElement).dataset.index))
      },
      { root: track, threshold: 0.6 },
    )
    for (const li of track.children) io.observe(li)
    return () => io.disconnect()
  }, [slides.length])

  const go = useCallback(
    (i: number) => {
      const track = trackRef.current
      const n = slides.length
      if (!track || n === 0) return
      const idx = (i + n) % n
      const li = track.children[idx] as HTMLElement | undefined
      if (!li) return
      track.scrollTo({ left: li.offsetLeft - (track.clientWidth - li.clientWidth) / 2, behavior: reduce ? 'auto' : 'smooth' })
      setActive(idx)
    },
    [reduce, slides.length],
  )

  return (
    <section className={s.hero} aria-labelledby="hero-title">
      <div className={`container ${s.top}`}>
        <h1 id="hero-title" className={s.title}>
          <LogoWordmark name={HERO.name} className={s.wordmark} />
        </h1>
        <p className={s.lead}>
          {HERO.pitch.map((line, i) => (
            <Fragment key={line}>
              {i > 0 && ' '}
              <span className={s.leadLine}>{line}</span>
            </Fragment>
          ))}
        </p>
      </div>

      {slides.length > 0 && (
        <div className={s.carousel} role="group" aria-roledescription="슬라이드 묶음" aria-label="GDGoC DGU 소식">
          <ul ref={trackRef} id="hero-slides" className={s.track}>
            {slides.map((sl, i) => (
              <li key={sl.id} className={s.slide} data-index={i} data-active={i === active || undefined} aria-roledescription="슬라이드" aria-label={`${i + 1} / ${slides.length}`}>
                <div className={s.card}>
                  <img className={s.img} src={srcOf(sl.photo)} alt={sl.photo.alt} width={sl.photo.width} height={sl.photo.height} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
                  <div className={`on-dark ${s.text}`}>
                    <h2 className={s.slideTitle}>{sl.title}</h2>
                    <p className={s.slideBody}>{sl.body}</p>
                    <Link className={`btn-primary btn-sm ${s.slideAction}`} to={sl.to} tabIndex={i === active ? undefined : -1}>
                      {sl.action}
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {slides.length > 1 && (
            <>
              <button type="button" className={`${s.arrow} ${s.prev}`} aria-controls="hero-slides" aria-label="이전 슬라이드" onClick={() => go(active - 1)}>
                <Chevron dir="prev" />
              </button>
              <button type="button" className={`${s.arrow} ${s.next}`} aria-controls="hero-slides" aria-label="다음 슬라이드" onClick={() => go(active + 1)}>
                <Chevron dir="next" />
              </button>
              <div className={s.dots}>
                {slides.map((sl, i) => (
                  <button key={sl.id} type="button" className={s.dot} aria-controls="hero-slides" aria-label={`${i + 1}번째 슬라이드: ${sl.title}`} aria-current={i === active || undefined} onClick={() => go(i)} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}
