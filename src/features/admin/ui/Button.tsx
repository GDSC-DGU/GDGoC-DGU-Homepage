import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import s from './controls.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'lg' | 'md' | 'xs'

function buttonClass(variant: ButtonVariant, size: ButtonSize, block?: boolean, extra?: string) {
  const base = variant === 'secondary' || variant === 'ghost' ? 'btn-secondary' : 'btn-primary'
  return [base, size === 'md' && 'btn-sm', size === 'xs' && s.xs, variant === 'danger' && s.danger, variant === 'ghost' && s.ghost, block && s.block, s.btn, extra].filter(Boolean).join(' ')
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary: 화면의 주 행동 하나 · secondary: 그 밖 · danger: 확인 팝업의 되돌리기 어려운 행동 · ghost: 테두리 없는 작은 행동 */
  variant?: ButtonVariant
  /** lg 52 (로그인) · md 40 (기본) · xs 32 (표 안 행 버튼) */
  size?: ButtonSize
  block?: boolean
  /** 처리 중: 글자 앞에 도는 표시, 누를 수 없음 */
  busy?: boolean
  /**
   * 권한 등으로 막혔을 때 이유 (permissions.ts 의 reason).
   * disabled 대신 aria-disabled 로 막아서 키보드 초점이 닿고, 화면 읽기가 이유를 읽는다 (마우스는 title 로 본다).
   */
  disabledReason?: string
  children: ReactNode
}

/**
 * 관리자 버튼. 전역 시안 E 버튼(.btn-primary · .btn-secondary)을 관리자 밀도로 쓴다.
 *   <Button onClick={save} busy={saving}>저장</Button>
 *   <Button variant="secondary" size="xs" onClick={() => edit(row)}>수정</Button>
 *   <Button variant="secondary" disabledReason={can.allowed ? undefined : can.reason}>잠금 해제</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', block, busy, disabledReason, className, type = 'button', onClick, children, title, disabled, 'aria-describedby': describedBy, ...rest },
  ref,
) {
  const reasonId = useId()
  const blocked = !!disabledReason
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      className={buttonClass(variant, size, block, className)}
      aria-busy={busy || undefined}
      aria-disabled={blocked || undefined}
      aria-describedby={blocked ? [describedBy, reasonId].filter(Boolean).join(' ') : describedBy}
      title={blocked ? disabledReason : title}
      disabled={disabled || busy}
      onClick={blocked ? (e) => e.preventDefault() : onClick}
    >
      {busy && <span className={s.spinner} aria-hidden="true" />}
      {children}
      {blocked && (
        <span id={reasonId} className="visually-hidden">
          {disabledReason}
        </span>
      )}
    </button>
  )
})

/** 버튼 모양 링크 (사이트 안 이동: 글쓰기 · 등록 화면으로) */
export function ButtonLink({ variant = 'primary', size = 'md', block, className, ...rest }: LinkProps & { variant?: Exclude<ButtonVariant, 'danger'>; size?: ButtonSize; block?: boolean }) {
  return <Link className={buttonClass(variant, size, block, className)} {...rest} />
}
