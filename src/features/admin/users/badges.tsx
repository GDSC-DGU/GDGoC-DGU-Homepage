import type { UserRow } from '../data/users/types'
import { StatusBadge, formatDate, formatDateTime } from '../ui'
import s from './users.module.css'

/**
 * PIN 설정 상태 (F-AMB-001 3): 설정 완료 / 대기 / 초기화됨.
 * 대기 · 초기화됨은 링크 만료 여부를 함께 (만료면 '링크 만료', 아니면 언제까지), 메일 발송 실패면 '발송 실패' (F-AMB-011 2).
 */
export function PinStatusBadges({ row, showUntil = true }: { row: UserRow; showUntil?: boolean }) {
  if (row.pinStatus === 'set') return <StatusBadge tone="success">설정 완료</StatusBadge>
  const until = !row.pinLinkExpired && row.pinLinkExpiresAt && !row.pinMailFailed && showUntil
  return (
    <span className={s.badges}>
      <StatusBadge tone="pending">{row.pinStatus === 'pending' ? '대기' : '초기화됨'}</StatusBadge>
      {row.pinMailFailed ? (
        <StatusBadge tone="danger">발송 실패</StatusBadge>
      ) : row.pinLinkExpired ? (
        <StatusBadge tone="warning">링크 만료</StatusBadge>
      ) : null}
      {until && (
        <span className={s.sub}>
          링크 <span className="num">{formatDateTime(row.pinLinkExpiresAt!).slice(5)}</span>까지
        </span>
      )}
    </span>
  )
}

/** 계정 상태 (F-AMB-001 4): 활성 / 비활성 / 잠김. 비활성은 개인정보 삭제 예정일(F-SYS-005)도 */
export function AccountStatusBadge({ row, showPurge = true }: { row: UserRow; showPurge?: boolean }) {
  if (row.status === 'locked') return <StatusBadge tone="locked">잠김</StatusBadge>
  if (row.status === 'inactive')
    return (
      <span className={s.badges}>
        <StatusBadge tone="muted">비활성</StatusBadge>
        {showPurge && row.purgeAt && (
          <span className={s.sub}>
            <span className="visually-hidden">개인정보 </span>
            <span className="num">{formatDate(row.purgeAt)}</span> 삭제 예정
          </span>
        )}
      </span>
    )
  return <StatusBadge tone="success">활성</StatusBadge>
}
