import type { ApplicantResult, ApplicantScore, MailRecord } from '../data/recruit/types'
import { adminPath } from '../screens'
import { forwardRef, useRef, type ReactNode } from 'react'
import { Button as UiButton, NavTabs, StatusBadge, type ButtonProps } from '../ui'
import { useOverflowX } from '../ui/useOverflowX'
import { RESULT_TONE } from './hooks'
import s from './recruit.module.css'

/** 모집 관리 상태 배지 · 탭 · 팝업 오류 (글자 + 모양, 색만으로 말하지 않는다) */

export function ResultBadge({ result }: { result: ApplicantResult }) {
  return <StatusBadge tone={RESULT_TONE[result]}>{result}</StatusBadge>
}

/** 목록의 점수 칸: 산정 전(대기 · 분석 중)은 '분석 중' (F-ARC-006 1) */
export function ScoreCell({ score, currentVersion }: { score: ApplicantScore; currentVersion: number }) {
  if (score.state === 'done')
    return (
      <span className={s.scoreCell}>
        <span className={`num ${s.scoreNum}`}>{score.total}</span>점
        {score.criteriaVersion !== null && score.criteriaVersion !== currentVersion && (
          <span className={s.oldVersion} title={`평가 기준 v${score.criteriaVersion}로 산정 (지금 v${currentVersion})`}>
            v{score.criteriaVersion}
            <span className="visually-hidden"> 기준으로 산정, 지금 기준은 v{currentVersion}</span>
          </span>
        )}
      </span>
    )
  if (score.state === 'failed') return <StatusBadge tone="danger">산정 실패</StatusBadge>
  return <StatusBadge tone="pending">분석 중</StatusBadge>
}

export function MailBadge({ mail }: { mail: MailRecord | null }) {
  if (!mail)
    return (
      <span className={s.dash} aria-label="메일 없음">
        -
      </span>
    )
  return mail.state === 'sent' ? <StatusBadge tone="success">발송 완료</StatusBadge> : <StatusBadge tone="danger">발송 실패</StatusBadge>
}

export const LockBadge = () => <StatusBadge tone="locked">잠김</StatusBadge>

/** 지원폼 작성의 두 탭 ('지원폼 질문' ↔ '평가 기준', F-ARC-001 2) */
export function FormTabs() {
  return (
    <NavTabs
      label="지원폼 작성"
      items={[
        { to: adminPath.recruitForm, label: '지원폼 질문' },
        { to: adminPath.recruitCriteria, label: '평가 기준' },
      ]}
    />
  )
}

/** 팝업 안 오류 문장 (팝업이 열린 동안 바깥 토스트는 화면 읽기가 못 읽어서, 팝업 안에 글로) */
export function DialogError({ message }: { message: string | null }) {
  return (
    <p className={s.dialogError} role="alert">
      {message}
    </p>
  )
}

const textOf = (n: ReactNode): string => (typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(textOf).join('') : '')

/**
 * 관리자 버튼(ui/Button) 그대로 + 막혔을 때(disabledReason) 이름을 보이는 글자로 고정.
 * ui/Button 은 이유 글자를 버튼 안에 두어 이름이 '저장바뀐 내용이 없습니다.'처럼 섞인다 (사용자 구역 NOTES 4). 이유는 설명(aria-describedby)으로만 읽힌다.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  const text = textOf(props.children)
  return <UiButton ref={ref} {...props} aria-label={props['aria-label'] ?? (props.disabledReason && text ? text : undefined)} />
})

/** 작은 표 상자: 가로로 넘칠 때만 키보드 초점을 받아 ← → 로 넘겨 볼 수 있게 (axe scrollable-region-focusable) */
export function TableBox({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const overflow = useOverflowX(ref)
  return (
    <div
      ref={ref}
      className={`${s.tableBox} ${className ?? ''}`}
      role={overflow ? 'region' : undefined}
      aria-label={overflow ? `${label} (가로로 넘겨 보기)` : undefined}
      tabIndex={overflow ? 0 : undefined}
    >
      {children}
    </div>
  )
}
