import { useId, useRef, type CSSProperties, type MouseEvent, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { PLACE_BY_ID, placeColor } from '@/config/places'
import { SITE } from '@/config/site'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useToday } from '@/hooks/useToday'
import { scrollToSection } from '@/features/home/scrollTo'
import { focusFrame, narrowFrame, viewBoxString, wideFrame, type HeroFrame } from './frame'
import { HeroScene } from './HeroScene'
import { buildingLook, type HeroPlace } from './look'
import { useHeroLayout } from './useHeroLayout'
import s from './placehero.module.css'

/**
 * 하위 페이지 머리: 홈 지도의 그 건물 앞에 서 있는 장면 + 건물 안내판(이 페이지 안의 묶음 목차).
 * - 제목 · 리드 · 기준 줄 · 안내판은 진짜 HTML. 장면(SVG)은 꾸밈이라 aria-hidden.
 * - 넓은 화면: 글자 왼쪽 | 장면 오른쪽(화면 끝까지), 안내판은 지붕에서 지시선으로 매단다.
 * - plateAt='text' (프로젝트): 안내판을 지붕에 매달지 않고 글자 아래에 둔다. 장면은 본문 틀 안에서 끝나고(양옆을 흐리게) 건물을 가운데에 크게 (frame.ts focusFrame).
 * - 1024 미만: 글자 → 작은 장면 (안내판은 넓은 화면에만. 시안 E)
 * - 건물 상태는 실제 데이터에서 (look.ts): G-Sprint 기간 · 모집 상태 · 공사 중.
 */
export type { HeroPlace } from './look'

export interface DirectoryRow {
  label: ReactNode
  value?: ReactNode
  /** 같은 페이지 안 섹션 '#id' 또는 다른 주소 */
  href?: string
  /** '#id' 줄을 눌렀을 때 페이지가 직접 처리 (그 섹션이 아직 그려지지 않은 탭 안에 있을 때). 주면 기본 이동은 막는다 */
  onSelect?: () => void
  /** 지금 기수 표시(주황 4기 태그)를 붙일지 */
  current?: boolean
}

export interface PlaceHeroProps {
  place: HeroPlace
  eyebrow?: ReactNode
  title: ReactNode
  lead?: ReactNode
  meta?: ReactNode
  /** 건물 안내판: 이 페이지 안의 주요 묶음 3–6줄 */
  directory?: DirectoryRow[]
  /** 건물 상태. 생략하면 장소별 기본값(G-Sprint · 모집 기간에서 계산) */
  state?: 'open' | 'closed' | 'construction'
  /** 커뮤니티 건물 지붕 화면에 띄울 다음 일정 */
  screen?: { date: string; title: string }
  /** 안내판 머리 글. 생략하면 '프로젝트 안내' 처럼 장소 이름 + 안내 */
  directoryTitle?: ReactNode
  /** 안내판 자리: 'roof' = 지붕에 지시선으로 매단다(기본), 'text' = 글자 아래 */
  plateAt?: 'roof' | 'text'
}

/** 이 폭 미만이면 위아래로 쌓는다 (pages.module.css 의 섹션과 같은 기준) */
export const HERO_STACK_QUERY = '(max-width: 1023px)'

const directoryName = (place: HeroPlace) => {
  const label = PLACE_BY_ID[place].label
  return label.endsWith('안내') ? label : `${label} 안내`
}

/** 같은 페이지 섹션으로: hash 주소(#/…) 미리보기에서도 라우터가 가로채지 않게 직접 옮긴다 */
function onSectionClick(e: MouseEvent<HTMLAnchorElement>, href: string) {
  const id = decodeURIComponent(href.slice(1))
  if (!document.getElementById(id)) return
  e.preventDefault()
  scrollToSection(id)
}

function RowBody({ row }: { row: DirectoryRow }) {
  return (
    <>
      <span className={s.rowLabel}>
        {row.current && <span className={`gen-tag ${s.rowTag}`}>{SITE.generation}</span>}
        {row.label}
      </span>
      {row.value !== undefined && row.value !== null && <span className={`num ${s.rowValue}`}>{row.value}</span>}
    </>
  )
}

function Row({ row }: { row: DirectoryRow }) {
  const { href, onSelect } = row
  if (!href) {
    return (
      <li className={s.row}>
        <RowBody row={row} />
      </li>
    )
  }
  let link: ReactNode
  if (href.startsWith('#')) {
    link = (
      <a
        className={s.rowLink}
        href={href}
        onClick={(e) => {
          if (!onSelect) return onSectionClick(e, href)
          e.preventDefault()
          onSelect()
        }}
      >
        <RowBody row={row} />
      </a>
    )
  } else if (href.startsWith('/')) {
    link = (
      <Link className={s.rowLink} to={href}>
        <RowBody row={row} />
      </Link>
    )
  } else {
    link = (
      <a className={s.rowLink} href={href} target="_blank" rel="noreferrer">
        <RowBody row={row} />
        <span className={s.ext} aria-hidden="true">
          ↗
        </span>
        <span className="visually-hidden"> (새 창)</span>
      </a>
    )
  }
  return <li>{link}</li>
}

