import type { Project } from '@/domain/types'

/**
 * 네 파트 표의 내용과 '지난 프로젝트 예' 고르기. recruits.test.ts 에 테스트.
 * (시안 C 홈의 파트 표에서 옮겨 왔다. 홈은 이제 이 표를 싣지 않는다)
 *
 * - 파트 구성 · 진행 방식(같은 문제를 각자 풀고 비교): 4기 멤버 소개 · 파트 세션 행사 페이지 (faq.json 'parts')
 * - role: 그 역할의 일반적인 뜻 (G-Sprint 팀에서 맡는 일)
 * - compare: 파트 세션에서 서로 비교하는 것
 * - techs: 지난 프로젝트 예를 고르는 기술 (projects.json stack, GitHub README 기준). 비어 있으면 예를 싣지 않는다
 */
export interface Part {
  id: 'frontend' | 'backend' | 'ai' | 'design'
  name: string
  role: string
  compare: string
  techs: readonly string[]
}

export const PARTS: readonly Part[] = [
  { id: 'frontend', name: 'Frontend', role: '사용자가 보고 누르는 화면을 만듭니다.', compare: '서로의 코드', techs: ['React', 'Next.js', 'Angular'] },
  { id: 'backend', name: 'Backend', role: '서비스의 API, 데이터베이스, 서버를 만듭니다.', compare: '서로의 설계 이유', techs: ['Spring Boot', 'FastAPI', 'Django', 'Flask', 'Go'] },
  { id: 'ai', name: 'AI/ML', role: '모델을 다루고 서비스에 AI 기능을 붙입니다.', compare: '서로의 접근 방법', techs: ['Gemini', 'Vertex AI', 'PyTorch', 'Whisper', 'MobileCLIP'] },
  { id: 'design', name: 'Product Design', role: '사용자 흐름과 화면을 설계합니다.', compare: '서로의 설계', techs: [] },
]

/** 예를 고를 때 몇 개까지 이름을 보일지 (나머지는 '외 N개') */
export const EXAMPLES_SHOWN = 3

const recent = (a: Project, b: Project) => b.year - a.year || (b.generation ?? 0) - (a.generation ?? 0) || a.name.localeCompare(b.name, 'ko')

/**
 * 표지 순위: 정사각에 가까운 로고 · 앱 아이콘 → 가로로 긴 글자 로고 → 그 밖의 그림(화면 캡처 · 소개 그림) → 그림 없음.
 * 지원 안내 네 파트의 아이콘 줄(40px)에서 알아볼 수 있는 것을 먼저 고르려는 것이다.
 */
function coverRank(p: Pick<Project, 'cover'>): number {
  const c = p.cover
  if (!c) return 3
  if (c.kind !== 'logo') return 2
  return c.width && c.height && c.width / c.height > 1.5 ? 1 : 0
}

/** 기술 목록 중 하나라도 쓴 끝난 프로젝트 (표지 그림이 있는 것, 그중 로고 아이콘 → 최근 것 먼저) */
export function projectsUsing(projects: readonly Project[], techs: readonly string[]): Project[] {
  if (techs.length === 0) return []
  const set = new Set(techs.map((t) => t.toLowerCase()))
  return projects
    .filter((p) => p.status === 'done' && (p.stack ?? []).some((t) => set.has(t.toLowerCase())))
    .sort((a, b) => coverRank(a) - coverRank(b) || recent(a, b))
}

export interface PartExamples {
  shown: Project[]
  /** 그 기술을 쓴 프로젝트 수 (다른 파트와 겹침 포함) */
  total: number
}

/**
 * 파트마다 지난 프로젝트 예: 앞 파트에서 이미 보인 프로젝트는 되도록 피해서 고른다 (같은 이름이 세 줄에 반복되지 않게).
 * 모자라면 겹쳐도 채운다. 예가 없는 파트는 결과에서 빠진다 (화면은 그 칸을 숨긴다).
 */
export function partExamples(projects: readonly Project[], parts: readonly Pick<Part, 'id' | 'techs'>[], n: number = EXAMPLES_SHOWN): Partial<Record<Part['id'], PartExamples>> {
  const used = new Set<string>()
  const out: Partial<Record<Part['id'], PartExamples>> = {}
  for (const part of parts) {
    const all = projectsUsing(projects, part.techs)
    if (all.length === 0) continue
    const fresh = all.filter((p) => !used.has(p.id))
    const shown = [...fresh, ...all.filter((p) => used.has(p.id))].slice(0, n)
    for (const p of shown) used.add(p.id)
    out[part.id] = { shown, total: all.length }
  }
  return out
}
