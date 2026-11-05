import { isStalePlan } from '@/content/plan'
import type { RecruitStatus } from '@/content/recruitingStatus'
import type { Project, ProjectImage, ScheduleEvent } from '@/domain/types'
import { monthDay, weekday } from '@/lib/date'

/**
 * 홈 화면 계산 (DOM 없음, homeData.test.ts · applicantHome.test.ts 에 테스트).
 * 콘텐츠가 0건이어도, 행사가 60건 · 프로젝트가 20개를 넘어도 같은 코드로 그린다.
 * 날짜 표기는 docs/DESIGN.md 3장: '10.27 화', 해가 다르면 '2027.01.30 토'.
 * dayLabel · nextEvent 는 features/now 도 쓴다.
 */

const sameYear = (a: string, b: string) => a.slice(0, 4) === b.slice(0, 4)

/** '10.27 화' · 올해가 아니면 '2027.01.30 토' */
export function dayLabel(ymd: string, today: string): string {
  const md = sameYear(ymd, today) ? monthDay(ymd) : `${ymd.slice(0, 4)}.${monthDay(ymd)}`
  return `${md} ${weekday(ymd)}`
}

/** 요일 없이: '10.13' · '2027.01.30' */
export function shortDay(ymd: string, today: string): string {
  return sameYear(ymd, today) ? monthDay(ymd) : `${ymd.slice(0, 4)}.${monthDay(ymd)}`
}

/** 행사가 끝난 날 (여러 날 행사는 마지막 날) */
const endOf = (e: Pick<ScheduleEvent, 'date' | 'endDate'>) => e.endDate ?? e.date

const byDate = (a: ScheduleEvent, b: ScheduleEvent) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'ko')

/** 오늘 이후(오늘 포함) 첫 일정. 휴회는 일정이 아니므로 뺀다 */
export function nextEvent(
  events: readonly ScheduleEvent[],
  today: string,
  match: (e: ScheduleEvent) => boolean = () => true,
): ScheduleEvent | null {
  return [...events].filter((e) => endOf(e) >= today && e.kind !== 'rest' && match(e)).sort(byDate)[0] ?? null
}

/** 공개 페이지(https)에 올라간 일정인지. '4기 운영 계획' 같은 내부 계획은 아니다 */
export const isPublished = (e: Pick<ScheduleEvent, 'source'>) => /^https:\/\//.test(e.source ?? '')

/**
 * 홈 띠 맨 아래 '다음 모임' 표: 공개 페이지가 있거나, 날짜가 확정된(G-Sprint 단계) 다가오는 첫 일정.
 * 운영 계획에만 있는 일정은 확정되기 전까지 홈에 올리지 않고, 날짜가 지난 계획(isStalePlan)도 건너뛴다. 없으면 표를 그리지 않는다.
 */
export function homeNextEvent(events: readonly ScheduleEvent[], today: string, confirmedDates: readonly string[]): ScheduleEvent | null {
  return nextEvent(events, today, (e) => !isStalePlan(e, today) && (isPublished(e) || confirmedDates.includes(e.date)))
}

/** 큰 숫자 한 줄을 숫자 · 단위 조각으로: '5팀 27명' → 5 · 팀 · 27 · 명 (단위 앞뒤 공백은 떼고 화면이 간격을 둔다) */
export function keyParts(text: string): { text: string; num: boolean }[] {
  return text
    .split(/(\d[\d:.]*)/)
    .map((t) => ({ text: t.trim(), num: /^\d/.test(t) }))
    .filter((t) => t.text !== '')
}

/** 그날이 지났는지 (그날 당일은 아직 지나지 않음) */
export const isAfter = (today: string, day: string) => today > day

/** 템플릿의 {key} 를 값으로 바꾼다. 모르는 key 는 그대로 둔다 */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

const recent = (a: Project, b: Project) => b.year - a.year || (b.generation ?? 0) - (a.generation ?? 0) || a.name.localeCompare(b.name, 'ko')

/** 프로젝트 이름표 한 줄: 'Solution Challenge 2026 · 3기' (프로그램 이름에 해가 이미 있으면 해를 한 번만) */
export function projectMeta(p: Pick<Project, 'program' | 'year' | 'generation'>): string {
  const parts = [p.program]
  if (!p.program.includes(String(p.year))) parts.push(String(p.year))
  if (p.generation) parts.push(`${p.generation}기`)
  return parts.join(' · ')
}

/**
 * 홈 주장 제목의 숫자 ('팀으로 만들어 공개한 서비스 {n}개', '{sc}개는 Google Solution Challenge에서').
 * 받는 목록은 이미 공개 저장소가 있는 것만 (content isPublicProject). 진행 중인 프로젝트는 세지 않는다. 커밋 수는 쓰지 않는다.
 */
export function projectCounts(projects: readonly Pick<Project, 'status' | 'program'>[]): { done: number; solutionChallenge: number } {
  const done = projects.filter((p) => p.status === 'done')
  return { done: done.length, solutionChallenge: done.filter((p) => /^Solution Challenge\b/.test(p.program)).length }
}

/** 그림 설명에서 기기 표시를 뗀 화면 이름: '홈 (데스크톱)' → '홈' */
const screenName = (img: ProjectImage) => (img.caption ?? '').replace(/\s*\([^)]*\)\s*$/, '')

