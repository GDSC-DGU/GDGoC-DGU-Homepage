import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * 목록 화면의 거르기 · 검색 · 쪽을 주소(?q=&page=)에 둔다.
 * 새로고침 · 수정 화면에서 돌아오기 · 대시보드 링크(?post=)에도 같은 목록이 보이게 (F-TEM-006 3 '목록으로 시 유지').
 * 바꿀 때는 기록을 바꿔치기(replace): 뒤로 가기가 거르기마다 멈추지 않게.
 */
export function useListParams() {
  const [params, setParams] = useSearchParams()
  const get = useCallback((key: string) => params.get(key) ?? '', [params])
  const num = useCallback(
    (key: string) => {
      const n = Number(params.get(key))
      return Number.isInteger(n) && n > 0 ? n : 1
    },
    [params],
  )
  /** 여러 값을 한 번에. 빈 값 · 1쪽은 주소에서 뺀다 */
  const set = useCallback(
    (patch: Record<string, string | number | null>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === '' || (typeof v === 'number' && v <= 1 && /page$/i.test(k))) next.delete(k)
            else next.set(k, String(v))
          }
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )
  return { get, num, set, search: params.toString() }
}
