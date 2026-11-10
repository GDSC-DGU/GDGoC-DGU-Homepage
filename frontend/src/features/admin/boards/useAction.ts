import { useState } from 'react'

/**
 * 저장 · 삭제 같은 한 번의 요청 + 처리 중 표시. TanStack Query 의 useMutation 대신 쓴다:
 * 관리자 코드가 useMutation 을 부르면 빌드가 react-query 공통 부분을 공개 페이지와 같이 받는 새 파일로 떼어 내
 * 공개 페이지 첫 JS 가 늘고 요청이 하나 는다 (2026-11-01 확인, NOTES.md). 저장 뒤 목록 새로 고침은 store 알림이 한다.
 *   const remove = useAction((ids: string[]) => repos.boards.deletePosts(board, ids))
 *   await remove.run(ids)  ·  <Button busy={remove.pending}>
 */
export function useAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [pending, setPending] = useState(false)
  const run = async (...args: A): Promise<R> => {
    setPending(true)
    try {
      return await fn(...args)
    } finally {
      setPending(false)
    }
  }
  return { run, pending }
}
