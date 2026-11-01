import { AdminRepoError } from '../common/errors'
import { byNewest, matchesQuery, newId, paginate } from '../common/list'
import { isHttpUrl } from '../common/mask'
import { isoNow, requireActor, respond, type MockContext } from '../common/mockContext'
import type { ProjectsRepository } from './repository'
import type { AdminProject, ProjectInput } from './types'

/** 간단한 설명 최대 글자 수 (F-APJ-004) */
export const PROJECT_SUMMARY_MAX = 60

/** 등록 · 수정 입력 확인 (F-APJ-004 · 006). 칸별 오류 문구, 없으면 빈 객체 */
export function validateProjectInput(input: ProjectInput): Record<string, string> {
  const e: Record<string, string> = {}
  if (!input.thumbnailUrl) e.thumbnail = '썸네일 이미지를 올려 주세요.'
  if (!input.title.trim()) e.title = '제목을 입력해 주세요.'
  if (!input.summary.trim()) e.summary = '간단한 설명을 입력해 주세요.'
  else if (input.summary.trim().length > PROJECT_SUMMARY_MAX) e.summary = `간단한 설명은 ${PROJECT_SUMMARY_MAX}자 이내로 써 주세요.`
  if (input.generation === null) e.generation = '기수를 골라 주세요.'
  // 선택 칸: 비우면 확인하지 않는다. 쓰면 http(s):// 로 시작하는 주소 (F-APJ-004 2)
  if (input.githubUrl?.trim() && !isHttpUrl(input.githubUrl)) e.githubUrl = 'URL 형식이 올바르지 않습니다. https:// 로 시작하는 주소를 입력해 주세요.'
  if (input.serviceUrl?.trim() && !isHttpUrl(input.serviceUrl)) e.serviceUrl = 'URL 형식이 올바르지 않습니다. https:// 로 시작하는 주소를 입력해 주세요.'
  return e
}

/** 저장할 모양으로 다듬기: 앞뒤 공백, 빈 URL 은 null */
export function normalizeProjectInput(input: ProjectInput): ProjectInput {
  const url = (s: string | null) => (s && s.trim() ? s.trim() : null)
  return { ...input, title: input.title.trim(), summary: input.summary.trim(), members: input.members.trim(), githubUrl: url(input.githubUrl), serviceUrl: url(input.serviceUrl) }
}

/** 프로젝트 예시 저장소 (store 의 projects 칸). 주인: 2단계 프로젝트 담당 */
export function createMockProjectsRepository(ctx: MockContext): ProjectsRepository {
  const all = () => ctx.store.get('projects').projects
  const find = (id: string) => {
    const p = all().find((x) => x.id === id && !x.deleted)
    if (!p) throw new AdminRepoError('NOT_FOUND', '프로젝트를 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.')
    return p
  }
  const check = (input: ProjectInput) => {
    const fields = validateProjectInput(input)
    if (Object.keys(fields).length) throw new AdminRepoError('VALIDATION', '입력한 내용을 확인해 주세요.', { fields })
    return normalizeProjectInput(input)
  }

  return {
    list: (query) =>
      respond(() =>
        paginate(
          all()
            .filter((p) => !p.deleted && matchesQuery(query.q, [p.title, p.summary]))
            // 최신 등록순 (같은 시각이면 나중 번호가 위)
            .sort((a, b) => byNewest<AdminProject>((p) => p.createdAt)(a, b) || b.no - a.no),
          { pageSize: 10, ...query },
        ),
      ),

    remove: (ids) =>
      respond(() => {
        // 실제로 지우지 않고 삭제 상태로 (누가 · 언제, F-APJ-003 1 · 3)
        const stamp = { by: requireActor(ctx), at: isoNow(ctx) }
        const set = new Set(ids)
        let deleted = 0
        ctx.store.set('projects', (s) => ({
          projects: s.projects.map((p) => {
            if (!set.has(p.id) || p.deleted) return p
            deleted++
            return { ...p, deleted: stamp }
          }),
        }))
        return { deleted }
      }),

    create: (input) =>
      respond(() => {
        const actor = requireActor(ctx)
        const clean = check(input)
        const at = isoNow(ctx)
        const project: AdminProject = {
          ...clean,
          id: newId('project'),
          no: Math.max(0, ...all().map((p) => p.no)) + 1,
          createdAt: at,
          created: { by: actor, at },
          updated: null,
          deleted: null,
        }
        ctx.store.set('projects', (s) => ({ projects: [...s.projects, project] }))
        return project
      }),

    get: (id) => respond(() => find(id)),

    update: (id, input) =>
      respond(() => {
        const actor = requireActor(ctx)
        find(id)
        const clean = check(input)
        let next: AdminProject | undefined
        ctx.store.set('projects', (s) => ({
          projects: s.projects.map((p) => (p.id === id ? (next = { ...p, ...clean, updated: { by: actor, at: isoNow(ctx) } }) : p)),
        }))
        return next!
      }),
  }
}
