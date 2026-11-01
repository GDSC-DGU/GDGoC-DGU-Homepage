import { useCallback, useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { Button } from './Button'
import type { ConfirmText } from './confirmText'
import { IconClose } from './icons'
import s from './overlay.module.css'

const FOCUSABLE = 'input:not([type="hidden"]):not([disabled]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

/** 초점을 돌려줄 수 있는 곳인지 (문서에 있고, 닫힌 팝업 안이 아니고, 보임) */
function canTakeFocus(el: HTMLElement | null): el is HTMLElement {
  if (!el?.isConnected) return false
  if (el.closest('dialog:not([open])')) return false
  return el.getClientRects().length > 0
}

export interface DialogProps {
  open: boolean
  /** Esc · [닫기] · [취소]로 닫을 때. dismissible=false 면 부르지 않는다 */
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  /** 아래 버튼 줄 (오른쪽 정렬: [취소] [주 행동]) */
  footer?: ReactNode
  /** 버튼 줄 왼쪽 (삭제 · 보조 안내) */
  footerStart?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /**
   * false 면 닫을 수 없는 팝업 (P-ACM-04 비밀번호 변경: '닫을 수 없음, [로그아웃]만').
   * Esc 를 막고, 브라우저가 억지로 닫으면 다시 연다. [닫기] 버튼도 없다.
   */
  dismissible?: boolean
  /** 열릴 때 초점을 줄 곳. 없으면 본문의 첫 입력 칸 · 버튼 */
  initialFocus?: RefObject<HTMLElement | null>
  /** <form> 으로 감싸서 Enter 로 제출 (footer 의 type="submit" 버튼) */
  onSubmit?: () => void
}

/**
 * 팝업: 진짜 <dialog> + showModal. 바깥은 inert(초점 가두기), Esc 로 닫힘, 닫히면 연 버튼으로 초점이 돌아간다.
 * 제목(h2)이 팝업 이름(aria-labelledby), 설명이 aria-describedby.
 * 팝업 안 오류는 토스트가 아니라 팝업 안 글로 보여 준다 (팝업이 열린 동안 바깥 알림은 화면 읽기가 못 읽는다).
 *
 *   <Dialog open={open} onClose={() => setOpen(false)} title="리뷰 추가" size="md" onSubmit={save}
 *     footer={<><Button variant="secondary" onClick={() => setOpen(false)}>취소</Button><Button type="submit" busy={saving}>저장</Button></>}>
 *     <TextField label="이름" required … />
 *   </Dialog>
 */
export function Dialog({ open, onClose, title, description, children, footer, footerStart, size = 'md', dismissible = true, initialFocus, onSubmit }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const footRef = useRef<HTMLDivElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descId = useId()

  const restore = useCallback(() => {
    const back = returnTo.current
    returnTo.current = null
    if (canTakeFocus(back)) back.focus({ preventScroll: true })
    else document.getElementById('admin-main')?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      d.showModal()
      const target = initialFocus?.current ?? bodyRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? footRef.current?.querySelector<HTMLElement>('button:not([disabled])')
      target?.focus()
    } else if (!open && d.open) {
      d.close()
    }
  }, [open, initialFocus])

  // 열린 채로 화면을 떠나 팝업이 사라질 때도 초점을 돌려준다.
  // 문서에서 빠졌을 때만 (개발 모드 StrictMode 의 '가짜 언마운트'에서는 그대로 둔다: 돌려줄 곳을 잃지 않게)
  useEffect(() => {
    const d = ref.current
    return () => {
      if (returnTo.current && !d?.isConnected) restore()
    }
  }, [restore])

  // 닫힘 이벤트 (Esc · d.close()). 핸들러는 렌더마다 새로 붙어 지금 props 를 본다
  const onDialogClose = () => {
    if (open && !dismissible) {
      // 닫을 수 없는 팝업을 브라우저가 닫았으면(Esc 두 번 등) 다시 연다
      ref.current?.showModal()
      return
    }
    restore()
    if (open) onClose()
  }

  const content = (
    <>
      <div className={s.head}>
        <div className={s.headText}>
          <h2 id={titleId} className={s.title}>
            {title}
          </h2>
          {description && (
            <p id={descId} className={s.desc}>
              {description}
            </p>
          )}
        </div>
        {dismissible && (
          <button type="button" className={s.close} aria-label="닫기" onClick={() => onClose()}>
            <IconClose />
          </button>
        )}
      </div>
      {children !== undefined && (
        <div ref={bodyRef} className={s.body}>
          {children}
        </div>
      )}
      {(footer || footerStart) && (
        <div ref={footRef} className={s.foot}>
          {footerStart && <div className={s.footStart}>{footerStart}</div>}
          {footer}
        </div>
      )}
    </>
  )

  return (
    <dialog
      ref={ref}
      className={`${s.dialog} ${s[size]}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        if (!dismissible) e.preventDefault()
      }}
      onClose={onDialogClose}
    >
      {onSubmit ? (
        <form
          style={{ display: 'contents' }}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          {content}
        </form>
      ) : (
        content
      )}
    </dialog>
  )
}

/**
 * 확인 팝업 (삭제 · 비활성화 · 발송 …). 문구는 ui/confirmText.ts 규칙을 따른다.
 * 열리면 [취소]에 초점 (되돌리기 어려운 일을 Enter 한 번으로 하지 않게).
 *
 *   <ConfirmDialog open={!!target} {...deleteConfirm('게시글', ids.length, '삭제한 게시글은 홈페이지 목록에서 사라집니다.')}
 *     busy={removing} onConfirm={remove} onCancel={() => setTarget(null)} />
 * 간단히는 useConfirm() (ConfirmProvider 가 하나를 띄운다).
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  tone = 'default',
  busy,
  onConfirm,
  onCancel,
  children,
}: ConfirmText & { open: boolean; busy?: boolean; onConfirm: () => void; onCancel: () => void; children?: ReactNode }) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      size="sm"
      title={title}
      description={body}
      initialFocus={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={busy}>
            취소
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} busy={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  )
}
