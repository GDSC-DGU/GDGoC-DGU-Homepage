import type { Repositories } from '@/data/repositories'
import { createKeywordSearch } from '@/services/search/keywordSearch'
import { ARCHIVE, PREVIEWS, REVIEWS, SCHEDULE, STATS } from './fixtures'

/** 서버 없이 화면을 만들 때 쓰는 구현. 복사본을 넘겨서 화면이 원본을 바꾸지 못하게 한다. */
export function createMockRepositories(): Repositories {
  return {
    schedule: { list: async () => SCHEDULE.map((e) => ({ ...e })) },
    projects: { list: async () => [] },
    seminars: { list: async () => [] },
    stats: { list: async () => STATS.map((s) => ({ ...s })) },
    previews: { latest: async (place, limit) => PREVIEWS[place].slice(0, limit).map((p) => ({ ...p })) },
    reviews: { list: async () => REVIEWS.map((r) => ({ ...r })) },
    search: createKeywordSearch(ARCHIVE),
  }
}
