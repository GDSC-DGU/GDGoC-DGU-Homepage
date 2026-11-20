import { createContext, useContext } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { APPLY_FORM_LIVE } from '@/config/site'
import type { ApplyRepository } from './repository'
import { createSampleApplyRepository } from './sampleRepository'
import type { ApplicationInput } from './types'

/**
 * 백엔드 API 가 생기기 전에는 예시 저장소(sampleRepository: 이 탭의 메모리)를 쓴다.
 * APPLY_SAMPLE 이면
 *  - 지원서 화면 위에 '예시 지원서' 안내가 붙고, 지원 기간이 아니어도 양식을 보여 준다 (디자인 · 흐름 확인용)
 *  - 사이트의 '지원서 쓰기' 버튼은 이 화면으로 오지 않는다 (content/recruitingStatus.ts 의 applyTarget: 실제 지원자가 예시 양식에 쓰지 않게)
 * 백엔드가 생기면: http 구현을 만들어 아래 APPLY_REPO 를 바꾸고, config/site.ts 의 APPLY_FORM_LIVE 를 true 로.
 */
export const APPLY_SAMPLE = !APPLY_FORM_LIVE

const APPLY_REPO: ApplyRepository = createSampleApplyRepository()

/** 테스트는 Provider 로 가짜 구현을 넣는다 */
export const ApplyRepoContext = createContext<ApplyRepository>(APPLY_REPO)
export const useApplyRepo = () => useContext(ApplyRepoContext)

export const applyKeys = { form: ['apply', 'form'] as const }

export function useApplyForm() {
  const repo = useApplyRepo()
  return useQuery({ queryKey: applyKeys.form, queryFn: () => repo.getForm(), staleTime: 60_000 })
}

export function useSubmitApplication() {
  const repo = useApplyRepo()
  return useMutation({ mutationFn: (input: ApplicationInput) => repo.submit(input) })
}
