import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ConfirmDialog } from './Dialog'
import type { ConfirmText } from './confirmText'
import { ConfirmContext, ToastContext, type ConfirmFn, type ToastApi } from './feedback'
import { IconCheckCircle, IconClose, IconErrorMark, IconInfo } from './icons'
import s from './overlay.module.css'

type Tone = 'success' | 'info' | 'error'
interface Toast {
  id: number
  tone: Tone
  message: string
}

const AUTO_HIDE_MS = 5000

function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: number) => void }) {
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (toast.tone === 'error' || paused) return
    const timer = window.setTimeout(() => onClose(toast.id), AUTO_HIDE_MS)
    return () => window.clearTimeout(timer)
  }, [toast.id, toast.tone, paused, onClose])
  const Icon = toast.tone === 'error' ? IconErrorMark : toast.tone === 'success' ? IconCheckCircle : IconInfo
  return (
    <div className={s.toast} data-tone={toast.tone} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <Icon />
      <p className={s.toastText}>{toast.message}</p>
      <button type="button" className={s.toastClose} aria-label="알림 닫기" onClick={() => onClose(toast.id)}>
        <IconClose />
      </button>
    </div>
  )
}

/**
 * 토스트 + 확인 팝업 제공자 (관리자 화면 맨 바깥에 하나, AdminRoot).
 * 알림 칸 두 개(role=status · role=alert)는 처음부터 문서에 있어서, 안에 생긴 문장을 화면 읽기가 바로 읽는다.
 */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)
  const push = useCallback((tone: Tone, message: string) => {
    const id = ++seq.current
    // 같은 문장이 쌓이지 않게, 최대 3개
    setToasts((prev) => [...prev.filter((t) => t.message !== message), { id, tone, message }].slice(-3))
  }, [])
  const close = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), [])
  const toastApi = useMemo<ToastApi>(() => ({ success: (m) => push('success', m), info: (m) => push('info', m), error: (m) => push('error', m) }), [push])

  const [pending, setPending] = useState<(ConfirmText & { resolve: (ok: boolean) => void }) | null>(null)
  const [open, setOpen] = useState(false)
  const confirm = useCallback<ConfirmFn>(
    (text) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...text, resolve })
        setOpen(true)
      }),
    [],
  )
  const settle = (ok: boolean) => {
    pending?.resolve(ok)
    setOpen(false)
  }

  const polite = toasts.filter((t) => t.tone !== 'error')
  const assertive = toasts.filter((t) => t.tone === 'error')

  return (
    <ToastContext.Provider value={toastApi}>
      <ConfirmContext.Provider value={confirm}>
        {children}
        {pending && <ConfirmDialog open={open} title={pending.title} body={pending.body} confirmLabel={pending.confirmLabel} tone={pending.tone} onConfirm={() => settle(true)} onCancel={() => settle(false)} />}
        <div className={s.toasts}>
          <div role="status" className={s.toastRegion}>
            {polite.map((t) => (
              <ToastItem key={t.id} toast={t} onClose={close} />
            ))}
          </div>
          <div role="alert" className={s.toastRegion}>
            {assertive.map((t) => (
              <ToastItem key={t.id} toast={t} onClose={close} />
            ))}
          </div>
        </div>
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  )
}
