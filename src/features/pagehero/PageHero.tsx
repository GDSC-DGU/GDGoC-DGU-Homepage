import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PLACE_BY_ID } from '@/config/places'
import type { PlaceId } from '@/domain/types'
import { Crumbs } from '@/features/dcamp/Crumbs'
import s from './pageHero.module.css'

/** 검정 띠 카드 (dcamp 'Startup' 목록 머리의 행사 띠): 주황 · 파랑 빛 위에 작은 이름표 · 한 줄 · 화살표 */
export interface HeroBanner {
  kicker: string
  title: ReactNode
  to: string
}

/**
 * 목록 페이지 머리 (dcamp.kr 'Story' · 'Startup' 을 따름, 4기 Organizer 2026-11-06: 큰 사진은 부담스럽다).
 * 지금 위치(⌂ › 아카이브) → 왼쪽 정렬 큰 제목(40) → 한 줄 소개 · (행동) → (검정 띠 카드 하나).
 */
export function PageHero({ place, title, lead, meta, banner }: { place: PlaceId; title: ReactNode; lead?: ReactNode; meta?: ReactNode; banner?: HeroBanner }) {
  return (
    <header className={s.hero}>
      <Crumbs trail={[PLACE_BY_ID[place].label]} />
      <h1 className={s.title}>{title}</h1>
      {lead && <p className={s.lead}>{lead}</p>}
      {meta && <div className={s.meta}>{meta}</div>}
      {banner && (
        <Link className={s.banner} to={banner.to}>
          <span className={s.bannerKicker}>{banner.kicker}</span>
          <span className={s.bannerTitle}>{banner.title}</span>
          <span className={s.bannerGo} aria-hidden="true">
            →
          </span>
        </Link>
      )}
    </header>
  )
}
