import { useEffect } from 'react'

/**
 * 작성 중인 내용이 있으면 탭 닫기 · 새로고침 전에 브라우저가 한 번 묻는다.
 * 화면 안 [취소]는 화면이 직접 확인 팝업을 띄운다 ('작성 중인 내용이 사라집니다.', F-TEM-005 4).
 * 사이드바 메뉴로 옮기는 것은 막지 않는다: 막으려면 react-router 의 useBlocker 가 필요한데,
 * 공개 사이트가 쓰지 않는 부품이라 공개 페이지 첫 JS 가 커진다 (docs/ADMIN.md '번들').
 */
export function useLeaveGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
}