function Plate({ id, title, rows, plateRef, className }: { id: string; title: ReactNode; rows: DirectoryRow[]; plateRef?: RefObject<HTMLElement | null>; className: string }) {
  return (
    <nav ref={plateRef} className={className} aria-labelledby={id}>
      <p id={id} className={s.plateTitle}>
        <span className="mark" aria-hidden="true" />
        {title}
      </p>
      <ul className={s.rows}>
        {rows.map((row, i) => (
          <Row key={`${row.href ?? ''}-${i}`} row={row} />
        ))}
      </ul>
    </nav>
  )
}

export function PlaceHero({ place, eyebrow, title, lead, meta, directory, state, screen, directoryTitle, plateAt = 'roof' }: PlaceHeroProps) {
  const today = useToday()
  const narrow = useMediaQuery(HERO_STACK_QUERY)
  const look = buildingLook(place, today, state)
  const headerRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const plateRef = useRef<HTMLElement>(null)
  const titleId = useId()
  const rows = directory ?? []
  const hasPlate = rows.length > 0
  const onRoof = hasPlate && plateAt === 'roof'
  // 안내판이 글자 쪽이면 장면도 본문 틀 안에서 끝낸다 (왼쪽처럼 오른쪽도 흐리게: 한쪽만 꽉 차 보이지 않게)
  const contained = hasPlate && !onRoof
  const layout = useHeroLayout(headerRef, stageRef, plateRef, !narrow, !contained)
  const ready = layout.stage.w > 0 && layout.stage.h > 0

  let frame: HeroFrame | null = null
  if (ready) {
    if (narrow) frame = narrowFrame(place, look.state, layout.stage)
    // 안내판이 글자 쪽이면 지붕 위를 비울 까닭이 없다: 건물을 무대 가운데에 크게
    else if (hasPlate && !onRoof) frame = focusFrame(place, look.state, layout.stage, layout.bleed)
    else frame = wideFrame(place, look.state, layout.stage, hasPlate ? layout.plate : null, layout.bleed)
  }

  const color = placeColor(place)
  const pinStyle = frame && !narrow ? ({ left: `${frame.anchor.left.toFixed(1)}px`, top: `${frame.anchor.top.toFixed(1)}px` } as CSSProperties) : undefined

  return (
    <header
      ref={headerRef}
      className={`${s.hero} ${narrow ? s.narrow : s.wide} ${plateAt === 'text' ? s.plateLow : ''}`}
      data-place={place}
      data-state={look.state}
      style={{ '--bleed': `${layout.bleed}px`, '--c': color } as CSSProperties}
    >
      <div className={s.text}>
        {eyebrow && (
          <p className={s.eyebrow}>
            <span className="mark" aria-hidden="true" />
            {eyebrow}
          </p>
        )}
        <h1 className={s.title}>{title}</h1>
        {lead && <p className={s.lead}>{lead}</p>}
        {meta && <p className={s.meta}>{meta}</p>}
        {/* 글자 아래 안내판 (넓은 화면만. 1024 미만은 아래 묶음이 바로 이어진다) */}
        {hasPlate && !onRoof && !narrow && <Plate id={titleId} title={directoryTitle ?? directoryName(place)} rows={rows} className={`${s.plate} ${s.textPlate}`} />}
      </div>

      <div className={s.place}>
        <div ref={stageRef} className={s.stage}>
          {frame && <HeroScene place={place} look={look} screen={screen} viewBox={viewBoxString(frame.vb)} people={false} />}
          <span className={s.fadeTop} aria-hidden="true" />
          {contained && !narrow && <span className={s.fadeRight} aria-hidden="true" />}
        </div>
        {/* 1024 미만에서는 안내판을 그리지 않는다: 폰에서 목차 판이 첫 화면을 300px 넘게 차지했고, 같은 묶음이 바로 아래 이어진다 */}
        {onRoof && !narrow && (
          <div className={s.pin} style={pinStyle} data-ready={frame ? '' : undefined}>
            <span className={s.foot} aria-hidden="true" />
            <span className={s.leader} aria-hidden="true" />
            <Plate id={titleId} title={directoryTitle ?? directoryName(place)} rows={rows} plateRef={plateRef} className={s.plate} />
          </div>
        )}
      </div>
    </header>
  )
}
