import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PLACE_BY_ID } from '@/config/places'
import { PHOTOS } from '@/content'
import type { EventPhoto, PlaceId } from '@/domain/types'
import { assetUrl } from '@/features/pages/projects/exhibit'
import s from './pageHero.module.css'

const dot = (ymd: string) => ymd.replaceAll('-', '.')
const srcOf = (p: EventPhoto) => (p.src.startsWith('https://') ? p.src : assetUrl(p.src))

/** 제목 위 주황 영문 이름표 (dcamp 의 'dcamp batch' 자리) */
const EYEBROW: Record<PlaceId, string> = {
  community: 'About us',
  projects: 'Archive',
  teams: 'Team up',
  recruits: 'Recruit',
  about: 'GDGoC DGU',
}

/**
 * 하위 페이지 첫 화면 (4기 Organizer 2026-11-06: dcamp.kr 을 따른다. 사진이 본문 폭 가득이면 부담스럽다).
 * 위: 지금 위치(홈 › 소개). 그 아래 두 칸 — 왼쪽 주황 영문 이름표 · 제목(h1) · 한 줄 소개 · (행동 단추), 오른쪽 행사 사진 한 장(3:2, 모서리 8).
 * 사진 아래에 행사 이름 · 날짜를 작게. 폰은 한 칸으로 쌓고 사진은 맨 아래.
 * 사진은 content/photos.json 에서 id 로 고른다. 없으면 글자만 (자리를 비워 두지 않는다).
 */
export function PageHero({
  place,
  title,
  lead,
  meta,
  photoId,
  eager = true,
}: {
  place: PlaceId
  title: ReactNode
  lead?: ReactNode
  meta?: ReactNode
  photoId?: string
  eager?: boolean
}) {
  const photo = photoId ? PHOTOS.find((p) => p.id === photoId) : undefined
  const here = PLACE_BY_ID[place]
  return (
    <header className={s.hero} data-photo={photo ? '' : undefined}>
      <nav className={s.crumbs} aria-label="지금 위치">
        <ol>
          <li>
            <Link to="/" className={s.home}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4z" />
              </svg>
              <span className="visually-hidden">홈</span>
            </Link>
          </li>
          <li aria-current="page">{here.label}</li>
        </ol>
      </nav>
      <div className={s.body}>
        <div className={s.text}>
          <p className={s.eyebrow} lang="en">
            {EYEBROW[place]}
          </p>
          <h1 className={s.title}>{title}</h1>
          {lead && <p className={s.lead}>{lead}</p>}
          {meta && <div className={s.meta}>{meta}</div>}
        </div>
        {photo && (
          <figure className={s.figure}>
            <div className={s.frame}>
              <img
                className={s.img}
                src={srcOf(photo)}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                loading={eager ? 'eager' : 'lazy'}
                fetchPriority={eager ? 'high' : undefined}
                decoding="async"
              />
            </div>
            <figcaption className={s.caption}>
              {photo.event} · <time className="num" dateTime={photo.date}>{dot(photo.date)}</time>
            </figcaption>
          </figure>
        )}
      </div>
    </header>
  )
}
