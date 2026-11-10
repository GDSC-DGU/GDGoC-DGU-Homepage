import { useMemo, type CSSProperties } from 'react'
import { placeColor } from '@/config/places'
import { GENERATIONS } from '@/content'
import type { TermId } from '@/content/glossary'
import { withoutStalePlans } from '@/content/plan'
import type { ScheduleEvent } from '@/domain/types'
import { weekday } from '@/lib/date'
import { firstMentions } from '../community/terms'
import { TermText } from '../community/TermText'
import { MONTH_CAPTION, firstHalfYear, monthsOf, springOf } from './batches'
import k from './recruit.module.css'

/** 이 목록에서 처음 나올 때 풀어 쓸 용어. G-Sprint 는 섹션 머리 한 줄에서 이미 푼다 */
const TERMS: readonly TermId[] = ['g-sprint', 'demo-day', 'dong-hong', 'camping-seminar', 'study-jam']
const EXPLAINED_ABOVE: ReadonlySet<TermId> = new Set(['g-sprint'])

const lineKey = (e: ScheduleEvent) => `month:${e.id}`
const springKey = (when: string, name: string) => `spring:${when}:${name}`

/**
 * '들어오면 이런 한 해': 일정 표현은 달별 목록 하나만 둔다 (학기 레일은 커뮤니티 '다가오는 일정' 에 있다).
 * 9월~1월은 지금 기수(4기)의 실제 일정, 마지막 칸 '3~7월 봄 학기' 는 지금 기수 일정이 공개되기 전까지 지난 기수가 연 행사로.
 * 넓은 화면은 세 칸 두 줄(9 · 10 · 11월 / 12 · 1월 · 봄), 폰은 달마다 한 줄.
 * 달 이름은 크게, 표식(장소색 네모 + 굵게)은 G-Sprint 단계에만 둔다: 세션 · 행사 · 휴회는 맨 글자 (한 해의 뼈대가 G-Sprint 로 보이게).
 * 날짜가 지났는데 계획으로만 남은 일정은 뺀다 (content/plan.ts).
 */
export function SemesterPicture({ events, today, generation }: { events: readonly ScheduleEvent[]; today: string; generation: number }) {
  const shown = useMemo(() => withoutStalePlans(events, today), [events, today])
  const period = useMemo(() => firstHalfYear(shown, generation), [shown, generation])
  const months = useMemo(() => (period ? monthsOf(shown.filter((e) => e.generation === generation), period) : []), [shown, generation, period])
  const spring = useMemo(() => springOf(shown, GENERATIONS, generation), [shown, generation])
  const terms = useMemo(
    () =>
      firstMentions(
        [
          ...months.flatMap((m) => m.events.map((e) => ({ key: lineKey(e), text: e.title }))),
          ...(spring?.items.flatMap((it) => it.names.map((n) => ({ key: springKey(it.when, n), text: n }))) ?? []),
        ],
        EXPLAINED_ABOVE,
        TERMS,
      ),
    [months, spring],
  )
  // 계획 일정의 출처 이름 ('4기 운영 계획')
  if (!period) return null
  return (
    <>
      <ol className={k.months} aria-label={`${generation}기 달별 일정`}>
        {months.map((m) => (
          <li key={m.ym} className={k.month}>
            <h3 className={k.monthName}>
              <span className="num">{m.month}월</span>
              {MONTH_CAPTION[m.month] && <span className={k.monthCaption}>{MONTH_CAPTION[m.month]}</span>}
            </h3>
            <ul>
              {m.events.map((e) => {
                const rest = e.kind === 'rest'
                const past = (e.endDate ?? e.date) < today
                // G-Sprint 단계만 장소색 네모 + 굵게 (한 해의 뼈대). 나머지는 맨 글자
                const sprint = e.kind === 'sprint'
                return (
                  <li key={e.id} className={k.mEvent} data-rest={rest || undefined} data-past={past || undefined} data-sprint={sprint || undefined}>
                    <span className={`${k.mDate} num`}>
                      {/* '2일 월': 날짜 뒤에 '일' 을 붙여 요일 '월' 이 달(2월)로 읽히지 않게.
                          여러 날이면 요일 없이 '3~30일' (요일 하나를 붙이면 기간 전체가 그 요일로 읽혔다: 문구 검토 2026-11-05) */}
                      {e.endDate && e.endDate !== e.date ? `${+e.date.slice(8, 10)}~${+e.endDate.slice(8, 10)}일` : `${+e.date.slice(8, 10)}일 ${weekday(e.date)}`}
                    </span>
                    <span className={k.mTitle}>
                      {sprint && <span className={k.mMark} style={{ '--c': placeColor(e.place) } as CSSProperties} aria-hidden="true" />}
                      <TermText text={e.title} terms={terms.get(lineKey(e))} />
                      {past && <span className="visually-hidden"> (지난 일정)</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
        {spring && (
          <li className={k.month} data-spring>
            <h3 className={k.monthName}>
              <span className="num">3~7월</span>
              <span className={k.monthCaption}>봄 학기</span>
            </h3>
            <div>
              <p className={k.springLead}>
                {generation}기 봄 일정은 아직 정하지 않았습니다. 지난 {spring.generation}기 봄 학기 일정입니다.
              </p>
              <ul aria-label={`지난 ${spring.generation}기 봄 학기`}>
                {spring.items.map((it) => (
                  <li key={it.when} className={k.mEvent} data-past>
                    <span className={`${k.mDate} num`}>{it.when}</span>
                    <span className={k.mTitle}>
                      {it.names.map((n, i) => (
                        <span key={n}>
                          {i > 0 && ', '}
                          <TermText text={n} terms={terms.get(springKey(it.when, n))} />
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        )}
      </ol>

    </>
  )
}
