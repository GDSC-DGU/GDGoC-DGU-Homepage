import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { PROJECTS } from '@/content'
import { HOME_PROJECTS } from '@/content/home'
import { assetUrl } from '@/features/pages/projects/exhibit'
import { sheetSearch } from '@/features/pages/projects/sheetLink'
import { logoProjects, type LogoProject } from './landing'
import s from './logoMarquee.module.css'

/** 슈어소프트테크 파트너 로고 흐름: 한 프레임에 0.6px */
const SPEED = 0.6

/** 줄 하나: 같은 목록을 두 번 이어 붙여 반 바퀴마다 제자리로 (끊김 없이 끝없이 흐른다) */
function Row({ items, dir }: { items: readonly LogoProject[]; dir: 'rtl' | 'ltr' }) {
  const trackRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const track = trackRef.current
    if (!track || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let half = track.scrollWidth / 2
    let x = dir === 'ltr' ? -half : 0
    let raf = 0
    let paused = false
    let visible = true
    const tick = () => {
      if (!paused && visible && half > 0) {
        x += dir === 'rtl' ? -SPEED : SPEED
        if (dir === 'rtl' && -x >= half) x = 0
        if (dir === 'ltr' && x >= 0) x = -half
        track.style.transform = `translate3d(${x}px, 0, 0)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // 마우스를 올리거나 초점이 들어오면 멈춘다 · 화면 밖이면 쉰다
    const stop = () => (paused = true)
    const go = () => (paused = false)
    const onBlur = (e: FocusEvent) => {
      if (!track.contains(e.relatedTarget as Node | null)) go()
    }
    track.addEventListener('mouseenter', stop)
    track.addEventListener('mouseleave', go)
    track.addEventListener('focusin', stop)
    track.addEventListener('focusout', onBlur)
    const io = new IntersectionObserver((es) => (visible = es.some((e) => e.isIntersecting)))
    io.observe(track)
    const ro = new ResizeObserver(() => (half = track.scrollWidth / 2))
    ro.observe(track)
    return () => {
      cancelAnimationFrame(raf)
      track.removeEventListener('mouseenter', stop)
      track.removeEventListener('mouseleave', go)
      track.removeEventListener('focusin', stop)
      track.removeEventListener('focusout', onBlur)
      io.disconnect()
      ro.disconnect()
    }
  }, [dir, items.length])

  return (
    <div className={s.row}>
      <div ref={trackRef} className={s.track}>
        {[0, 1].map((copy) => (
          <ul key={copy} className={s.list} aria-hidden={copy === 1 || undefined}>
            {items.map((p) => (
              <li key={p.id} className={s.item}>
                <Link className={s.link} to={{ pathname: '/archive', search: sheetSearch(p.id) }} tabIndex={copy === 1 ? -1 : undefined}>
                  <img className={s.img} src={assetUrl(p.cover.src)} alt={copy === 1 ? '' : p.name} width={p.cover.width} height={p.cover.height} loading="lazy" decoding="async" />
                </Link>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}

/**
 * 소개 섹션 아래 로고 흐름 (슈어소프트테크 파트너 로고 두 줄 자리). 우리는 파트너 로고가 없어, 팀 프로젝트 로고로 채운다.
 * 윗줄은 왼쪽으로, 아랫줄은 오른쪽으로 흐른다. 로고를 누르면 아카이브의 자세히 보기 창. '동작 줄이기'면 멈춰 있다.
 */
export function LogoMarquee() {
  const logos = useMemo(() => logoProjects(PROJECTS), [])
  if (logos.length < 4) return null
  const top = logos.filter((_, i) => i % 2 === 0)
  const bottom = logos.filter((_, i) => i % 2 === 1)
  return (
    <div className={s.wrap}>
      <h3 className="visually-hidden">{HOME_PROJECTS.logosLabel}</h3>
      <Row items={top} dir="rtl" />
      <Row items={bottom} dir="ltr" />
    </div>
  )
}
