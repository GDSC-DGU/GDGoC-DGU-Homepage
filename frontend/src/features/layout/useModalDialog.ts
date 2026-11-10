import { useEffect, useRef, type RefObject } from 'react'

/** 초점을 돌려줄 수 있는 자리인지: 문서에 있고, 닫힌 <dialog> 안이 아니고, 화면에 그려져 있다 */
function canTakeFocus(el: HTMLElement | null | undefined): el is HTMLElement {
  if (!el?.isConnected) return false
  if (el.closest('dialog:not([open])')) return false
  return el.getClientRects().length > 0
}

/**
 * open 값에 맞춰 <dialog> 를 showModal / close 한다.
 * showModal 이라 바깥은 inert 가 되어 초점이 창 안에만 돈다. Esc 는 브라우저가 닫는다.
 * 닫힐 때(어떤 방법이든) 열기 전에 초점이 있던 곳으로 돌려준다.
 * 그곳이 이미 닫힌 다른 창 안이면(폰 메뉴 → 검색 → Esc) fallbacks 가운데 화면에 보이는 첫 요소로 돌려준다.
 */
export function useModalDialog(open: boolean, initialFocus?: RefObject<HTMLElement | null>, fallbacks: readonly RefObject<HTMLElement | null>[] = []) {
  const ref = useRef<HTMLDialogElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)
  /** 이번에 닫을 때는 초점을 옮기지 않는다 (forgetFocus) */
  const skipRestore = useRef(false)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      skipRestore.current = false
      d.showModal()
      initialFocus?.current?.focus()
    } else if (!open && d.open) {
      d.close()
    }
  }, [open, initialFocus])

  /** dialog 의 onClose 에서 부른다 */
  const restoreFocus = () => {
    const back = returnTo.current
    returnTo.current = null
    if (skipRestore.current) {
      skipRestore.current = false
      return
    }
    const target = canTakeFocus(back) ? back : fallbacks.map((f) => f.current).find(canTakeFocus)
    target?.focus({ preventScroll: true })
  }

  /** 초점을 돌려주지 않고 닫을 때 (검색 결과를 골라 다른 곳이 초점을 가져갈 때) */
  const forgetFocus = () => {
    returnTo.current = null
    skipRestore.current = true
  }

  return { ref, restoreFocus, forgetFocus }
}
