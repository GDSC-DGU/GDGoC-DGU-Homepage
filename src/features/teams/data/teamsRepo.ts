import { createContext, useContext } from 'react'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { PROTOTYPE } from '@/config/site'
import type { TeamsRepository } from './repository'
import { createSampleTeamsRepository } from './sampleRepository'
import type { Credentials, ListQuery, PostInput, PostUpdate } from './types'

/**
 * 백엔드 API 가 생기기 전에는 예시 저장소(sampleRepository: 이 탭의 메모리, 새로고침하면 처음으로)를 쓴다.
 * TEAMS_SAMPLE 이면 화면 위에 '예시 화면' 안내가 붙고 머리 안내판이 '준비 중'을 말한다.
 * 프로토타입 보기(config/site.ts 의 PROTOTYPE: 개발 화면 · 휴대폰 미리보기)에서는 운영 중인 것처럼 안내 없이 보인다.
 * 백엔드가 생기면: http 구현을 만들어 아래 TEAMS_REPO 를 바꾸고, TEAMS_SAMPLE 을 false 로.
 */
export const TEAMS_SAMPLE = !PROTOTYPE

const TEAMS_REPO: TeamsRepository = createSampleTeamsRepository()

/** 테스트는 Provider 로 가짜 구현을 넣는다 */
export const TeamsRepoContext = createContext<TeamsRepository>(TEAMS_REPO)
export const useTeamsRepo = () => useContext(TeamsRepoContext)

export const teamsKeys = {
  all: ['teams'] as const,
  list: (q: ListQuery) => ['teams', 'list', q] as const,
  summary: ['teams', 'summary'] as const,
  post: (id: string) => ['teams', 'post', id] as const,
  comments: (id: string) => ['teams', 'comments', id] as const,
}

/** 게시판은 자주 바뀌어서 30초가 지나면 다시 부른다 (전역 기본 5분) */
const FRESH = 30_000

export function useTeamsList(q: ListQuery) {
  const repo = useTeamsRepo()
  return useQuery({ queryKey: teamsKeys.list(q), queryFn: () => repo.list(q), staleTime: FRESH, placeholderData: keepPreviousData })
}

export function useTeamsSummary() {
  const repo = useTeamsRepo()
  return useQuery({ queryKey: teamsKeys.summary, queryFn: () => repo.summary(), staleTime: FRESH })
}

export function useAdjacent(id: string, enabled = true) {
  const repo = useTeamsRepo()
  return useQuery({ queryKey: ['teams', 'adjacent', id] as const, queryFn: () => repo.adjacent(id), staleTime: FRESH, enabled })
}

export function useTeamPost(id: string) {
  const repo = useTeamsRepo()
  return useQuery({ queryKey: teamsKeys.post(id), queryFn: () => repo.get(id), staleTime: FRESH, retry: false })
}

export function useTeamComments(id: string, enabled = true) {
  const repo = useTeamsRepo()
  return useQuery({ queryKey: teamsKeys.comments(id), queryFn: () => repo.comments(id), staleTime: FRESH, enabled })
}

/** 쓰기 뒤에는 게시판 쿼리를 모두 다시 부른다 (목록 · 숫자 · 글 · 댓글). 기다리지 않는다: 화면이 먼저 다음 주소로 옮겨 간다 */
function useTeamsMutation<A, R>(fn: (repo: TeamsRepository, args: A) => Promise<R>) {
  const repo = useTeamsRepo()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: A) => fn(repo, args),
    onSuccess: () => void qc.invalidateQueries({ queryKey: teamsKeys.all }),
  })
}

export const useCreatePost = () => useTeamsMutation((r, a: { input: PostInput; cred: Credentials }) => r.create(a.input, a.cred))
export const useUpdatePost = () => useTeamsMutation((r, a: { id: string; input: PostUpdate; cred: Credentials }) => r.update(a.id, a.input, a.cred))
export const useRemovePost = () => useTeamsMutation((r, a: { id: string; cred: Credentials }) => r.remove(a.id, a.cred))
export const useAddComment = () => useTeamsMutation((r, a: { postId: string; content: string; cred: Credentials }) => r.addComment(a.postId, a.content, a.cred))

/**
 * 본인 확인에서 넣은 학번 · PIN 을 수정 화면이 열려 있는 동안만 메모리에 둔다 (P-COM-03 2).
 * 브라우저 저장소 · 주소에 남기지 않는다. 새로고침하면 사라져 다시 본인 확인을 거친다.
 */
const held = new Map<string, Credentials>()
export const heldCredentials = {
  set: (postId: string, cred: Credentials) => void held.set(postId, cred),
  get: (postId: string) => held.get(postId) ?? null,
  clear: (postId: string) => void held.delete(postId),
}
