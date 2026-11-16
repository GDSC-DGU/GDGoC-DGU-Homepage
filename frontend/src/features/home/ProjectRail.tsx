import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PROJECTS, isPublicProject } from '@/content'
import { HOME_PROJECTS } from '@/content/home'
import { PROJECTS_STORY } from '@/content/story'
import { useProjects } from '@/data/queries'
import type { Project } from '@/domain/types'
import { StoryHead } from '@/features/common'
import { assetUrl, isWorkImage, monogram } from '@/features/pages/projects/exhibit'
import { sheetSearch } from '@/features/pages/projects/sheetLink'
import { useReducedMotion } from '@/hooks/useMediaQuery'
import { fill, projectCounts } from './homeData'
import { railImage, railProjects } from './landing'
import { Chevron, PlayPause } from './SlideControls'
import { aos, useAutoplay } from './useReveal'
import s from './projectRail.module.css'

/** 슈어소프트테크 'Promotion Center': 5초마다 한 장 */
const AUTO_MS = 5000

function RailCard({ p }: { p: Project }) {
  const img = railImage(p)
  const work = isWorkImage(img)
  return (
    <li className={s.item}>
      <div className={s.media} data-fit={work ? 'cover' : 'logo'}>
        {img ? (
          <img className={s.img} src={assetUrl(img.src)} alt={img.alt} width={img.width} height={img.height} loading="lazy" decoding="async" />
        ) : (
          <span className={s.mono} aria-hidden="true">
            {monogram(p.name)}
          </span>
        )}
      </div>
      <div className={s.body}>
        <p className={s.program}>{p.program}</p>
        <h3 className={s.name}>
          <Link className={s.link} to={{ pathname: '/archive', search: sheetSearch(p.id) }}>
            {p.name}
          </Link>
        </h3>
        {p.summary && <p className={s.summary}>{p.summary}</p>}
        <p className={`num ${s.year}`}>{p.generation ? `${p.year}, ${p.generation}기` : p.year}</p>
      </div>
    </li>
  )
}

/**
 * 3 팀 프로젝트 (슈어소프트테크 'Promotion Center'): 옅은 회색 면, 제목 | 오른쪽 '전체 보기', 아래 옆으로 넘기는 카드 줄.
 * 카드: 그림(실제 화면, 없으면 로고 · 글자 표지) → 프로그램 → 이름 → 한 줄 → 해. 누르면 아카이브의 자세히 보기 창.
 * 5초마다 한 장씩 저절로 넘어가고(끝에 닿으면 처음으로), 진행 막대는 (몇 번째 + 1) / 넘길 수 있는 칸 수.
 * 마우스를 올리거나 초점이 안에 있거나 멈춤 버튼을 누르면 쉰다. 숫자는 projects.json 에서 센다.
 */
export function ProjectRail() {
  const { data } = useProjects()
  const list = (data ?? PROJECTS).filter(isPublicProject)
  const { done, solutionChallenge } = projectCounts(list)
  const shown = railProjects(list, HOME_PROJECTS.limit)
  const reduce = useReducedMotion()
  const trackRef = useRef<HTMLUListElement>(null)
  const [pos, setPos] = useState({ index: 0, stops: 1 })
  const [stopped, setStopped] = useState(false)
  const [hover, setHover] = useState(false)
  const [focusIn, setFocusIn] = useState(false)

  /** 카드 한 칸 폭(간격 포함) · 지금 몇 번째 · 넘길 수 있는 칸 수 */
  const measure = useCallback(() => {
    const t = trackRef.current
    const card = t?.firstElementChild as HTMLElement | null
    if (!t || !card) return null
    const step = card.offsetWidth + (parseFloat(getComputedStyle(t).columnGap) || 0)
    const max = t.scrollWidth - t.clientWidth
    const stops = Math.max(1, Math.round(max / step) + 1)
    const index = max <= 1 ? 0 : Math.min(stops - 1, Math.round(t.scrollLeft / step))
    return { t, step, max, stops, index }
  }, [])

  useEffect(() => {
    const t = trackRef.current
    if (!t) return
    const on = () => {
      const m = measure()
      if (m) setPos({ index: m.index, stops: m.stops })
    }
    on()
    t.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      t.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, [measure, shown.length])

  const move = useCallback(
    (dir: 1 | -1) => {
      const m = measure()
      if (!m) return
      // 끝에서 다음 → 처음, 처음에서 이전 → 끝 (슈어소프트테크 loop 처럼 계속 돈다)
      const target = dir === 1 && m.index >= m.stops - 1 ? 0 : dir === -1 && m.index <= 0 ? m.max : (m.index + dir) * m.step
      m.t.scrollTo({ left: target, behavior: reduce ? 'auto' : 'smooth' })
    },
    [measure, reduce],
  )
  const next = useCallback(() => move(1), [move])
  useAutoplay(next, AUTO_MS, pos.stops < 2 || stopped || hover || focusIn)

  if (done === 0) return null
  const progress = (pos.index + 1) / pos.stops
  return (
    <section id="projects" className={`story field ${s.section}`} aria-labelledby="projects-title">
      <div className="container">
        <div {...aos(250)}>
          <StoryHead
            titleId="projects-title"
            title={fill(PROJECTS_STORY.title, { n: done })}
            sub={fill(PROJECTS_STORY.sub[0], { sc: solutionChallenge })}
            action={
              <Link className="btn-secondary" to="/archive">
                {HOME_PROJECTS.more}
              </Link>
            }
          />
        </div>
        <div
          {...aos(300)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onFocus={() => setFocusIn(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusIn(false)
          }}
        >
          <ul ref={trackRef} id="project-rail" className={s.track}>
            {shown.map((p) => (
              <RailCard key={p.id} p={p} />
            ))}
          </ul>
          <div className={s.controls}>
            <div className={s.bar} aria-hidden="true">
              <span className={s.barFill} style={{ ['--p' as string]: String(progress) }} />
            </div>
            <button type="button" className={s.arrow} aria-controls="project-rail" aria-pressed={stopped} aria-label={stopped ? HOME_PROJECTS.play : HOME_PROJECTS.pause} onClick={() => setStopped((x) => !x)}>
              <PlayPause paused={stopped} />
            </button>
            <button type="button" className={s.arrow} aria-controls="project-rail" aria-label={HOME_PROJECTS.prev} onClick={() => move(-1)}>
              <Chevron dir="prev" size={16} />
            </button>
            <button type="button" className={s.arrow} aria-controls="project-rail" aria-label={HOME_PROJECTS.next} onClick={() => move(1)}>
              <Chevron dir="next" size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
