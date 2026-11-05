import { useId, useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { KIND_LABEL } from '@/config/kinds'
import { placeColor } from '@/config/places'
import type { Generation, ScheduleEvent } from '@/domain/types'
import { useElementWidth } from '@/features/now/useElementWidth'
import { spokenDate } from '@/lib/rail'
import { keepHyphenated } from '@/lib/text'
import { dateLabel } from '../format'
import { mainWeekday } from './archiveModel'
import { academicYear, cellOf, monthColumns, nearestCell, WEEKS, type YearCell, type YearRow } from './heatmap'
import c from './community.module.css'

const DOW = '월화수목금토일'
/** 이 폭 이상: 기수 이름을 왼쪽 칸에. 그보다 좁으면 기수 이름을 줄 위에 */
const WIDE = 1000
/** 이 폭보다 좁으면(폰) 요일 7줄 대신 주 하나를 칸 하나로 줄인 띠 */
const NARROW = 600
/** 넓은 화면: 왼쪽 기수 이름 칸 (사이 포함) */
const SIDE = 136
/** 요일 글자 칸 */
const DOW_W = 24

type Mode = 'wide' | 'mid' | 'narrow'
type Pick = { gen: number; key: string }

const endOf = (e: ScheduleEvent) => e.endDate ?? e.date

interface Props {
  /** heatmap.ts yearRows: 오래된 기수부터 */
  rows: readonly YearRow<Generation>[]
  /** 모든 일정 (가장 최근 행사를 찾는다) */
  events: readonly ScheduleEvent[]
  today: string
}

/**
 * '세 기수의 1년': 기수마다 9월에 시작하는 1년을 한 줄로 놓은 행사 달력. 칸 하나 = 하루, 칠한 칸 = 공개 행사를 연 날.
 * 칠한 칸은 지난 행사, 속이 빈 칸은 예정, 회색 테두리는 휴회. 색은 '어디'(커뮤니티 · 프로젝트 · 지원 안내).
 *
 * 넓은 화면은 12칸 전체 폭에 칸을 꽉 채우고(데스크톱 칸 약 16px), 폰(600px 미만)은 주 하나를 칸 하나로 줄인 띠로 그린다 (가로 넘침 없음).
 * 누르기 · 키보드: 기수 한 줄이 Tab 한 번(목록 상자). 좌우 화살표 · Home · End 로 행사 사이를 옮기고,
 * 손가락 · 마우스로 누르면 가장 가까운 행사 칸을 고른다. 고른 행사는 아래 한 줄(aria-live)에 날짜 · 이름 · 종류 · 장소로 나온다.
 * 칸마다 '10월 13일 화요일, G-Sprint 킥오프 · 팀 회의' 같은 이름이 있어 읽기 프로그램도 같은 내용을 듣는다.
 */
export function YearHeatmap({ rows, events, today }: Props) {
  const uid = useId()
  const [boxRef, width] = useElementWidth<HTMLDivElement>(1200)
  const mode: Mode = width >= WIDE ? 'wide' : width >= NARROW ? 'mid' : 'narrow'
  const narrow = mode === 'narrow'
  const labelW = narrow ? 0 : DOW_W
  const gap = mode === 'wide' ? 3 : narrow ? 1 : 2
  const gridW = width - (mode === 'wide' ? SIDE : 0)
  // 칸 크기는 폭에 맞춰 꽉 채운다 (넓은 화면 약 16px, 태블릿 10–15px)
  const cell = narrow ? 0 : Math.max(6, Math.min(22, (gridW - labelW - WEEKS * gap) / WEEKS))
  const step = cell + gap

  const current = rows.find((r) => r.gen.current) ?? rows.at(-1)
  const months = monthColumns(current ? academicYear(current.gen.start ?? '2000-09') : +today.slice(0, 4))

  const [picked, setPicked] = useState<Pick | null>(null)
  const [hover, setHover] = useState<Pick | null>(null)

  const cellsOf = (r: YearRow<Generation>) => (narrow ? r.weeks : r.days)
  // 띠 ↔ 7줄로 바뀌어도 고른 날을 이어 간다: 날짜(key)로 찾고, 띠에서는 그 날이 든 주
  const findCell = (sel: Pick | null): { row: YearRow<Generation>; cell: YearCell } | null => {
    if (!sel) return null
    const r = rows.find((x) => x.gen.n === sel.gen)
    if (!r) return null
    const list = cellsOf(r)
    const hit = list.find((x) => x.key === sel.key) ?? (narrow && /^\d/.test(sel.key) ? list.find((x) => x.week === cellOf(sel.key, r.origin).week) : undefined)
    return hit ? { row: r, cell: hit } : null
  }

  // 아무것도 고르지 않았을 때: 가장 최근에 연 공개 행사 한 줄
  const latest = useMemo(
    () =>
      events
        .filter((e) => e.kind !== 'rest' && endOf(e) < today)
        .sort((a, b) => b.date.localeCompare(a.date))[0],
    [events, today],
  )
  const shown = findCell(hover) ?? findCell(picked)
  const shownEvents = shown ? shown.cell.events.filter((e) => e.kind !== 'rest' || shown.cell.events.every((x) => x.kind === 'rest')) : latest ? [latest] : []
  const captionLabel = shown ? (narrow ? '고른 주' : '고른 날') : '가장 최근'

  const pick = (r: YearRow<Generation>, hit: YearCell | null) => {
    if (hit) setPicked({ gen: r.gen.n, key: hit.key })
  }

  const pointAt = (ev: { clientX: number; clientY: number; currentTarget: HTMLDivElement }) => {
    const rect = ev.currentTarget.getBoundingClientRect()
    if (narrow) return { week: Math.floor(((ev.clientX - rect.left) / rect.width) * WEEKS), row: 0 }
    return { week: Math.floor((ev.clientX - rect.left - labelW - gap) / step), row: Math.floor((ev.clientY - rect.top) / step) }
  }

  const onKey = (r: YearRow<Generation>, ev: KeyboardEvent<HTMLDivElement>) => {
    const list = cellsOf(r)
    if (list.length === 0) return
    const cur = findCell(picked)
    const at = cur && cur.row === r ? list.indexOf(cur.cell) : -1
    const moves: Record<string, number> = {
      ArrowRight: at + 1,
      ArrowDown: at + 1,
      ArrowLeft: at === -1 ? list.length - 1 : at - 1,
      ArrowUp: at === -1 ? list.length - 1 : at - 1,
      Home: 0,
      End: list.length - 1,
    }
    if (!(ev.key in moves)) return
    ev.preventDefault()
    setHover(null)
    pick(r, list[Math.max(0, Math.min(list.length - 1, moves[ev.key]))])
  }

  return (
    <div ref={boxRef} className={c.heatBody} data-mode={mode} style={{ '--heat-side': `${SIDE}px` } as CSSProperties}>
      <div className={c.heatMonths} aria-hidden="true" style={{ marginLeft: mode === 'wide' ? SIDE : 0 }}>
        {months.map((m, i) =>
          narrow && i % 2 === 1 ? null : (
            <span key={m.month} className="num" style={{ left: narrow ? `${(m.week / WEEKS) * 100}%` : labelW + gap + m.week * step }}>
              {m.month}월
            </span>
          ),
        )}
      </div>

      {rows.map((r) => {
        const list = cellsOf(r)
        const cur = findCell(picked)
        const activeKey = cur && cur.row === r ? cur.cell.key : null
        const weekday = mainWeekday(events.filter((e) => e.generation === r.gen.n && e.kind === 'session'))
        const wdRow = weekday ? DOW.indexOf(weekday) : -1
        const summary = `${r.gen.n}기${weekday ? `, ${weekday}요일 세션` : ''}, 지난 행사 ${r.past}건${r.plan > 0 ? `, 예정 ${r.plan}건` : ''}`
        const occupied = new Map(list.map((x) => [`${x.week}-${x.row}`, x]))
        const todayCell = today >= r.origin ? cellOf(today, r.origin) : null
        const todayIn = todayCell && todayCell.week < WEEKS ? todayCell : null
        return (
          <div key={r.gen.n} className={c.heatGen}>
            <p className={c.heatGenHead}>
              {r.gen.current ? <span className="gen-tag">{r.gen.n}기</span> : <span className={`${c.heatGenN} num`}>{r.gen.n}기</span>}
              {r.gen.current && <span className="visually-hidden"> (지금 기수)</span>}
              <span className={c.heatGenMeta}>
                {weekday && <b className={c.heatGenPart}>{weekday}요일 세션</b>}
                <span className={c.heatGenPart}>
                  지난 행사 <span className="num">{r.past}</span>건
                </span>
                {r.plan > 0 && (
                  <span className={c.heatGenPart}>
                    예정 <span className="num">{r.plan}</span>건
                  </span>
                )}
              </span>
            </p>
            <div
              className={c.heatGrid}
              style={
                narrow
                  ? { gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))`, gridTemplateRows: '28px', gap }
                  : { gridTemplateColumns: `${labelW}px repeat(${WEEKS}, ${cell}px)`, gridTemplateRows: `repeat(7, ${cell}px)`, gap }
              }
              role="listbox"
              tabIndex={0}
              aria-label={`${summary}. 좌우 화살표로 행사를 고릅니다`}
              aria-activedescendant={activeKey ? `${uid}-${r.gen.n}-${activeKey}` : undefined}
              onKeyDown={(ev) => onKey(r, ev)}
              onFocus={() => {
                if (!activeKey && list.length > 0) {
                  const lastPast = [...list].reverse().find((x) => x.main.date < today)
                  pick(r, lastPast ?? list[0])
                }
              }}
              onPointerMove={(ev) => {
                if (ev.pointerType !== 'mouse') return
                const { week, row } = pointAt(ev)
                const hit = occupied.get(`${week}-${row}`)
                setHover(hit ? { gen: r.gen.n, key: hit.key } : null)
              }}
              onPointerLeave={() => setHover(null)}
              onClick={(ev) => {
                const { week, row } = pointAt(ev)
                setHover(null)
                pick(r, nearestCell(list, week, row))
              }}
            >
              {!narrow &&
                [...DOW].map((d, i) => {
                  // 요일 글자: 넓은 화면은 월 · 일 · 세션 요일, 좁으면 세션 요일만 (13px 글자가 줄 사이에 겹치지 않게)
                  const show = i === wdRow || (mode === 'wide' && (i === 0 || i === 6))
                  return (
                    <span key={d} className={`${c.heatDow} ${i === wdRow ? c.heatDowOn : ''}`} style={{ gridColumn: 1, gridRow: i + 1 }} aria-hidden="true">
                      {show ? d : ''}
                    </span>
                  )
                })}
              {Array.from({ length: narrow ? WEEKS : WEEKS * 7 }, (_, i) => {
                const week = narrow ? i : Math.floor(i / 7)
                const row = narrow ? 0 : i % 7
                const hit = occupied.get(`${week}-${row}`)
                const isToday = todayIn !== null && todayIn.week === week && (narrow || todayIn.row === row)
                const pos = narrow ? { gridColumn: week + 1, gridRow: 1 } : { gridColumn: week + 2, gridRow: row + 1 }
                if (!hit) {
                  return <span key={i} className={c.heatDay} data-today={isToday || undefined} style={pos} aria-hidden="true" />
                }
                const e = hit.main
                const allRest = hit.events.every((x) => x.kind === 'rest')
                const future = endOf(e) >= today
                const titles = hit.events.map((x) => x.title).join(', ')
                return (
                  <span
                    key={i}
                    id={`${uid}-${r.gen.n}-${hit.key}`}
                    role="option"
                    aria-selected={activeKey === hit.key}
                    aria-label={`${narrow ? `${spokenDate(hit.events[0].date, today)} 주` : spokenDate(e.date, today)}, ${titles}${future ? ', 예정' : ''}`}
                    className={c.heatDay}
                    data-state={allRest ? 'rest' : future ? 'plan' : 'on'}
                    data-today={isToday || undefined}
                    data-picked={activeKey === hit.key || (hover?.gen === r.gen.n && hover.key === hit.key) || undefined}
                    style={{ ...pos, '--c': placeColor(e.place) } as CSSProperties}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

      <div className={c.heatFoot}>
        <p className={c.heatCaption} aria-live="polite">
          {shownEvents.length > 0 && (
            <>
              <span className={c.heatCapLabel}>{captionLabel}</span>
              {shownEvents.map((e, i) => (
                <span key={e.id} className={c.heatCapItem}>
                  {i > 0 && <span className={c.heatCapSep}> · </span>}
                  <span className="num">{dateLabel(e.date, e.endDate, today)}</span>{' '}
                  {e.url ? (
                    <a className={c.titleLink} href={e.url} target="_blank" rel="noreferrer">
                      <b>{e.title}</b>
                      <span className="visually-hidden"> (새 창)</span>
                      <span className={c.titleArrow} aria-hidden="true">
                        ↗
                      </span>
                    </a>
                  ) : (
                    <b>{e.title}</b>
                  )}
                  <span className={c.heatCapSub}>
                    {' '}
                    · {keepHyphenated(KIND_LABEL[e.kind])}
                    {e.venue && ` · ${e.venue}`}
                  </span>
                </span>
              ))}
            </>
          )}
        </p>
        <ul className={c.legend} aria-label="달력 읽는 법">
          <li>
            <span className={c.lgOn} style={{ '--c': placeColor('community') } as CSSProperties} /> 세션 · 행사
          </li>
          <li>
            <span className={c.lgOn} style={{ '--c': placeColor('projects') } as CSSProperties} /> G-Sprint · 데모데이
          </li>
          <li>
            <span className={c.lgOn} style={{ '--c': placeColor('recruits') } as CSSProperties} /> 모집 · OT
          </li>
          <li>
            <span className={c.lgPlan} /> 예정
          </li>
          <li>
            <span className={c.lgToday} /> 오늘
          </li>
        </ul>
      </div>
    </div>
  )
}
