import { createContext, useContext } from 'react'
import type { ConfirmText } from './confirmText'

/** 토스트 (상태 변경 알림, aria-live). ToastProvider 가 관리자 화면 전체에 하나 */
export interface ToastApi {
  /** 성공 · 안내: 5초 뒤 사라짐 (마우스 · 초점이 있으면 멈춤), role=status */
  success: (message: string) => void
  info: (message: string) => void
  /** 실패: 닫을 때까지 남음, role=alert. 문장에 이유와 다음 행동을 담는다 */
  error: (message: string) => void
}

/** 확인 팝업을 Promise 로: const ok = await confirm(deleteConfirm('게시글', 3)) */
export type ConfirmFn = (text: ConfirmText) => Promise<boolean>

export const ToastContext = createContext<ToastApi | null>(null)
export const ConfirmContext = createContext<ConfirmFn | null>(null)

/**
 *   const toast = useToast()
 *   toast.success(doneMessage('게시글', 3, '삭제'))   // '게시글 3개를 삭제했습니다.'
 *   toast.error(errorMessage(e))
 */
export function useToast(): ToastApi {
  const t = useContext(ToastContext)
  if (!t) throw new Error('ToastProvider 안에서만 쓸 수 있습니다')
  return t
}

/**
 *   const confirm = useConfirm()
 *   if (!(await confirm(deleteConfirm('댓글', ids.length)))) return
 */
export function useConfirm(): ConfirmFn {
  const c = useContext(ConfirmContext)
  if (!c) throw new Error('ConfirmProvider 안에서만 쓸 수 있습니다')
  return c
}
