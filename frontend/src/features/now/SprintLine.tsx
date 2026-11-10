import { CHAPTER } from '@/content'
import { SITE, SPRINT } from '@/config/site'
import { monthDay } from '@/lib/date'
import s from './now.module.css'

/** 학기 레일의 빨간 막대 설명 한 줄: 'G-Sprint · 10.13 킥오프~12.29 데모데이 · 5팀 27명' */
export function SprintLine({ sprint }: { sprint: { start: string; end: string } }) {
  const team = CHAPTER.sprint.verified && CHAPTER.sprint.generation === +SITE.generation.replace(/\D/g, '') ? CHAPTER.sprint : null
  return (
    <p className={s.sprint}>
      <span className={s.sg}>
        <i className={s.swatch} aria-hidden="true" />
        <b>{SPRINT.title}</b>
      </span>
      {/* D-n 은 첫 화면 '다음 일정' 하나만 (한 화면에 D-숫자 하나) */}
      <span className={s.sg}>
        <span className="num">{monthDay(sprint.start)}</span> 킥오프<span className="visually-hidden">부터</span>
        <span className={s.dash} aria-hidden="true">
          ~
        </span>
        <span className="num">{monthDay(sprint.end)}</span> 데모데이
      </span>
      {team && (
        <span className={s.sg}>
          <span className="num">{team.teams}</span>팀 <span className="num">{team.members}</span>명
        </span>
      )}
    </p>
  )
}
