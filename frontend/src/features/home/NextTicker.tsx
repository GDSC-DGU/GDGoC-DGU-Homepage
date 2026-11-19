import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { A11y, Autoplay } from 'swiper/modules'
import { Swiper, SwiperSlide, type SwiperRef } from 'swiper/react'
import 'swiper/css'
import { EVENTS } from '@/content'
import { HOME_TICKER } from '@/content/home'
import { withoutStalePlans } from '@/content/plan'
import { useSchedule } from '@/data/queries'
import { useReducedMotion } from '@/hooks/useMediaQuery'
import { useToday } from '@/hooks/useToday'
import { dotDate } from './landing'
import { Chevron, PlayPause } from './SlideControls'
import s from './nextTicker.module.css'

/**
 * 첫 화면 아래 한 줄 (슈어소프트테크 'What's new'): 왼쪽 이름 | 다가오는 일정 한 줄 | 멈춤 · 위 · 아래.
 * Swiper 를 그 사이트와 같은 설정으로: 세로, 한 장씩, 0.5초, 끝없이(loop), 4초마다 저절로(만져도 계속).
 * 일정은 events.json (서버에서 받기 전에는 저장소 스냅샷). 휴회는 빼고 오늘 이후 것만 가까운 순서로 HOME_TICKER.limit 개.
 */
export function NextTicker() {
  const today = useToday()
  const { data } = useSchedule()
  const reduce = useReducedMotion()
  const list = useMemo(
    () =>
      withoutStalePlans(data ?? EVENTS, today)
        .filter((e) => e.kind !== 'rest' && (e.endDate ?? e.date) >= today)
        .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'ko'))
        .slice(0, HOME_TICKER.limit),
    [data, today],
  )
  const n = list.length
  const ref = useRef<SwiperRef>(null)
  const [stopped, setStopped] = useState(false)

  if (n === 0) return null
  const toggle = () => {
    const sw = ref.current?.swiper
    if (!sw?.autoplay) return
    if (stopped) sw.autoplay.start()
    else sw.autoplay.stop()
    setStopped(!stopped)
  }
  return (
    <div className={s.row}>
      <p className={s.label}>{HOME_TICKER.label}</p>
      <Swiper
        ref={ref}
        className={s.window}
        modules={[Autoplay, A11y]}
        direction="vertical"
        slidesPerView={1}
        speed={reduce ? 0 : 500}
        loop={n > 1}
        allowTouchMove={n > 1}
        autoHeight={false}
        autoplay={n > 1 && !reduce ? { delay: 4000, disableOnInteraction: false } : false}
        a11y={{ prevSlideMessage: HOME_TICKER.prev, nextSlideMessage: HOME_TICKER.next, containerRoleDescriptionMessage: HOME_TICKER.label }}
      >
        {list.map((e) => (
          <SwiperSlide key={e.id} className={s.item}>
            <Link className={s.link} to="/about#upcoming">
              <span className={`num ${s.date}`}>
                {dotDate(e.date)}
                {e.endDate && e.endDate !== e.date ? ` ~ ${dotDate(e.endDate)}` : ''}
              </span>
              <span className={s.name}>{e.title}</span>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
      {n > 1 && (
        <div className={s.ctrl}>
          {!reduce && (
            <button type="button" className={s.pause} aria-pressed={stopped} aria-label={stopped ? HOME_TICKER.play : HOME_TICKER.pause} onClick={toggle}>
              <PlayPause paused={stopped} />
            </button>
          )}
          <button type="button" className={s.nav} aria-label={HOME_TICKER.prev} onClick={() => ref.current?.swiper.slidePrev()}>
            <Chevron dir="up" size={20} />
          </button>
          <button type="button" className={s.nav} aria-label={HOME_TICKER.next} onClick={() => ref.current?.swiper.slideNext()}>
            <Chevron dir="down" size={20} />
          </button>
        </div>
      )}
    </div>
  )
}
