import { useQuery } from '@tanstack/react-query'
import type { PreviewPlace } from './repositories'
import { useRepositories } from './useRepositories'

/**
 * 서버 데이터 훅 (TanStack Query).
 * - 같은 key 는 한 번만 부르고 결과를 나눠 쓴다 (일정은 첫 화면 · 캘린더가 같이 씀)
 * - isPending(불러오는 중) · isError(실패) 를 화면이 구분해서 그린다. 빈 목록과 헷갈리지 않게
 * 실제 데이터는 Repository 가 가져오므로, mock ↔ http 를 바꿔도 이 파일은 그대로다.
 */
export const queryKeys = {
  schedule: ['schedule'] as const,
  projects: ['projects'] as const,
  seminars: ['seminars'] as const,
  stats: ['stats'] as const,
  previews: (place: PreviewPlace, limit: number) => ['previews', place, limit] as const,
  reviews: ['reviews'] as const,
}

export function useSchedule() {
  const repos = useRepositories()
  return useQuery({ queryKey: queryKeys.schedule, queryFn: () => repos.schedule.list() })
}

export function useProjects() {
  const repos = useRepositories()
  return useQuery({ queryKey: queryKeys.projects, queryFn: () => repos.projects.list() })
}

export function useSeminars() {
  const repos = useRepositories()
  return useQuery({ queryKey: queryKeys.seminars, queryFn: () => repos.seminars.list() })
}

export function useStats() {
  const repos = useRepositories()
  return useQuery({ queryKey: queryKeys.stats, queryFn: () => repos.stats.list() })
}

export function usePreviews(place: PreviewPlace | null, limit: number) {
  const repos = useRepositories()
  return useQuery({
    queryKey: queryKeys.previews(place ?? 'community', limit),
    queryFn: () => repos.previews.latest(place ?? 'community', limit),
    enabled: place !== null,
  })
}

export function useReviews() {
  const repos = useRepositories()
  return useQuery({ queryKey: queryKeys.reviews, queryFn: () => repos.reviews.list() })
}
