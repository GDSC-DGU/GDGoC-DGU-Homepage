import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { KIND_LABEL } from '@/config/kinds'
import { placeColor } from '@/config/places'
import type { ScheduleEvent } from '@/domain/types'
import { useReducedMotion } from '@/hooks/useMediaQuery'
import { monthDay } from '@/lib/date'
import {
  assignLanes,
  inPeriod,
  monthSegments,
  placeStepLabels,
  spanLabel,
  spokenDate,
  textWidth,
  weekTicks,
  xOf,
  type Period,
  type SprintStep,
} from '@/lib/rail'
import { useElementWidth } from './useElementWidth'
import s from './now.module.css'

/** 레일 최소 폭. 이보다 좁은 화면에서는 레일 안에서 옆으로 넘긴다 */
const TRACK_MIN = 860
/** 기준선 높이 (레일 맨 위에서) · 표식 줄 간격 · 누르는 자리 크기 */
const BASE_Y = 52
const LANE_STEP = 12
const HIT = 44
const MARK = 8
/** 표식 가운데끼리 이보다 가까우면 윗줄로 */
const LANE_GAP = 14
/** 넘기는 화면에서 '오늘'을 왼쪽에서 얼마쯤에 둘지 */
const TODAY_AT = 0.3

export interface SprintSpan {
  start: string
  end: string
  steps: SprintStep[]
}

interface Props {
  period: Period
  /** 기간에 걸친 일정 (날짜순) */
  events: readonly ScheduleEvent[]
  today: string
  sprint: SprintSpan | null
  /** 아래 목록에서 가리키고 있는 일정 (레일 표식에 테두리) */
  linkedId?: string | null
}

const colorOf = (e: ScheduleEvent) => (e.kind === 'rest' ? 'var(--ink-500)' : placeColor(e.place))

/**
 * 학기 레일: 9월~2월을 가로 한 줄로 펼치고, 일정 · 휴회 · G-Sprint 기간 · 오늘을 올린다.
 * 키보드: 레일은 Tab 한 번에 들어가고, 좌우 화살표 · Home · End 로 일정 사이를 옮긴다.
 * 같은 내용은 화면 읽기 프로그램용 목록으로도 둔다.
 */