/**
 * 큰 타일에 거는 실제 그림: 넓은 그림 하나(실제 화면 screen, 없으면 소개 그림 promo) + 폰 화면 하나.
 * 폰 화면은 넓은 그림이 실제 화면일 때만 겹친다 (소개 그림에는 이미 폰이 그려져 있다).
 * 같은 화면('홈 (데스크톱)' ↔ '홈 (모바일)')이 있으면 그것, 없으면 첫 폰 화면. 로고 · 구조도는 큰 타일에 걸지 않는다.
 */
export function tileShots(gallery: readonly ProjectImage[]): { wide?: ProjectImage; phone?: ProjectImage } {
  const wide = gallery.find((img) => img.kind === 'screen') ?? gallery.find((img) => img.kind === 'promo')
  if (wide?.kind !== 'screen') return { wide }
  const phones = gallery.filter((img) => img.kind === 'mobile')
  return { wide, phone: phones.find((img) => screenName(img) === screenName(wide)) ?? phones[0] }
}

const IMAGE_RANK: Record<string, number> = { screen: 0, promo: 1, mobile: 2, logo: 3, diagram: 4 }

/**
 * 홈에 걸 프로젝트 n개: 고른 id 순서대로, 없는 id · 완성되지 않은 것은 건너뛰고,
 * 모자라면 그림(화면 → 소개 → 로고)이 있고 설명이 있는 최근 프로젝트로 채운다.
 */
export function pickProjects(projects: readonly Project[], ids: readonly string[], n: number): Project[] {
  const byId = new Map(projects.map((p) => [p.id, p]))
  const picked = ids.map((id) => byId.get(id)).filter((p): p is Project => Boolean(p && p.status === 'done'))
  const rest = projects
    .filter((p) => p.status === 'done' && !picked.includes(p))
    .sort((a, b) => (IMAGE_RANK[a.cover?.kind ?? ''] ?? 9) - (IMAGE_RANK[b.cover?.kind ?? ''] ?? 9) || Number(Boolean(b.summary)) - Number(Boolean(a.summary)) || recent(a, b))
  return [...picked, ...rest].slice(0, n)
}

/** 큰 타일 아래 '나머지 전부' 목록: 완성 프로젝트 중 이미 크게 건 것(shownIds)을 빼고 최근 것부터 */
export function restProjects(projects: readonly Project[], shownIds: readonly string[]): Project[] {
  const shown = new Set(shownIds)
  return projects.filter((p) => p.status === 'done' && !shown.has(p.id)).sort(recent)
}

/** 자주 묻는 질문 n개: 고른 id 순서대로, 모자라면 출처가 있는 다른 질문으로 채운다 (common/JoinStrip 이 쓴다. 이름 · 모양을 바꾸지 않는다) */
export function pickFaqs<T extends { id: string; source?: string }>(faqs: readonly T[], ids: readonly string[], n: number): T[] {
  const sourced = faqs.filter((f) => Boolean(f.source))
  const picked = ids.map((id) => sourced.find((f) => f.id === id)).filter((f): f is T => Boolean(f))
  return [...picked, ...sourced.filter((f) => !picked.includes(f))].slice(0, n)
}

/** 멤버 회고에서 지금 보일 사람: 접혀 있으면 앞의 first 명, 펼치면 전부 */
export const voicesShown = <T,>(all: readonly T[], open: boolean, first: number): readonly T[] => (open ? all : all.slice(0, first))

/** 홈에 실을 수 있는 '사람' 한 줄: 공개 동의 기록이 있고 말이 비어 있지 않은 것만 */
export const isShowableVoice = (v: { quote: string; name: string; consent?: { date: string; by: string } | null }) =>
  Boolean(v.quote.trim() && v.name.trim() && v.consent?.date && v.consent.by)

/**
 * 모집 상태 한 낱말 + 덧붙일 줄 (첫 화면). 미정인 것은 지금 상태 · 지난 시기 · 먼저 알릴 채널 (docs/DESIGN.md 10장)
 */
export function statusWords(st: RecruitStatus): { state: string; more: string[] } {
  const day = (ymd?: string) => (ymd ? monthDay(ymd) : '')
  const some = (xs: (string | null | undefined | false)[]) => xs.filter((x): x is string => Boolean(x))
  switch (st.state) {
    case 'open':
      return { state: '지금 받고 있음', more: some([st.deadline && `${day(st.deadline)} 마감`]) }
    case 'soon':
      return { state: `${day(st.opensAt)} 열림`, more: some([st.deadline && `${day(st.deadline)} 마감`, '인스타그램에 먼저 안내']) }
    case 'ended':
      return { state: '마감', more: ['다음 소식은 인스타그램에 먼저'] }
    default:
      return { state: '아직 열리지 않음', more: some([st.lastWindow && st.lastGeneration ? `지난 ${st.lastGeneration}기는 ${st.lastWindow}에 모집` : null, '열리면 인스타그램에 먼저']) }
  }
}

/** 페이지 끝(common/JoinStrip)의 모집 상태 한 문장 (content/story.ts CLOSING.status 의 틀을 채운다). 이름 · 모양을 바꾸지 않는다 */
export function closingStatusLine(
  st: RecruitStatus,
  t: { unscheduled: string; soon: string; open: string; openUntil: string; ended: string },
  handle: string,
): string {
  const vars = { gen: st.generation, handle, opens: st.opensAt ? monthDay(st.opensAt) : '', deadline: st.deadline ? monthDay(st.deadline) : '' }
  if (st.state === 'open') return fill(st.deadline ? t.openUntil : t.open, vars)
  if (st.state === 'soon' && st.opensAt) return fill(t.soon, vars)
  if (st.state === 'ended') return fill(t.ended, vars)
  return fill(t.unscheduled, vars)
}
