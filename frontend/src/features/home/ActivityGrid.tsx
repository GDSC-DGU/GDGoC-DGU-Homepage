import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { PHOTOS, SEMINARS } from '@/content'
import { HOME_ACTIVITIES, type Activity } from '@/content/home'
import type { EventPhoto } from '@/domain/types'
import { StorySection } from '@/features/common'
import { assetUrl } from '@/features/pages/projects/exhibit'
import { useStaggerReveal } from '@/hooks/useStaggerReveal'
import { fill } from './homeData'
import s from './activityGrid.module.css'

const srcOf = (p: EventPhoto) => (p.src.startsWith('https://') ? p.src : assetUrl(p.src))

/** 사진이 없는 카드의 선 그림 (소개 How We Work 와 같은 붓: 선 + 점 하나) */
function Icon({ kind }: { kind: NonNullable<Activity['icon']> }) {
  return (
    <svg className={s.icon} viewBox="0 0 48 48" aria-hidden="true">
      {kind === 'trophy' && (
        <>
          <path d="M15 8h18v10a9 9 0 0 1-18 0zM15 12H8a6 6 0 0 0 7 7M33 12h7a6 6 0 0 1-7 7M24 27v8M16 41h16l-2-6H18z" />
          <circle className={s.iconDot} cx="24" cy="15" r="3" />
        </>
      )}
      {kind === 'people' && (
        <>
          <circle cx="17" cy="17" r="6" />
          <circle cx="33" cy="17" r="6" />
          <path d="M6 38c1.5-7 6-10 11-10s9.5 3 11 10M22 38c1.5-7 6-10 11-10s9.5 3 11 10" />
          <circle className={s.iconDot} cx="25" cy="9" r="3" />
        </>
      )}
    </svg>
  )
}

function Card({ a }: { a: Activity }) {
  const photo = a.tone === 'photo' && a.photo ? PHOTOS.find((p) => p.id === a.photo) : undefined
  // 사진이 빠졌으면(공개 동의 기록이 없으면) 먹색 면으로
  const tone = a.tone === 'photo' && !photo ? 'dark' : a.tone
  return (
    <li className={s.item} data-id={a.id} data-tone={tone}>
      {photo && <img className={s.img} src={srcOf(photo)} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" />}
      <div className={`${tone === 'gen' ? '' : 'on-dark'} ${s.body}`}>
        {a.icon && tone !== 'photo' && <Icon kind={a.icon} />}
        <h3 className={s.name}>
          {/* 링크 하나가 카드 전체를 덮는다 (::after) */}
          <Link className={s.link} to={a.to}>
            {a.title}
          </Link>
        </h3>
        <p className={s.text}>{fill(a.body, { n: SEMINARS.length })}</p>
        {a.tags && (
          <ul className={s.tags} aria-label={`${a.title} 키워드`}>
            {a.tags.map((t) => (
              <li key={t} className={s.tag}>
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}

/**
 * 2 하는 일 (슈어소프트테크 'Solution & Service' 큰 카드 격자). 넓은 화면: 첫 줄 한 장 + 넓은 한 장, 둘째 줄 세 장. 폰: 한 줄에 한 장.
 * 사진이 있는 활동은 사진 위에 글자(아래를 먹색으로 어둡게), 없는 활동은 먹색 · 주황 면 + 선 그림.
 * 홈의 순차 등장은 여기 한 곳 (움직임 9가지).
 */
export function ActivityGrid() {
  const listRef = useRef<HTMLUListElement>(null)
  useStaggerReveal(listRef)
  return (
    <StorySection id="activities" title={HOME_ACTIVITIES.title} sub={HOME_ACTIVITIES.sub}>
      <ul ref={listRef} className={s.grid}>
        {HOME_ACTIVITIES.cards.map((a) => (
          <Card key={a.id} a={a} />
        ))}
      </ul>
    </StorySection>
  )
}