export function SemesterRail({ period, events, today, sprint, linkedId = null }: Props) {
  const uid = useId()
  const reduced = useReducedMotion()
  const railRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const [trackRef, W] = useElementWidth<HTMLDivElement>(TRACK_MIN)

  const px = useCallback((ymd: string) => xOf(ymd, period) * W, [period, W])

  /* ── 표식 자리 ── */
  const marks = useMemo(() => {
    const spans = events.map((e) => {
      const from = px(e.date < period.start ? period.start : e.date)
      const end = e.endDate ?? e.date
      const to = px(end > period.end ? period.end : end)
      return { e, from, to }
    })
    const lanes = assignLanes(spans, LANE_GAP)
    return spans.map((sp, i) => ({ ...sp, lane: Math.min(lanes[i], 2), past: (sp.e.endDate ?? sp.e.date) < today }))
  }, [events, period, px, today])

  /* ── G-Sprint 막대와 단계 이름 ── */
  const bar = useMemo(() => {
    if (!sprint) return null
    const start = sprint.start < period.start ? period.start : sprint.start
    const end = sprint.end > period.end ? period.end : sprint.end
    if (start > end) return null
    const steps = sprint.steps.filter((st) => inPeriod(st.date, period))
    const placed = placeStepLabels(steps.map((st) => ({ x: px(st.date), width: textWidth(st.label, 13) })))
    return {
      from: px(start) - MARK / 2,
      to: px(end) + MARK / 2,
      cuts: steps.filter((st) => st.date > start && st.date < end).map((st) => px(st.date)),
      labels: steps.map((st, i) => ({ ...st, ...placed[i] })),
    }
  }, [sprint, period, px])

  const months = useMemo(() => monthSegments(period), [period])
  const ticks = useMemo(() => weekTicks(period), [period])
  const todayIn = inPeriod(today, period)
  const todayX = px(today)
  const flipToday = todayX > W - 96

  /* ── 떠 있는 이름표: 마우스 · 초점 · 누름 ── */
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [pinId, setPinId] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const hideTimer = useRef<number | undefined>(undefined)
  const shownId = dismissed ? null : (hoverId ?? focusId ?? pinId)
  const shown = shownId ? events.find((e) => e.id === shownId) : undefined

  const hoverIn = (id: string) => {
    window.clearTimeout(hideTimer.current)
    setDismissed(false)
    setHoverId(id)
  }
  // 이름표 위로 마우스를 옮겨도 바로 닫히지 않게 조금 기다린다
  const hoverOut = () => {
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setHoverId(null), 120)
  }
  useEffect(() => () => window.clearTimeout(hideTimer.current), [])

  // 이름표 자리: 레일 상자 기준으로 표식 위에. 양 끝에서는 레일 밖으로 나가지 않게 민다
  const placeTip = useCallback(() => {
    const tip = tipRef.current
    const rail = railRef.current
    const btn = shownId ? buttons.current.get(shownId) : undefined
    if (!tip || !rail || !btn) return
    const r = rail.getBoundingClientRect()
    const b = btn.getBoundingClientRect()
    const cx = b.left + b.width / 2 - r.left
    const w = tip.offsetWidth
    tip.style.left = `${Math.max(0, Math.min(r.width - w, cx - w / 2))}px`
    tip.style.top = `${b.top + b.height / 2 - MARK / 2 - 10 - tip.offsetHeight - r.top}px`
    // 넘기다가 표식이 상자 밖으로 나가면 이름표도 감춘다
    const sc = scrollerRef.current?.getBoundingClientRect()
    const visible = !sc || (b.left + b.width / 2 >= sc.left && b.left + b.width / 2 <= sc.right)
    tip.style.visibility = visible ? '' : 'hidden'
  }, [shownId])
  useLayoutEffect(placeTip, [placeTip, W])

  // 고정한 이름표는 레일 밖을 누르면 닫는다. Esc 는 언제나 닫는다
  useEffect(() => {
    if (!shownId) return
    const onDown = (ev: PointerEvent) => {
      if (!railRef.current?.contains(ev.target as Node)) setPinId(null)
    }
    const onKey = (ev: globalThis.KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setPinId(null)
        setDismissed(true)
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [shownId])

  /* ── 키보드: 레일 하나에 Tab 한 번 ── */
  const [rovingId, setRovingId] = useState<string | null>(null)
  // 처음 들어오면 다가오는 첫 일정에서 시작한다 (모두 지났으면 마지막)
  const nextIndex = events.findIndex((e) => (e.endDate ?? e.date) >= today)
  const chosenIndex = rovingId ? events.findIndex((e) => e.id === rovingId) : -1
  const rovingIndex = chosenIndex !== -1 ? chosenIndex : nextIndex !== -1 ? nextIndex : events.length - 1

  const reveal = (btn: HTMLElement) => {
    const sc = scrollerRef.current
    if (!sc) return
    const sr = sc.getBoundingClientRect()
    const b = btn.getBoundingClientRect()
    const pad = 32
    const delta = b.left < sr.left + pad ? b.left - sr.left - pad : b.right > sr.right - pad ? b.right - sr.right + pad : 0
    if (delta) sc.scrollBy({ left: delta, behavior: reduced ? 'auto' : 'smooth' })
  }

  const onKeyDown = (ev: KeyboardEvent<HTMLDivElement>) => {
    if (!events.length) return
    const last = events.length - 1
    const moves: Record<string, number> = { ArrowRight: rovingIndex + 1, ArrowLeft: rovingIndex - 1, Home: 0, End: last }
    if (!(ev.key in moves)) return
    ev.preventDefault()
    const next = Math.max(0, Math.min(last, moves[ev.key]))
    const id = events[next].id
    setRovingId(id)
    const btn = buttons.current.get(id)
    if (btn) {
      btn.focus({ preventScroll: true })
      reveal(btn)
    }
  }

  /* ── 폰: 레일 안에서 옆으로 넘김. 처음에는 오늘이 보이게, 넘길 거리가 남은 쪽은 흐리게 ── */
  const [edges, setEdges] = useState({ left: false, right: false })
  const updateEdges = useCallback(() => {
    const sc = scrollerRef.current
    if (!sc) return
    const left = sc.scrollLeft > 2
    const right = sc.scrollLeft + sc.clientWidth < sc.scrollWidth - 2
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }))
  }, [])
  const placedToday = useRef(false)
  useLayoutEffect(() => {
    const sc = scrollerRef.current
    const track = trackRef.current
    if (!sc || !track) return
    // scrollIntoView 는 바깥 페이지까지 움직이므로 쓰지 않고 이 상자의 scrollLeft 만 바꾼다
    if (!placedToday.current && todayIn && sc.scrollWidth > sc.clientWidth + 1) {
      placedToday.current = true
      sc.scrollLeft = Math.max(0, track.offsetLeft + todayX - sc.clientWidth * TODAY_AT)
    }
    updateEdges()
  }, [W, todayIn, todayX, trackRef, updateEdges])

  const onScroll = () => {
    updateEdges()
    placeTip()
  }

  const shownMark = shown ? marks.find((m) => m.e.id === shown.id) : undefined
  const ym = (ymd: string) => `${+ymd.slice(0, 4)}년 ${+ymd.slice(5, 7)}월`
  const periodName = `${ym(period.start)}부터 ${ym(period.end)}까지`

  return (
    <div ref={railRef} className={s.rail}>
      <div
        ref={scrollerRef}
        className={s.scroller}
        data-more-left={edges.left || undefined}
        data-more-right={edges.right || undefined}
        data-scrollable={edges.left || edges.right || undefined}
        onScroll={onScroll}
      >
        <div
          ref={trackRef}
          className={s.track}
          role="group"
          aria-label={`학기 레일, ${periodName}`}
          aria-describedby={`${uid}-hint`}
          onKeyDown={onKeyDown}
        >
          <div className={s.deco} aria-hidden="true">
            {months.map((m, i) => (
              <span key={m.ymd} className={s.month} style={{ left: m.from * W, width: (m.to - m.from) * W }}>
                <span className={`${s.monthName} num`}>{i === 0 || m.month === 1 ? `${m.year}년 ${m.month}월` : `${m.month}월`}</span>
              </span>
            ))}
            <span className={s.base} />
            {today > period.start && <span className={s.basePast} style={{ width: todayIn ? Math.round(todayX) : W }} />}
            {ticks.map((d) => (
              <span key={d} className={s.tick} style={{ left: Math.round(px(d)) }} />
            ))}

            {bar && (
              <>
                <span className={s.barThin} style={{ left: bar.from, width: bar.to - bar.from }} />
                {today >= sprint!.start && (
                  <span className={s.barDone} style={{ left: bar.from, width: Math.min(bar.to, todayX) - bar.from }} />
                )}
                <span className={s.barTick} data-end style={{ left: bar.from }} />
                <span className={s.barTick} data-end style={{ left: bar.to - 1 }} />
                {bar.cuts.map((x) => (
                  <span key={x} className={s.barTick} style={{ left: Math.round(x) }} />
                ))}
                {bar.labels.map((l) =>
                  l.hidden ? null : (
                    <span key={l.label} className={s.step} style={{ left: l.left }}>
                      {l.label}
                    </span>
                  ),
                )}
              </>
            )}

            {todayIn && (
              <span className={s.today} style={{ left: Math.round(todayX) }} data-flip={flipToday || undefined}>
                <span className={s.todayLabel}>
                  오늘 <span className="num">{monthDay(today)}</span>
                </span>
              </span>
            )}
          </div>

          {marks.map(({ e, from, to, lane, past }, i) => {
            const cx = (from + to) / 2
            const len = to - from + MARK
            const hitW = Math.max(HIT, len + 8)
            const style = {
              left: cx - hitW / 2,
              top: BASE_Y - lane * LANE_STEP - HIT / 2,
              width: hitW,
              '--c': colorOf(e),
            } as CSSProperties
            return (
              <button
                key={e.id}
                ref={(el) => {
                  if (el) buttons.current.set(e.id, el)
                  else buttons.current.delete(e.id)
                }}
                type="button"
                className={s.mk}
                style={style}
                tabIndex={i === rovingIndex ? 0 : -1}
                aria-label={`${spokenDate(e.date, today)}${e.endDate && e.endDate !== e.date ? `부터 ${spokenDate(e.endDate, today)}까지` : ''}, ${e.title}, ${KIND_LABEL[e.kind]}${past ? ', 지난 일정' : ''}`}
                data-rest={e.kind === 'rest' || undefined}
                data-past={past || undefined}
                data-on={shownId === e.id || linkedId === e.id || undefined}
                onPointerEnter={(ev) => ev.pointerType === 'mouse' && hoverIn(e.id)}
                onPointerLeave={(ev) => ev.pointerType === 'mouse' && hoverOut()}
                onFocus={() => {
                  setDismissed(false)
                  setFocusId(e.id)
                  setRovingId(e.id)
                }}
                onBlur={() => setFocusId(null)}
                onClick={() => {
                  // 누르면 고정, 한 번 더 누르면 닫는다 (터치 화면에서 이름표를 여닫는 방법)
                  if (pinId === e.id) {
                    setPinId(null)
                    setDismissed(true)
                  } else {
                    setDismissed(false)
                    setPinId(e.id)
                  }
                }}
              >
                <span className={s.sq} style={{ width: len }} />
              </button>
            )
          })}
        </div>
      </div>

      {shown && shownMark && (
        <div
          ref={tipRef}
          className={s.tip}
          aria-hidden="true"
          onPointerEnter={() => window.clearTimeout(hideTimer.current)}
          onPointerLeave={hoverOut}
        >
          <span className={`${s.tipDate} num`}>{spanLabel(shown, today)}</span>
          <b className={s.tipTitle}>{shown.title}</b>
          <span className={s.tipMeta}>
            <i className={s.tipSq} style={{ '--c': colorOf(shown) } as CSSProperties} data-rest={shown.kind === 'rest' || undefined} />
            {KIND_LABEL[shown.kind]}
            {shown.venue && <>, {shown.venue}</>}
          </span>
        </div>
      )}

      <p id={`${uid}-hint`} className="visually-hidden">
        좌우 화살표로 일정 사이를 옮겨 다닙니다. 같은 내용이 아래 목록에도 있습니다.
      </p>
      <ol className="visually-hidden" aria-label={`${periodName} 일정`}>
        {sprint && (
          <li>
            G-Sprint 기간, {spokenDate(sprint.start, today)}부터 {spokenDate(sprint.end, today)}까지
          </li>
        )}
        {events.map((e) => (
          <li key={e.id}>
            {spokenDate(e.date, today)}
            {e.endDate && e.endDate !== e.date && `부터 ${spokenDate(e.endDate, today)}까지`}, {e.title}, {KIND_LABEL[e.kind]}
            {e.venue && `, ${e.venue}`}
            {(e.endDate ?? e.date) < today && ', 지난 일정'}
            {e.date === today && ', 오늘'}
          </li>
        ))}
      </ol>
    </div>
  )
}
