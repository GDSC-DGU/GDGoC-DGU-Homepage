import { Fragment, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Project, ProjectImage } from '@/domain/types'
import { programName } from '../projectGroups'
import { assetUrl, isLive, projectCover, projectGallery, stageShots } from './exhibit'
import { Plate } from './Plate'
import { SHEET_STATE, sheetSearch } from './sheetLink'
import { morphOpen } from './sheetMorph'
import c from './exhibit.module.css'

/** '3기 · 2026' 처럼 · 로 잇되, '·' 는 앞 낱말에 붙여 줄이 점으로 시작하지 않게 */
export function Dotted({ parts }: { parts: ReactNode[] }) {
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && ' '}
          <span className={c.part}>
            {part}
            {i < parts.length - 1 && ' ·'}
          </span>
        </Fragment>
      ))}
    </>
  )
}

/** 바깥 링크 글자: 글자 + ↗ (읽기 프로그램에는 '(무엇, 새 창)') */
function OutText({ children, context }: { children: ReactNode; context?: string }) {
  return (
    <>
      {children}
      <span aria-hidden="true">↗</span>
      <span className="visually-hidden">{context ? ` (${context}, 새 창)` : ' (새 창)'}</span>
    </>
  )
}

/**
 * 지금 열리는 서비스로 가는 링크 '지금 써 보기 ↗'. url 이 있는 프로젝트(실제로 열리는 웹 · 스토어 주소)에만.
 * tone: 'button' = 두 번째 버튼 (대표 작품 · 자세히 보기 창), 'inline' = 작은 글자 링크 (줄 목록).
 */
export function LiveLink({ project, tone = 'inline', className = '' }: { project: Project; tone?: 'inline' | 'button' | 'primary'; className?: string }) {
  if (!isLive(project) || !project.url) return null
  const cls = tone === 'primary' ? 'btn-primary' : tone === 'button' ? 'btn-secondary' : c.liveLink
  return (
    <a className={`${cls} ${className}`} href={project.url} target="_blank" rel="noreferrer">
      <OutText context={`${project.name} 서비스`}>지금 써 보기</OutText>
    </a>
  )
}

/**
 * 작품 이름 = 자세히 보기 창(?p=id)을 여는 링크. 누르는 자리는 CSS 로 작품 전체까지 넓힌다.
 * linkTo: 다른 페이지(홈)에서 쓸 때 그 창이 있는 주소('/projects'). 그때는 /projects?p=id 로 옮겨 가서 창이 열린다.
 */
function OpenLink({ project, className, linkTo }: { project: Project; className: string; linkTo?: string }) {
  const navigate = useNavigate()
  if (linkTo) {
    return (
      <Link className={className} to={{ pathname: linkTo, search: sheetSearch(project.id) }}>
        {project.name}
      </Link>
    )
  }
  return (
    <Link
      className={className}
      to={{ search: sheetSearch(project.id) }}
      state={SHEET_STATE}
      preventScrollReset
      aria-haspopup="dialog"
      data-sheet-card={project.id}
      onClick={(e) => {
        // 새 창 · 새 탭으로 여는 누름은 그대로 둔다
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        const card = e.currentTarget.closest<HTMLElement>('[data-morph]')
        const opened = morphOpen(card, () => navigate({ search: sheetSearch(project.id) }, { state: SHEET_STATE, preventScrollReset: true, flushSync: true }))
        if (opened) e.preventDefault()
      }}
    >
      {project.name}
    </Link>
  )
}

function Shot({ img, className, eager }: { img: ProjectImage; className: string; eager: boolean }) {
  return <img className={className} src={assetUrl(img.src)} alt={img.alt} width={img.width} height={img.height} loading={eager ? 'eager' : 'lazy'} decoding="async" />
}

/**
 * 대표 작품 무대 (16:10, radius 20): 넓은 화면 + 폰 화면이 다 있으면 겹쳐 걸고(약조심), 아니면 표지 한 장을 크게(Greenap).
 * 기기 틀은 그리지 않는다. 1px 선, 위에 놓인 폰 화면에만 그림자 (DESIGN 8장).
 */
function Stage({ project, eager, className = '' }: { project: Project; eager: boolean; className?: string }) {
  const shots = stageShots(projectGallery(project))
  if (shots) {
    return (
      <div className={`${c.stage} ${className}`} data-stage="duo" data-morph-media>
        <Shot img={shots.wide} className={c.desk} eager={eager} />
        <Shot img={shots.tall} className={c.phone} eager={eager} />
      </div>
    )
  }
  const cover = projectCover(project)
  return (
    <div className={`${c.stage} ${className}`} data-stage={cover?.kind ?? 'type'} data-morph-media>
      {cover ? <Shot img={cover} className={c.single} eager={eager} /> : <Plate project={project} className={c.stagePlate} />}
    </div>
  )
}

