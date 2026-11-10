import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'
import { useConfirm } from '../ui'

/** 떠나기 확인 문구 (화면 안 [취소]와 같은 팝업, F-TEM-005 4) */
export const LEAVE_CONFIRM = { title: '작성을 그만둘까요?', body: '작성 중인 내용이 사라집니다.', confirmLabel: '나가기', tone: 'danger' } as const

/**
 * 작성 중인 내용이 있으면 떠나기 전에 묻는다 (공개 팀원 찾기 글쓰기와 같은 방식).
 * - 사이드바 메뉴 · 뒤로 가기 등 관리자 화면 안 이동: 라우터가 멈추고 '작성 중인 내용이 사라집니다.' 확인 팝업
 * - 탭 닫기 · 새로고침: 브라우저 기본 확인
 * 화면이 직접 옮길 때(확인한 [취소] · 게시 성공)는 allow() 를 먼저 부른다 (한 번 더 묻지 않게).
 */
export function useLeaveGuard(dirty: boolean) {
  const confirm = useConfirm()
  const allowed = useRef(false)
  const asking = useRef(false)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !allowed.current && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search))

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  useEffect(() => {
    if (blocker.state !== 'blocked' || asking.current) return
    asking.current = true
    void confirm(LEAVE_CONFIRM).then((ok) => {
      asking.current = false
      if (ok) {
        allowed.current = true
        blocker.proceed()
      } else blocker.reset()
    })
  }, [blocker, confirm])

  return {
    /** 화면이 직접 옮기기 전에: 이번 이동은 묻지 않는다 */
    allow: () => {
      allowed.current = true
    },
  }
}
