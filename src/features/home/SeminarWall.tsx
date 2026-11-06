import { Link } from 'react-router-dom'
import { EVENTS, PHOTOS, SEMINARS } from '@/content'
import { useSeminars } from '@/data/queries'
import type { Seminar } from '@/domain/types'
import { StorySection } from '@/features/common'
import { homeSeminarCards, seminarDayLabel, seminarGenerations, seminarHref, speakerInitial, speakerTone } from '@/features/pages/archive/seminars'
import s from './seminarWall.module.css'

const dot = (ymd: string) => ymd.replaceAll('-', '.')

function SeminarCard({ talk, feature }: { talk: Seminar; feature: boolean }) {
  const day = seminarDayLabel(talk.date, talk.generation, EVENTS, PHOTOS)
  return (
    <li className={s.item} data-feature={feature || undefined}>
      <Link className={s.card} to={seminarHref(talk)}>
        <span className={s.bigGen} aria-hidden="true">
          {talk.generation}
        </span>
        <span className={s.top}>
          <span className={s.gen}>
            <span className="num">{talk.generation}</span>기
          </span>
          <time className={`num ${s.date}`} dateTime={talk.date}>
            {dot(talk.date)}
          </time>
        </span>
        {day && <span className={s.day}>{day}</span>}
        <span className={s.title}>{talk.title}</span>
        <span className={s.who}>
          <span className={s.avatar} data-tone={speakerTone(talk.speaker)} aria-hidden="true">
            {speakerInitial(talk.speaker)}
          </span>
          <span className={s.speaker}>{talk.speaker}</span>
          <span className={s.go} aria-hidden="true">
            →
          </span>
        </span>
      </Link>
    </li>
  )
}

/**
 * 홈 '멤버 세미나' (4기 Organizer 2026-11-06: 괘선 목록이 밋밋하다 → 다른 동아리 · 컨퍼런스 사이트처럼 발표 카드).
 * 최근 기수 세 장(첫 장은 먹색으로 크게) · 그다음 기수 두 장 · 그다음 두 장. 카드마다 기수 · 날짜 · 그날 세션 이름 · 제목 · 발표자.
 * 뒤에 기수 숫자를 옅게 크게. 카드를 누르면 아카이브 세미나 보기에서 그 발표를 찾아 둔 화면. 전부는 /archive?view=seminars.
 * 넓은 화면 네 칸 두 줄, 태블릿 두 칸, 폰은 옆으로 넘긴다.
 * 자료(content/seminars.json, 노션 '전 기수 데이터 모음집')를 받기 전에도 저장소 스냅샷으로 먼저 그린다.
 */
export function SeminarWall() {
  const { data } = useSeminars()
  const list = data ?? SEMINARS
  const cards = homeSeminarCards(list)
  if (cards.length === 0) return null
  const gens = seminarGenerations(list)
  const span = gens.length > 1 ? `${Math.min(...gens)}–${Math.max(...gens)}` : String(gens[0])
  return (
    <StorySection
      id="seminars"
      titleSize="h2"
      title="멤버 세미나"
      sub={`${span}기 세션에서 멤버들이 발표한 세미나입니다.`}
      action={
        <Link className="link-go" to="/archive?view=seminars#archive-views">
          세미나 전체 보기
        </Link>
      }
    >
      <ul className={s.grid} aria-label="최근 세미나">
        {cards.map((t, i) => (
          <SeminarCard key={t.id} talk={t} feature={i === 0} />
        ))}
      </ul>
    </StorySection>
  )
}
