import { Link } from 'react-router-dom'
import { SITE, SPRINT } from '@/config/site'
import { CHAPTER, EVENTS } from '@/content'
import { BAND, SPRINT_LINE, WAYS, type Way } from '@/content/story'
import { useSchedule } from '@/data/queries'
import { StorySection } from '@/features/common'
import { LedTicket } from '@/features/signboard/LedBoard'
import { Term } from '@/features/glossary/Term'
import { useToday } from '@/hooks/useToday'
import { monthDay } from '@/lib/date'
import { fill, homeNextEvent, isAfter, keyParts } from './homeData'
import s from './band.module.css'

const GEN_N = +SITE.generation.replace(/\D/g, '')
/** 이번 기수 G-Sprint 규모 (킥오프 페이지로 확인된 것만) */
const sprintTeam = CHAPTER.sprint?.verified && CHAPTER.sprint.generation === GEN_N ? CHAPTER.sprint : null
const DEMO_DAY = monthDay(SPRINT.demoDay)
/** 날짜가 확정된 G-Sprint 단계 (공개 페이지가 없어도 계획이 아니다) */
const CONFIRMED = SPRINT.steps.map((st) => st.date)

/** 큰 숫자 한 줄: 숫자는 --t-num, 단위 글자는 작게 숫자 뒤에 붙이고 다음 숫자와는 띄운다 ('5팀 27명') */
function KeyText({ text }: { text: string }) {
  return (
    <>
      {keyParts(text).map((part, i) =>
        part.num ? (
          <span key={i} className={`num ${s.keyNum}`}>
            {part.text}
          </span>
        ) : (
          <span key={i} className={s.keyUnit}>
            {part.text}
          </span>
        ),
      )}
    </>
  )
}

/** 칸마다 작은 이름 · 큰 숫자 · 한 문장. G-Sprint 는 확인된 규모가 있으면 '5팀 27명'(킥오프 기준), 데모데이 다음 날부터 지난 일로 */
function wayText(way: Way, today: string): { label: string; key: string; basis?: string; body: string } {
  const label = fill(way.label, { gen: GEN_N })
  if (way.id !== 'sprint') return { label, key: way.key, body: way.body }
  if (!sprintTeam) return { label, key: fill(way.key, { day: DEMO_DAY }), body: way.body }
  return {
    label,
    key: fill(SPRINT_LINE.key, { teams: sprintTeam.teams, members: sprintTeam.members }),
    basis: SPRINT_LINE.basis,
    body: fill(isAfter(today, SPRINT.demoDay) ? SPRINT_LINE.after : SPRINT_LINE.before, { gen: GEN_N, day: DEMO_DAY }),
  }
}

/**
 * 어떻게 하나요: 홈에 하나뿐인 먹색 띠 (이야기 섹션).
 * 이름표 '어떻게 하나요' → 주장 '같은 문제를 각자 풀고, 서로의 풀이를 봅니다.' → 세 칸 → 맨 아래 다음 모임 표(Ticket).
 * 칸 = 위 1px 선 → 작은 이름('매주 화요일') → 큰 숫자('18:00') → 이름 → 한 문장 → 사이트 안 링크 하나.
 * 화면에서는 작은 이름 · 큰 숫자가 이름 위에 보이지만 읽는 순서는 이름 → 작은 이름 → 숫자 → 문장 (제목으로 건너뛸 때 이름이 먼저 들린다).
 * G-Sprint 풀이(<Term>)는 홈에서 여기 한 번. 지도 광장 깃발의 '소개 보기'가 여기로 온다 (#about).
 * 다음 모임은 /about(소개) 과 같은 일정에서 고른다 (공개됐거나 확정된 것만). 고를 것이 없으면 표를 그리지 않는다.
 */
export function HowSection() {
  const today = useToday()
  const { data } = useSchedule()
  // 일정은 저장소 스냅샷과 같은 내용이다. 서버에서 받기 전에도 스냅샷으로 먼저 그린다
  const next = homeNextEvent(data ?? EVENTS, today, CONFIRMED)

  return (
    <StorySection
      id="about"
      tone="dark"
      className={s.band}
      eyebrow={BAND.title}
      title={BAND.lines.map((line, i) => (
        <span key={line} className={s.line}>
          {i > 0 && ' '}
          {line}
        </span>
      ))}
    >
      <ul className={s.ways}>
        {WAYS.map((way) => {
          const t = wayText(way, today)
          return (
            <li key={way.id} className={s.way}>
              <h3 className={s.name}>{way.id === 'sprint' ? <Term id="g-sprint" /> : way.name}</h3>
              <p className={s.label}>
                <span>{t.label}</span>
                {t.basis && <span className={s.basis}>{t.basis}</span>}
              </p>
              <p className={s.key}>
                <KeyText text={t.key} />
              </p>
              <p className={s.body}>{t.body}</p>
              <Link className={`link-go ${s.go}`} to={way.link.to}>
                {way.link.label}
              </Link>
            </li>
          )
        })}
      </ul>
      {next && <LedTicket className={s.ticket} kicker={BAND.next.kicker} date={next.date} endDate={next.endDate} title={next.title} place={next.place} to={BAND.next.to} />}
    </StorySection>
  )
}
