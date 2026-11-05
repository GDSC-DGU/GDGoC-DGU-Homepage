import type { CSSProperties } from 'react'
import { SPRINT } from '@/config/site'
import { CHAPTER } from '@/content'
import { StorySection } from '@/features/common'
import { sprintClaim, sprintSteps } from './sprint'
import k from './sprint.module.css'

const STATE_TEXT = { done: '지남', next: '다음 단계', later: '' } as const

/**
 * 4기 G-Sprint (전시실 다음, 먹색 이야기 섹션 하나):
 * 이름표(4기 · G-Sprint) → 주장 '5팀 27명이 12.29 데모데이를 향해 만들고 있습니다.' → 단계 줄(지금 단계만 강조).
 * (공개된 4기 프로젝트 줄은 4기 시안 2026-11 에서 뺐다)
 * 숫자는 chapter.json sprint(킥오프 페이지), 날짜는 config/site.ts SPRINT. 데모데이가 지나면 주장을 과거형으로 바꾼다.
 */
export function SprintBand({ today }: { today: string }) {
  const claim = sprintClaim(CHAPTER.sprint, SPRINT.demoDay, today)
  const steps = sprintSteps(SPRINT.steps, today)
  const gen = claim.generation
  const verb = claim.past ? '서비스를 만들었습니다.' : '서비스를 만듭니다.'
  // '12.29 데모데이까지' 는 한 덩어리 (날짜와 '데모데이' 가 다른 줄로 갈렸다: 화면 검토 2026-11-05)
  const until = (
    <span style={{ whiteSpace: 'nowrap' }}>
      <span className="num">{claim.demo}</span> 데모데이까지
    </span>
  )

  const title = claim.counted ? (
    <>
      <span className="num">{claim.teams}</span>팀 <span className="num">{claim.members}</span>명이 {until} {verb}
    </>
  ) : (
    <>
      <span className="num">{gen}</span>기 G-Sprint 팀이 {until} {verb}
    </>
  )
  // 제목이 '서비스를 만듭니다' 로 끝나므로 부제는 같은 말을 되풀이하지 않고 무엇인지만 (문구 검토 2026-11-05)
  const sub = claim.counted ? (
    <>
      <span className="num">{gen}</span>기 G-Sprint, 한 학기 동안 하는 팀 프로젝트입니다.
    </>
  ) : (
    '한 학기 동안 하는 팀 프로젝트입니다. 팀과 주제는 데모데이에서 공개합니다.'
  )

  return (
    <StorySection
      id="now"
      tone="dark"
      className={k.band}
      titleSize="section"
      title={title}
      sub={sub}
    >
      <ol className={k.steps} aria-label={`${gen}기 G-Sprint 단계`} style={{ '--n': steps.length } as CSSProperties}>
        {steps.map((st) => (
          <li key={st.id} className={k.step} data-state={st.state} aria-current={st.state === 'next' ? 'step' : undefined}>
            <span className={k.mark} aria-hidden="true" />
            <span className={k.label}>{st.label}</span>
            <span className={k.when}>
              <span className="num">{st.dateTime ? <time dateTime={st.dateTime}>{st.when}</time> : st.when}</span>
              {st.dday && <span className={`${k.dday} num`}>{st.dday}</span>}
            </span>
            {/* 날짜 없이 달로만 적은 단계(개발 · 11월)가 강조되면 그 단계를 하는 중이다: '다음 단계' 가 아니라 '지금' */}
            {STATE_TEXT[st.state] && <span className="visually-hidden"> ({st.state === 'next' && !st.dateTime ? '지금' : STATE_TEXT[st.state]})</span>}
          </li>
        ))}
      </ol>

    </StorySection>
  )
}
