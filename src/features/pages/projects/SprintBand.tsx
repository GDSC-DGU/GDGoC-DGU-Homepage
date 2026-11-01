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
  const verb = claim.past ? '데모데이까지 만들었습니다.' : '데모데이를 향해 만들고 있습니다.'

  const title = claim.counted ? (
    <>
      <span className="num">{claim.teams}</span>팀 <span className="num">{claim.members}</span>명이 <span className="num">{claim.demo}</span> {verb}
    </>
  ) : (
    <>
      <span className="num">{gen}</span>기 G-Sprint 팀이 <span className="num">{claim.demo}</span> {verb}
    </>
  )
  const sub = (
    <>
      한 학기 동안 팀을 꾸려 기획부터 배포까지 직접 {claim.past ? '만들었습니다' : '만듭니다'}.
      {!claim.counted && ' 팀과 주제는 데모데이에서 공개합니다.'}
    </>
  )

  return (
    <StorySection
      id="now"
      tone="dark"
      className={k.band}
      placeColor={null}
      titleSize="section"
      eyebrow={
        <>
          <span className="gen-tag">{gen}기</span>
          G-Sprint
        </>
      }
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
            {STATE_TEXT[st.state] && <span className="visually-hidden"> ({STATE_TEXT[st.state]})</span>}
          </li>
        ))}
      </ol>

    </StorySection>
  )
}
