import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PROJECTS, isPublicProject } from '@/content'
import { HOME_PROJECTS } from '@/content/home'
import { PROJECTS_STORY } from '@/content/story'
import { useProjects } from '@/data/queries'
import type { Project } from '@/domain/types'
import { StorySection } from '@/features/common'
import { assetUrl, isWorkImage, monogram } from '@/features/pages/projects/exhibit'
import { sheetSearch } from '@/features/pages/projects/sheetLink'
import { useReducedMotion } from '@/hooks/useMediaQuery'
import { fill, projectCounts } from './homeData'
import { railImage, railProjects } from './landing'
import s from './projectRail.module.css'

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

function Chevron({ dir }: { dir: 'prev' | 'next' }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d={dir === 'prev' ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * 3 팀 프로젝트 (슈어소프트테크 'Promotion Center'): 옅은 회색 면, 제목 | 오른쪽 '전체 보기', 아래 옆으로 넘기는 카드 줄.
 * 카드: 그림(실제 화면, 없으면 로고 · 글자 표지) → 프로그램 → 이름 → 한 줄 → 해. 누르면 아카이브의 자세히 보기 창.
 * 줄 아래: 얼마나 넘겼는지 막대 + 이전 · 다음 버튼. 숫자는 projects.json 에서 센다.
 */
export function ProjectRail() {
  const { data } = useProjects()
  const list = (data ?? PROJECTS).filter(isPublicProject)
  const { done, solutionChallenge } = projectCounts(list)
  const shown = railProjects(list, HOME_PROJECTS.limit)
  const reduce = useReducedMotion()
  const trackRef = useRef<HTMLUListElement>(null)
  const [progress, setProgress] = useState(0)

  const onScroll = useCallback(() => {
    const t = trackRef.current
    if (!t) return
    const max = t.scrollWidth - t.clientWidth
    setProgress(max > 0 ? t.scrollLeft / max : 0)
  }, [])
  useEffect(() => {
    const t = trackRef.current
    if (!t) return
    onScroll()
    t.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      t.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [onScroll, shown.length])

  const move = (dir: 1 | -1) => {
    const t = trackRef.current
    const card = t?.firstElementChild as HTMLElement | null
    if (!t || !card) return
    const step = card.offsetWidth + parseFloat(getComputedStyle(t).columnGap || '0')
    const perView = Math.max(1, Math.floor(t.clientWidth / step))
    t.scrollBy({ left: dir * step * perView, behavior: reduce ? 'auto' : 'smooth' })
  }

  if (done === 0) return null
  return (
    <StorySection
      id="projects"
      tone="field"
      className={s.section}
      title={fill(PROJECTS_STORY.title, { n: done })}
      sub={fill(PROJECTS_STORY.sub[0], { sc: solutionChallenge })}
      action={
        <Link className="btn-secondary" to="/archive">
          {HOME_PROJECTS.more}
        </Link>
      }
    >
      <ul ref={trackRef} id="project-rail" className={s.track}>
        {shown.map((p) => (
          <RailCard key={p.id} p={p} />
        ))}
      </ul>
      <div className={s.controls}>
        <div className={s.bar} aria-hidden="true">
          <span className={s.barFill} style={{ ['--p' as string]: String(Math.max(0.08, progress)) }} />
        </div>
        <button type="button" className={s.arrow} aria-controls="project-rail" aria-label={HOME_PROJECTS.prev} onClick={() => move(-1)}>
          <Chevron dir="prev" />
        </button>
        <button type="button" className={s.arrow} aria-controls="project-rail" aria-label={HOME_PROJECTS.next} onClick={() => move(1)}>
          <Chevron dir="next" />
        </button>
      </div>
    </StorySection>
  )
}