/**
 * 전시실 맨 앞에 크게 거는 작품 (실제 화면이 있는 것): 무대 7칸 | 이름 · 한 줄 · 쓴 기술 · 지금 써 보기 5칸.
 * 이름 링크가 작품 전체를 덮어 무대를 눌러도 자세히 보기 창이 열린다. '자세히 보기 →' 는 그 링크의 보이는 신호(읽지 않음).
 * GitHub · 데모 영상은 자세히 보기 창에만 둔다.
 */
export function FeaturedWork({ project, eager = false, level = 4 }: { project: Project; eager?: boolean; level?: 3 | 4 }) {
  const Heading = level === 3 ? 'h3' : 'h4'
  const stack = project.stack ?? []
  return (
    <div className={c.feature} data-morph="media">
      <div className={c.featureText}>
        <Heading className={c.featureName}>
          <OpenLink project={project} className={c.open} />
        </Heading>
        {project.summary && <p className={c.featureSummary}>{project.summary}</p>}
        {stack.length > 0 && (
          <p className={c.featureStack}>
            <Dotted parts={stack} />
          </p>
        )}
        <div className={c.featureActions}>
          <LiveLink project={project} tone="button" className={c.raise} />
          <span className={c.cue} aria-hidden="true">
            자세히 보기
          </span>
        </div>
      </div>
      <Stage project={project} eager={eager} />
    </div>
  )
}

/** 대표 작품 아래 줄 목록 (넓은 화면 3칸 · 태블릿 2칸 · 폰 1칸) */
export function WorkList({ label, children, id, className = '', expanded }: { label: string; children: ReactNode; id?: string; className?: string; expanded?: boolean }) {
  return (
    <ul id={id} className={`${c.list} ${className}`} aria-label={label} data-expanded={expanded || undefined}>
      {children}
    </ul>
  )
}

/**
 * 줄 목록의 작품 한 점: 아이콘 표지(흰 판 · 로고, 그림이 없으면 머리글자 표지) + 이름 / 한 줄 설명(두 줄까지) / 쓴 기술.
 * 만든 해 · 기수는 전시실 머리가 말하므로 되풀이하지 않는다. withProgram: 여러 프로그램이 섞인 방(그 밖의 프로젝트)에서 프로그램 · 연도를 앞에.
 */
export function ExhibitCard({ project, withProgram = false, level = 4, linkTo }: { project: Project; withProgram?: boolean; level?: 3 | 4; linkTo?: string }) {
  const Heading = level === 3 ? 'h3' : 'h4'
  // 그 밖의 프로젝트: '2025 · 챕터 웹사이트 · Next.js · TypeScript' (연도는 한 번만)
  const meta: ReactNode[] = withProgram
    ? [<span key="y" className="num">{project.year}</span>, programName(project), ...(project.stack ?? []).slice(0, 2)]
    : (project.stack ?? []).slice(0, 3)
  return (
    <li className={c.work} data-morph="box">
      <Plate project={project} className={c.icon} />
      <div className={c.label}>
        <Heading className={c.name}>
          <OpenLink project={project} className={c.open} linkTo={linkTo} />
        </Heading>
        {project.summary && <p className={c.summary}>{project.summary}</p>}
        {meta.length > 0 && (
          <p className={c.meta}>
            <Dotted parts={meta} />
          </p>
        )}
        <LiveLink project={project} className={c.raise} />
      </div>
    </li>
  )
}

/** 기수 탭 안 카드 격자 (넓은 화면 3칸 · 태블릿 2칸 · 폰 1칸) */
export function ProjectGrid({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul className={c.grid} aria-label={label}>
      {children}
    </ul>
  )
}

/**
 * 격자 카드 한 장: 그림(16:9) → 이름 → 한 줄 설명(두 줄까지). 카드 전체가 자세히 보기 창(?p=id)을 연다.
 * 그림은 대표 작품 무대와 같은 규칙 (화면 둘 겹치기 · 표지 한 장 · 로고는 흰 판 가운데).
 * 그림이 없는 프로젝트는 글자 표지(이름 · 만든 때 · 언어 비율). 사진은 나중에 projects.json 에 채운다.
 * withProgram: 여러 프로그램이 섞인 방(그 밖의 프로젝트)에서 '2025 · 동국대 봄 축제' 한 줄을 이름 아래에.
 */
export function GridCard({ project, withProgram = false, eager = false, level = 4 }: { project: Project; withProgram?: boolean; eager?: boolean; level?: 3 | 4 }) {
  const Heading = level === 3 ? 'h3' : 'h4'
  return (
    <li className={c.card} data-morph="media">
      <Stage project={project} eager={eager} className={c.thumb} />
      <div className={c.cardBody}>
        <Heading className={c.cardName}>
          <OpenLink project={project} className={c.open} />
        </Heading>
        {withProgram && (
          <p className={c.cardMeta}>
            <Dotted parts={[<span key="y" className="num">{project.year}</span>, programName(project)]} />
          </p>
        )}
        {project.summary && <p className={c.cardSummary}>{project.summary}</p>}
      </div>
    </li>
  )
}
