import { ddayLabel, shortDate } from '@/lib/date'
import { dateLabel } from '../format'
import { stepStates, type StepState } from '../timeline'

/**
 * 4기 G-Sprint 띠 계산 (화면과 상관없는 것만). sprint.test.ts 에 테스트.
 * 숫자 · 날짜는 content/chapter.json 의 sprint(팀 · 인원, 킥오프 페이지 기준)와 config/site.ts 의 SPRINT(단계 날짜)에서만 온다.
 */

export interface SprintStepInput {
  label: string
  /** '09.22' · '11월' */
  when: string
  date: string
}

export interface SprintFacts {
  generation: number
  teams: number
  members: number
  verified: boolean
}

export interface SprintStep {
  id: string
  label: string
  /** '10.27 화' 또는 '11월' (날짜를 정하지 않은 단계) */
  when: string
  /** 날짜가 정해진 단계만 'YYYY-MM-DD' */
  dateTime?: string
  state: StepState
  /** 다음 단계이고 날짜가 정해졌으면 'D-9' */
  dday?: string
}

/** 날짜를 정하지 않고 달로만 적는 단계 ('개발 · 11월') */
const isDated = (st: SprintStepInput) => /^\d{2}\.\d{2}$/.test(st.when)

/**
 * 단계마다 상태: 지난 단계 done, 그다음 하나 next(지금 강조하는 단계), 나머지 later.
 * 단계 날짜 당일은 그 단계가 next('D-day')다 (당일에 벌써 지난 단계로 보이지 않게).
 * 날짜가 없는 단계(개발)는 뒤의 날짜 단계에 이미 와 있으면(당일 포함) 지난 것으로 본다 (데모데이에 '개발'이 다음 단계로 남지 않게).
 */
export function sprintSteps(steps: readonly SprintStepInput[], today: string): SprintStep[] {
  const states = stepStates(
    steps.map((st) => (isDated(st) ? st.date : null)),
    today,
  )
  const lastReached = steps.reduce((acc, st, i) => (isDated(st) && st.date <= today ? i : acc), -1)
  const fixed: StepState[] = states.map((st, i) => (i < lastReached && !isDated(steps[i]) ? 'done' : st))
  // 앞 단계가 done 으로 바뀌면서 next 가 사라졌으면, 처음 남은 later 를 next 로
  if (!fixed.includes('next')) {
    const i = fixed.indexOf('later')
    if (i >= 0) fixed[i] = 'next'
  }
  return steps.map((st, i) => {
    const dated = isDated(st)
    return {
      id: st.label,
      label: st.label,
      when: dated ? dateLabel(st.date, null, today) : st.when,
      dateTime: dated ? st.date : undefined,
      state: fixed[i],
      dday: fixed[i] === 'next' && dated ? ddayLabel(st.date, today) : undefined,
    }
  })
}

export interface SprintClaim {
  /** 데모데이가 지났으면 true (주장을 과거형으로) */
  past: boolean
  /** '12.29' (해가 다르면 '2027.01.30') */
  demo: string
  /** 팀 · 인원을 확인했는지 (아니면 숫자 없이) */
  counted: boolean
  teams: number
  members: number
  generation: number
}

/** 띠 주장 '5팀 27명이 12.29 데모데이를 향해 만들고 있습니다.' 에 들어갈 값 (숫자의 기준은 꼬리말 출처 줄: gdg.community.dev) */
export function sprintClaim(facts: SprintFacts, demoDay: string, today: string): SprintClaim {
  return {
    past: today > demoDay,
    demo: shortDate(demoDay, today),
    counted: facts.verified && facts.teams > 0 && facts.members > 0,
    teams: facts.teams,
    members: facts.members,
    generation: facts.generation,
  }
}
