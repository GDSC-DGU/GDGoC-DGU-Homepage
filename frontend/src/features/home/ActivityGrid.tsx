import { Link } from 'react-router-dom'
import { PHOTOS, SEMINARS } from '@/content'
import { HOME_ACTIVITIES, type Activity } from '@/content/home'
import type { EventPhoto } from '@/domain/types'
import { assetUrl } from '@/features/pages/projects/exhibit'
import { A11y } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { HomeHead } from './HomeHead'
import { fill } from './homeData'
import { aos } from './useReveal'
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

/** 카드 오른쪽 위 화살표 (슈어소프트테크 카드 모서리) */
function CornerArrow() {
  return (
    <svg className={s.corner} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  )
}

function Card({ a, as: Tag = 'li' }: { a: Activity; as?: 'li' | 'div' }) {
  const photo = a.tone === 'photo' && a.photo ? PHOTOS.find((p) => p.id === a.photo) : undefined
  // 사진이 빠졌으면(공개 동의 기록이 없으면) 먹색 면으로
  const tone = a.tone === 'photo' && !photo ? 'dark' : a.tone
  return (
    <Tag className={s.item} data-id={a.id} data-tone={tone}>
      <CornerArrow />
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
    </Tag>
  )
}

/**
 * 2 하는 일 (슈어소프트테크 'Solution & Service' 큰 카드 격자). 넓은 화면: 첫 줄 한 장 + 넓은 한 장, 둘째 줄 세 장 (높이 350, 간격 10).
 * 폰(680 이하)은 그 사이트처럼 옆으로 넘기는 Swiper (한 장씩, 간격 10, 0.45초).
 * 사진이 있는 활동은 사진 위에 글자(아래를 먹색으로 어둡게), 없는 활동은 먹색 · 주황 면 + 선 그림.
 * 떠오르기: 이름표 200 → 제목 250 → 카드 묶음 300ms.
 */
export function ActivityGrid() {
  const phone = useMediaQuery('(max-width: 680px)')
  const cards = HOME_ACTIVITIES.cards
  return (
    <section id="activities" className={s.section} aria-labelledby="activities-title">
      <div className="container">
        <HomeHead id="activities-title" eng={HOME_ACTIVITIES.eng} title={HOME_ACTIVITIES.title} />
        <div {...aos(300)}>
          {phone ? (
            <Swiper className={s.swiper} modules={[A11y]} slidesPerView={1} spaceBetween={10} grabCursor speed={450} watchOverflow resistanceRatio={0.85}>
              {cards.map((a) => (
                <SwiperSlide key={a.id}>
                  <Card a={a} as="div" />
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <ul className={s.grid}>
              {cards.map((a) => (
                <Card key={a.id} a={a} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
