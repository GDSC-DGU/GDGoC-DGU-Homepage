import { SPRINT } from '@/config/site'
import { RECRUITING } from '@/content'
import { dayValue } from '@/lib/date'

/** 하위 페이지 머리에 서는 건물 (광장 깃발 = 소개는 하위 페이지가 없다) */
export type HeroPlace = 'projects' | 'community' | 'recruits' | 'teams'

/** 건물 상태 (PlaceHeroProps.state) */
export type HeroState = 'open' | 'closed' | 'construction'

/** 장면에 그릴 모습. 상태는 실제 데이터에서만 정한다 (DESIGN 6장: 상태 표시는 실제 데이터로만) */
export interface BuildingLook {
  state: HeroState
  /** 창에 불이 켜짐 */
  lit: boolean
}

/** G-Sprint 가 진행 중인지: 첫 단계(발제) 날부터 데모데이까지 (config/site.ts 의 확정 일정) */
export function sprintRunning(today: string, sprint: { steps: readonly { date: string }[]; demoDay: string } = SPRINT): boolean {
  const first = sprint.steps[0]?.date
  if (!first) return false
  const t = dayValue(today)
  return t >= dayValue(first) && t <= dayValue(sprint.demoDay)
}

/** 지금 모집 중인지: content/recruiting.json 의 current.status 만 본다 (날짜를 지어내지 않는다) */
export const recruitingOpen = (status: string = RECRUITING.current.status) => status === 'open'

/** 장소마다 기본 상태: 팀원 찾기는 공사 중, 지원 안내는 모집 상태, 나머지는 열림 */
export function defaultState(place: HeroPlace, recruiting: string = RECRUITING.current.status): HeroState {
  if (place === 'teams') return 'construction'
  if (place === 'recruits') return recruitingOpen(recruiting) ? 'open' : 'closed'
  return 'open'
}

/**
 * 건물 모습. state 를 주면 그 상태, 없으면 defaultState.
 * 불: 프로젝트 랩은 열려 있고 G-Sprint 기간일 때, 지원 안내는 열려 있을 때(모집 중). 커뮤니티는 지붕 화면이 대신 말한다.
 */
export function buildingLook(place: HeroPlace, today: string, state?: HeroState, recruiting?: string): BuildingLook {
  const s = state ?? defaultState(place, recruiting)
  const lit = s === 'open' && (place === 'projects' ? sprintRunning(today) : place === 'recruits')
  return { state: s, lit }
}
