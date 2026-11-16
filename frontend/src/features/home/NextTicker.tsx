import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EVENTS } from '@/content'
import { HOME_TICKER } from '@/content/home'
import { withoutStalePlans } from '@/content/plan'
import { useSchedule } from '@/data/queries'
import { useReducedMotion } from '@/hooks/useMediaQuery'
import { useToday } from '@/hooks/useToday'
import { dotDate } from './landing'
import { Chevron, PlayPause } from './SlideControls'
import { useAutoplay } from './useReveal'
import s from './nextTicker.module.css'

/** 슈어소프트테크 'What's new': 4초마다 한 줄 */
const AUTO_MS = 4000

/**
 * 첫 화면 아래 한 줄 (슈어소프트테크 'What's new'): 왼쪽 이름 | 다가오는 일정 한 줄이 4초마다 위로 넘어간다 | 멈춤 · 위 · 아래.
 * 일정은 events.json (서버에서 받기 전에는 저장소 스냅샷). 휴회는 빼고 오늘 이후 것만 가까운 순서로 HOME_TICKER.limit 개.
 * 끝 줄 다음에는 첫 줄로 이어진다: 맨 끝에 첫 줄을 하나 더 두고, 거기까지 넘긴 뒤 움직임 없이 첫 줄로 되돌린다.
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
  const [i, setI] = useState(0)
  const [instant, setInstant] = useState(false)
  const [stopped, setStopped] = useState(false)
  const [hover, setHover] = useState(false)

  const go = useCallback(
    (d: 1 | -1) => {
      // 첫 줄에서 위로: 끝 줄로 바로 · 덧붙인 첫 줄에 있는 동안 아래로: 둘째 줄로 바로
      if (d === -1 && i <= 0) {
        setInstant(true)
        setI(n - 1)
        return
      }
      if (d === 1 && i >= n) {
        setInstant(true)
        setI(1)
        return
      }
      setInstant(false)
      setI(i + d)
    },
    [i, n],
  )
  const next = useCallback(() => go(1), [go])
  useAutoplay(next, AUTO_MS, n < 2 || stopped || hover)

  // 덧붙인 첫 줄(n 번째)에 닿으면 움직임 없이 진짜 첫 줄로
  useEffect(() => {
    if (i < n || n === 0) return
    const t = window.setTimeout(
      () => {
        setInstant(true)
        setI(0)
      },
      reduce ? 0 : 520,
    )
    return () => window.clearTimeout(t)
  }, [i, n, reduce])

  if (n === 0) return null
  const rows = n > 1 ? [...list, list[0]] : list
  return (
    <div className={s.row} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <p className={s.label}>{HOME_TICKER.label}</p>
      <div className={s.window}>
        <ul id="next-ticker" className={s.track} data-instant={instant || undefined} style={{ transform: `translate3d(0, ${-i * 100}%, 0)` }}>
          {rows.map((e, k) => {
            const on = k === i || (k === n && i === n)
            return (
              <li key={`${e.id}-${k}`} className={s.item} aria-hidden={k >= n || !on || undefined}>
                <Link className={s.link} to="/about#upcoming" tabIndex={on && k < n ? undefined : -1}>
                  <span className={`num ${s.date}`}>
                    {dotDate(e.date)}
                    {e.endDate && e.endDate !== e.date ? ` ~ ${dotDate(e.endDate)}` : ''}
                  </span>
                  <span className={s.name}>{e.title}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
      {n > 1 && (
        <div className={s.ctrl}>
          <button type="button" className={s.pause} aria-controls="next-ticker" aria-pressed={stopped} aria-label={stopped ? HOME_TICKER.play : HOME_TICKER.pause} onClick={() => setStopped((x) => !x)}>
            <PlayPause paused={stopped} />
          </button>
          <button type="button" className={s.nav} aria-controls="next-ticker" aria-label={HOME_TICKER.prev} onClick={() => go(-1)}>
            <Chevron dir="up" size={20} />
          </button>
          <button type="button" className={s.nav} aria-controls="next-ticker" aria-label={HOME_TICKER.next} onClick={() => go(1)}>
            <Chevron dir="down" size={20} />
          </button>
        </div>
      )}
    </div>
  )
}
