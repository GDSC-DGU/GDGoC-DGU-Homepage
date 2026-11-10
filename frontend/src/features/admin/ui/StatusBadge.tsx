import type { ReactNode } from 'react'
import { IconAlert, IconCheckCircle, IconLock, IconMinusCircle, IconPending, IconXCircle } from './icons'
import s from './layout.module.css'

/**
 * 상태 배지: 글자 + 모양 (색만으로 구분하지 않는다, BRIEF). 장소색(구글 4색)은 쓰지 않는다.
 *
 * | tone    | 모양       | 쓰는 곳 (예)                                         |
 * |---------|------------|------------------------------------------------------|
 * | success | 채운 체크  | 발송 완료 · 설정 완료 · 활성 · 공개 · 서류 합격 · 최종 합격 |
 * | danger  | 채운 엑스  | 발송 실패 · 산정 실패 · 서류 불합격 · 면접 불합격       |
 * | warning | 세모 느낌표 | 링크 만료 · 면접 일정 미정                            |
 * | pending | 점선 원    | 분석 중 · 대기 · 미정 · 초기화됨                      |
 * | locked  | 자물쇠     | 잠김 (계정 · 결과)                                    |
 * | muted   | 빼기 원    | 비활성 · 비공개                                      |
 * | neutral | 없음       | 분류 · 관리 유형처럼 상태가 아닌 이름표               |
 *
 *   <StatusBadge tone="danger">발송 실패</StatusBadge>
 */
export type BadgeTone = 'success' | 'danger' | 'warning' | 'pending' | 'locked' | 'muted' | 'neutral'

const ICON: Record<BadgeTone, ((p: { className?: string }) => ReactNode) | null> = {
  success: IconCheckCircle,
  danger: IconXCircle,
  warning: IconAlert,
  pending: IconPending,
  locked: IconLock,
  muted: IconMinusCircle,
  neutral: null,
}

export function StatusBadge({ tone, children, title }: { tone: BadgeTone; children: ReactNode; title?: string }) {
  const Icon = ICON[tone]
  return (
    <span className={s.badge} data-tone={tone} title={title}>
      {Icon && <Icon />}
      {children}
    </span>
  )
}
