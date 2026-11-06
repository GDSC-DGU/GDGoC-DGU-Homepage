import type { ReactNode } from 'react'
import { PHOTOS } from '@/content'
import type { EventPhoto } from '@/domain/types'
import { assetUrl } from '@/features/pages/projects/exhibit'
import s from './pageHero.module.css'

const dot = (ymd: string) => ymd.replaceAll('-', '.')
const srcOf = (p: EventPhoto) => (p.src.startsWith('https://') ? p.src : assetUrl(p.src))

/**
 * 하위 페이지 첫 화면 (4기 Organizer 2026-11-06: 건물 그림 옆 글자가 비어 보였다 → 당근 팀 페이지처럼 '제목 + 큰 사진').
 * 가운데 제목(h1) → 한 줄 소개 → (행동 단추) → 본문 폭 가득 행사 사진 한 장 (radius 20, 왼쪽 아래에 행사 이름 · 날짜).
 * 사진은 content/photos.json 에서 id 로 고른다. 없으면 사진 없이 제목만 (자리를 비워 두지 않는다).
 */
export function PageHero({ title, lead, meta, photoId, eager = true }: { title: ReactNode; lead?: ReactNode; meta?: ReactNode; photoId?: string; eager?: boolean }) {
  const photo = photoId ? PHOTOS.find((p) => p.id === photoId) : undefined
  return (
    <header className={s.hero} data-photo={photo ? '' : undefined}>
      <div className={s.text}>
        <h1 className={s.title}>{title}</h1>
        {lead && <p className={s.lead}>{lead}</p>}
        {meta && <div className={s.meta}>{meta}</div>}
      </div>
      {photo && (
        <figure className={s.figure}>
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
          <figcaption className={s.caption}>
            {photo.event} · <time className="num" dateTime={photo.date}>{dot(photo.date)}</time>
          </figcaption>
        </figure>
      )}
    </header>
  )
}
