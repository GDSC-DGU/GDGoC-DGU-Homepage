import { isPublicProject, PROJECTS } from '@/content'
import { seedTools, type SeedContext } from '../common/seedContext'
import type { AdminProject, ProjectsState } from './types'

/** seed 모양을 바꾸면 1 올린다 */
export const PROJECTS_SEED_VERSION = 3

/**
 * 프로젝트 예시 데이터: 저장소의 **실제** 프로젝트(src/content/projects.json, 공개 정보)로 시작한다 (BRIEF 허용).
 * 등록 시각은 첫 커밋 날짜, 등록자는 '시스템'(예전 기록을 옮겨 온 것: 화면에는 '기존 기록 이전').
 * 첫 커밋 날짜가 없으면 정렬만 그 해 1월 1일로 하고 화면에는 '-' (createdAtUnknown).
 * 팀원은 공개 기록에 없어 비워 둔다. 주인: 2단계 프로젝트 담당.
 * 공개 여부는 공개 Projects 페이지와 같게: 챕터 GitHub 조직에 저장소가 있는 프로젝트만 공개
 * (저장소가 없는 진행 중 프로젝트는 비공개로 보인다 → 목록에서 비공개 표시를 볼 수 있다).
 */
export function createProjectsSeed(ctx: SeedContext): ProjectsState {
  const { by } = seedTools(ctx)
  const base = import.meta.env?.BASE_URL ?? '/'
  const oldestFirst = [...PROJECTS].sort((a, b) => (a.firstCommit ?? `${a.year}-01-01`).localeCompare(b.firstCommit ?? `${b.year}-01-01`))
  const projects: AdminProject[] = oldestFirst.map((p, i) => {
    const createdAt = new Date(`${p.firstCommit ?? `${p.year}-01-01`}T00:00:00+09:00`).toISOString()
    return {
      id: p.id,
      no: i + 1,
      thumbnailUrl: p.cover ? `${base}${p.cover.src}` : null,
      title: p.name,
      summary: p.summary ?? '',
      generation: p.generation ?? null,
      members: '',
      githubUrl: p.repo ?? null,
      serviceUrl: p.url ?? null,
      isPublic: isPublicProject(p),
      createdAt,
      ...(p.firstCommit ? {} : { createdAtUnknown: true }),
      created: by('system', createdAt),
      updated: null,
      deleted: null,
    }
  })
  return { projects }
}
