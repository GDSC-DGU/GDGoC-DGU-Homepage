import type { ReactNode } from 'react'
import { actorLabel } from '../data/common/accounts'
import type { AuditStamp } from '../data/common/types'
import { formatDateTime } from '../ui'

/**
 * 콘텐츠 관리 안에서 같이 쓰는 작은 부품.
 */

/** '마지막 변경 운영진A · Lead · 2026.10.26 14:00' (F-ACT-001 2 · 006 2) */
export function ChangeLine({ stamp, prefix }: { stamp: AuditStamp | null; prefix?: ReactNode }) {
  return (
    <>
      {prefix}
      {stamp ? (
        <>
          마지막 변경 {actorLabel(stamp.by)} · <span className="num">{formatDateTime(stamp.at)}</span>
        </>
      ) : (
        '변경 기록 없음'
      )}
    </>
  )
}

/** 리뷰 사진이 없을 때 기본 이미지 (F-ACT-009 3): 사람 모양 실루엣, 꾸밈 */
export function DefaultAvatar() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <rect width="40" height="40" fill="var(--field)" />
      <circle cx="20" cy="16" r="7" fill="var(--line-strong)" />
      <path d="M6 38c1.6-8 7.2-12 14-12s12.4 4 14 12" fill="var(--line-strong)" />
    </svg>
  )
}

/** 더하기 모양 (이미지 추가 버튼) */
export function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconArrow({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d={dir === 'left' ? 'M10 3.5L5.5 8l4.5 4.5' : 'M6 3.5L10.5 8 6 12.5'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
