import type { Repositories } from '@/data/repositories'
import { adaptList, toPreviewItem, toProject, toReview, toScheduleEvent, toSearchHit, toSeminar, toStat } from './adapters'

/**
 * Spring Boot API 를 쓰는 구현.
 * 아래 주소는 제안일 뿐이고, 실제 주소는 BE 팀의 API 명세서를 따른다.
 * 응답 모양이 다르면 adapters.ts 에서 바꾼다. 컴포넌트는 고치지 않는다.
 *
 * Gemini API 키는 브라우저에 두지 않는다. 검색은 반드시 서버(/api/search)를 거친다.
 */
export class HttpError extends Error {
  readonly status: number
  constructor(status: number, url: string) {
    super(`${status} ${url}`)
    this.name = 'HttpError'
    this.status = status
  }
}

/** 검색어가 이보다 짧으면 서버를 부르지 않는다 (한 글자마다 Gemini 를 부르지 않게) */
export const MIN_SEARCH_LENGTH = 2

export function createHttpRepositories(baseUrl = '/api', fetcher: typeof fetch = (...args) => fetch(...args)): Repositories {
  const getJson = async (path: string): Promise<unknown> => {
    const url = `${baseUrl}${path}`
    const res = await fetcher(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new HttpError(res.status, url)
    return res.json()
  }

  return {
    schedule: { list: async () => adaptList(await getJson('/schedules'), toScheduleEvent) },
    projects: { list: async () => adaptList(await getJson('/projects'), toProject) },
    seminars: { list: async () => adaptList(await getJson('/seminars'), toSeminar) },
    stats: { list: async () => adaptList(await getJson('/stats'), toStat) },
    previews: {
      latest: async (place, limit) => adaptList(await getJson(`/places/${place}/latest?limit=${limit}`), toPreviewItem).slice(0, limit),
    },
    reviews: { list: async () => adaptList(await getJson('/reviews'), toReview) },
    search: {
      search: async (q) => {
        const query = q.trim()
        if (query.length < MIN_SEARCH_LENGTH) return []
        return adaptList(await getJson(`/search?q=${encodeURIComponent(query)}`), toSearchHit)
      },
    },
  }
}
