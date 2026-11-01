import { GENERATIONS } from '@/content'
import { PROJECT_SUMMARY_MAX, normalizeProjectInput, validateProjectInput } from '../data/projects/mockRepository'
import type { AdminProject, ProjectInput } from '../data/projects/types'

/**
 * 프로젝트 등록 · 수정 폼 (P-APJ-02) 의 화면 밖 계산. 테스트: projectForm.test.ts
 * 입력 칸은 글자로 들고 있다가 저장할 때 API 모양(ProjectInput)으로 바꾼다.
 */
export interface ProjectDraft {
  thumbnail: { url: string; name: string; size?: number } | null
  title: string
  summary: string
  /** select 값 ('' = 고르지 않음) */
  generation: string
  members: string
  githubUrl: string
  serviceUrl: string
  isPublic: boolean
}

/** 새 프로젝트: 공개 여부 기본값 공개 (F-APJ-004 3) */
export const emptyProjectDraft = (): ProjectDraft => ({ thumbnail: null, title: '', summary: '', generation: '', members: '', githubUrl: '', serviceUrl: '', isPublic: true })

/** 주소 끝 파일 이름 ('/project-images/agriguard.webp' → 'agriguard.webp'). 예시 그림(data URL)은 '예시 이미지' */
export function fileNameOf(url: string): string {
  if (url.startsWith('data:')) return '예시 이미지'
  if (url.startsWith('blob:')) return '올린 이미지'
  const last = url.split(/[?#]/)[0].split('/').filter(Boolean).at(-1)
  return last ? decodeURIComponent(last) : '이미지'
}

/** 수정 모드: 저장된 프로젝트 → 입력 칸 */
export function draftFromProject(p: AdminProject): ProjectDraft {
  return {
    thumbnail: p.thumbnailUrl ? { url: p.thumbnailUrl, name: fileNameOf(p.thumbnailUrl) } : null,
    title: p.title,
    summary: p.summary,
    generation: p.generation ? String(p.generation) : '',
    members: p.members,
    githubUrl: p.githubUrl ?? '',
    serviceUrl: p.serviceUrl ?? '',
    isPublic: p.isPublic,
  }
}

/** 입력 칸 → API-APJ-003 · 006 요청 */
export function toProjectInput(d: ProjectDraft): ProjectInput {
  const n = Number(d.generation)
  return normalizeProjectInput({
    thumbnailUrl: d.thumbnail?.url ?? null,
    title: d.title,
    summary: d.summary,
    generation: d.generation && Number.isInteger(n) ? n : null,
    members: d.members,
    githubUrl: d.githubUrl,
    serviceUrl: d.serviceUrl,
    isPublic: d.isPublic,
  })
}

/** 칸별 오류 (예시 저장소 · 서버와 같은 규칙, F-APJ-004 · 006) */
export const validateProjectDraft = (d: ProjectDraft): Record<string, string> => validateProjectInput(toProjectInput(d))

/** 바뀐 것이 있는지 ([취소] 전에 물을지) */
export function draftChanged(a: ProjectDraft, b: ProjectDraft): boolean {
  return JSON.stringify(a) !== JSON.stringify(b)
}

/** 기수 고르기 (기수 연혁 src/content/generations.json) */
export const GENERATION_OPTIONS = GENERATIONS.map((g) => ({ value: String(g.n), label: `${g.n}기` }))

export { PROJECT_SUMMARY_MAX }
