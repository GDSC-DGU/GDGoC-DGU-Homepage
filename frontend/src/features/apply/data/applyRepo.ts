import { createContext, useContext } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { APPLY_FORM_LIVE } from '@/config/site'
import { createHttpApplyRepository } from './httpRepository'
import type { ApplyRepository } from './repository'
import { createSampleApplyRepository } from './sampleRepository'
import type { ApplicationRequest } from './types'

/**
 * 지원서 API 를 어디서 받을지.
 *  - APPLY_FORM_LIVE (config/site.ts) 가 true 면 실제 API (httpRepository: docs/api/openapi.yaml 의 /api/v1/recruitments/...)
 *  - false 면 예시 저장소 (sampleRepository: 이 탭의 메모리). 화면 위에 '예시' 안내가 붙고, 제출해도 접수되지 않는다.
 * 백엔드 RCT-001 · 002 · 003 · 005 가 배포되면 APPLY_FORM_LIVE 를 true 로 바꾸면 된다 (코드 다른 곳은 그대로).
 */
export const APPLY_SAMPLE = !APPLY_FORM_LIVE

const APPLY_REPO: ApplyRepository = APPLY_FORM_LIVE ? createHttpApplyRepository(import.meta.env.VITE_API_BASE ?? '/api') : createSampleApplyRepository()

/** 테스트는 Provider 로 가짜 구현을 넣는다 */
export const ApplyRepoContext = createContext<ApplyRepository>(APPLY_REPO)
export const useApplyRepo = () => useContext(ApplyRepoContext)

export const applyKeys = {
  all: ['apply'] as const,
  current: ['apply', 'current'] as const,
  form: (rid: string) => ['apply', 'form', rid] as const,
}

/** API-RCT-001 현재 모집 안내 */
export function useCurrentRecruitment() {
  const repo = useApplyRepo()
  return useQuery({ queryKey: applyKeys.current, queryFn: () => repo.getCurrent(), staleTime: 60_000, retry: false })
}

/** API-RCT-002 게시된 지원폼 (rid 가 있을 때만) */
export function useApplicationForm(rid: string | undefined) {
  const repo = useApplyRepo()
  return useQuery({ queryKey: applyKeys.form(rid ?? ''), queryFn: () => repo.getForm(rid ?? ''), enabled: !!rid, staleTime: 60_000, retry: false })
}

/** API-RCT-005 제출 */
export function useSubmitApplication(rid: string) {
  const repo = useApplyRepo()
  return useMutation({ mutationFn: (req: ApplicationRequest) => repo.submit(rid, req) })
}
