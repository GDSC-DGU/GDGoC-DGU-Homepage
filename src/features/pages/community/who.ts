import { GLOSSARY, type TermId } from '@/content/glossary'
import type { Generation } from '@/domain/types'

/**
 * 소개 페이지 맨 위 '우리는' (4기 Organizer 결정 2026-11-05: 커뮤니티를 소개로 넘기며 '우리가 누구인지'를 짧게 넣는다).
 * 있는 자료만 쓴다: 기수 연혁(generations.json) · 챕터 숫자(chapter.json) · 용어 풀이(glossary.ts) · 홈 지도 팝업의 활동 세 줄(config/site ABOUT_FACTS).
 * who.test.ts 에 테스트.
 */

export interface WhoCard {
  id: 'sessions' | 'sprint' | 'joint' | 'members'
  label: string
  /** 큰 글자 (숫자는 화면에서 숫자 글꼴로) */
  value: string
  sub?: string
}

/** 이 섹션이 풀어 쓰는 용어: 아래 일정 · 기록에서는 다시 풀지 않는다 */
export const WHO_TERMS: ReadonlySet<TermId> = new Set<TermId>(['g-sprint', 'dong-hong'])

interface WhoInput {
  /** chapter.json members (gdg.community.dev 챕터 그룹 멤버 수) */
  members?: { value: number; asOf: string }
  /** chapter.json sprint: 확인된(verified) 숫자만 쓴다 */
  sprint?: { teams: number; members: number; verified: boolean }
  /** 'MM.DD' 데모데이 (config/site SPRINT.demoDay) */
  demoDay?: string
}

/** 제목 '2023년 1기부터 지금 4기까지' 의 두 숫자. 첫 기수의 시작 달이 없으면 연도는 null */
export function whoSpan(gens: readonly Generation[]): { since: number | null; current: number | null } {
  const sorted = [...gens].sort((a, b) => a.n - b.n)
  const first = sorted[0]
  const current = sorted.find((g) => g.current) ?? sorted[sorted.length - 1]
  return { since: first?.start ? Number(first.start.slice(0, 4)) : null, current: current?.n ?? null }
}

/**
 * 이름이 바뀐 기수: 1기 GDSC DGU → 2기부터 GDGoC DGU. 한 번도 안 바뀌었으면 null.
 * '1기는 GDSC DGU, 2기부터는 GDGoC DGU 이름으로 활동합니다.'
 */
export function nameChange(gens: readonly Generation[]): { before: string; after: string; from: number } | null {
  const sorted = [...gens].sort((a, b) => a.n - b.n)
  const i = sorted.findIndex((g, k) => k > 0 && g.name !== sorted[k - 1].name)
  return i > 0 ? { before: sorted[i - 1].name, after: sorted[i].name, from: sorted[i].n } : null
}

/** 흰 판 네 장: 정기 세션 · G-Sprint · 연합 행사 · 그룹 멤버 (자료가 없는 판은 뺀다) */
export function whoCards({ members, sprint, demoDay }: WhoInput): WhoCard[] {
  const cards: WhoCard[] = [
    // 홈 지도 팝업 '화요일 · 네 파트별 실습' + 지원 안내 '시험 기간에는 쉽니다' (faq when-sessions)
    { id: 'sessions', label: '정기 세션', value: '매주 화요일', sub: '네 파트별 실습 · 시험 기간에는 쉽니다' },
  ]
  const sprintSub = [GLOSSARY['g-sprint'].short, demoDay ? `${demoDay} ${GLOSSARY['demo-day'].term}` : null].filter(Boolean).join(' · ')
  if (sprint?.verified) cards.push({ id: 'sprint', label: GLOSSARY['g-sprint'].term, value: `${sprint.teams}팀 ${sprint.members}명`, sub: sprintSub })
  else cards.push({ id: 'sprint', label: GLOSSARY['g-sprint'].term, value: GLOSSARY['g-sprint'].short })
  cards.push({ id: 'joint', label: '연합 행사', value: `${GLOSSARY['dong-hong'].term} · 동지톤`, sub: `${GLOSSARY['dong-hong'].term}: ${GLOSSARY['dong-hong'].short}` })
  if (members) cards.push({ id: 'members', label: '그룹 멤버', value: `${members.value}명`, sub: `gdg.community.dev 챕터 그룹 · ${members.asOf.slice(0, 7).replace('-', '.')} 기준` })
  return cards
}
