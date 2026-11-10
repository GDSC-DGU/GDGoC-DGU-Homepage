import { useState, type ReactNode } from 'react'
import { useAdminActor } from '../auth/authContext'
import { errorMessage, useAdminRepos } from '../data'
import { canResetPin } from '../data/permissions'
import { canUnlockWith, PIN_LINK_HOURS } from '../data/users/rules'
import type { MailResult, UserRow } from '../data/users/types'
import { Checkbox, ConfirmDialog, formatDateTime, objectParticle, relativeTime } from '../ui'
import { IconErrorMark } from '../ui/icons'
import { PinStatusBadges } from './badges'
import { lockReasonOf, mailFailedHint } from './display'
import s from './users.module.css'

/** 팝업이 끝나며 목록에 알릴 것 (토스트 + 초점 지키기) */
export interface ActionDone {
  message: string
  tone: 'success' | 'error'
  userId: string
}

function InlineError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className={s.inlineError} role="alert">
      <IconErrorMark />
      <span>{message}</span>
    </p>
  )
}

function TargetFacts({ user, children }: { user: UserRow; children?: ReactNode }) {
  return (
    <dl className={s.facts}>
      <div>
        <dt>대상</dt>
        <dd>
          {user.name} <span className="num">({user.maskedStudentId})</span> · {user.type}
        </dd>
      </div>
      {children}
    </dl>
  )
}

const mailMessage = (name: string, email: string, mail: MailResult, what: string) =>
  mail === 'sent' ? `${what} 재설정 링크를 ${email} 주소로 보냈습니다.` : `${what} 하지만 ${name}에게 재설정 메일을 보내지 못했습니다. ${mailFailedHint}`

/**
 * PIN 초기화 확인 (P-AMB-04, Figma 07-3-3, F-AMB-012).
 * [초기화]하면 기존 PIN 은 바로 무효, 사용자 이메일로 재설정 링크(72시간 · 1회) 발송 흉내, 상태는 '초기화됨'. 잠긴 계정이면 잠금도 함께 해제.
 */
export function PinResetDialog({ user, open, onClose, onDone }: { user: UserRow; open: boolean; onClose: () => void; onDone: (d: ActionDone) => void }) {
  const repos = useAdminRepos()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await repos.users.resetPin(user.id)
      const what = `${user.name}의 PIN을 초기화했습니다.${user.status === 'locked' ? ' 잠금도 함께 해제했습니다.' : ''}`
      onDone({ message: mailMessage(user.name, user.email, r.mail, what), tone: r.mail === 'sent' ? 'success' : 'error', userId: user.id })
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <ConfirmDialog
      open={open}
      title={`${user.name}의 PIN을 초기화할까요?`}
      body="기존 PIN은 바로 쓸 수 없게 되고, 사용자 이메일로 PIN 재설정 링크를 보냅니다. 새 PIN을 설정하기 전에는 게시글 · 댓글을 쓸 수 없습니다."
      confirmLabel="초기화"
      tone="danger"
      busy={busy}
      onConfirm={() => void run()}
      onCancel={onClose}
    >
      <InlineError message={error} />
      <TargetFacts user={user}>
        <div>
          <dt>받는 주소</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>재설정 링크</dt>
          <dd>{PIN_LINK_HOURS}시간 동안 한 번만 쓸 수 있습니다</dd>
        </div>
      </TargetFacts>
      {user.status === 'locked' && <p className={s.note}>잠긴 계정이라 초기화하면서 잠금도 함께 해제합니다.</p>}
    </ConfirmDialog>
  )
}

/**
 * 계정 잠금 해제 (P-AMB-05, Figma 07-3-4, F-AMB-015).
 * [잠금 해제]하면 잠금이 풀리고 실패 횟수 0. 'PIN도 초기화하기'를 고르면 F-AMB-012 와 같은 규칙으로 함께 초기화 (재설정 메일).
 */
export function UnlockDialog({ user, open, onClose, onDone }: { user: UserRow; open: boolean; onClose: () => void; onDone: (d: ActionDone) => void }) {
  const repos = useAdminRepos()
  const actor = useAdminActor()
  const [resetPin, setResetPin] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pinAllowed = canResetPin(actor, user).allowed && user.pinStatus === 'set'
  const run = async () => {
    const d = canUnlockWith(actor, user, resetPin && pinAllowed)
    if (!d.allowed) return setError(d.reason)
    setBusy(true)
    setError(null)
    try {
      const r = await repos.users.unlock(user.id, { resetPin: resetPin && pinAllowed })
      const what = `${user.name}의 잠금을 해제했습니다.`
      onDone(r.mail ? { message: mailMessage(user.name, user.email, r.mail, `${what} PIN도 초기화했습니다.`), tone: r.mail === 'sent' ? 'success' : 'error', userId: user.id } : { message: what, tone: 'success', userId: user.id })
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <ConfirmDialog
      open={open}
      title={`${user.name}의 잠금을 해제할까요?`}
      body="잠금을 풀고 인증 실패 횟수를 0으로 초기화합니다. 해제하면 바로 다시 인증할 수 있습니다."
      confirmLabel="잠금 해제"
      tone="danger"
      busy={busy}
      onConfirm={() => void run()}
      onCancel={onClose}
    >
      <InlineError message={error} />
      <TargetFacts user={user}>
        <div>
          <dt>잠긴 까닭</dt>
          <dd>{lockReasonOf(user)}</dd>
        </div>
        {user.lockedAt && (
          <div>
            <dt>잠긴 시각</dt>
            <dd>
              <span className="num">{formatDateTime(user.lockedAt)}</span> ({relativeTime(user.lockedAt)})
            </dd>
          </div>
        )}
        <div>
          <dt>PIN 설정 상태</dt>
          <dd>
            <PinStatusBadges row={user} showUntil={false} />
          </dd>
        </div>
      </TargetFacts>
      {pinAllowed ? (
        <Checkbox
          label="PIN도 초기화하기"
          description={`기존 PIN은 바로 쓸 수 없게 되고, ${user.email} 주소로 재설정 링크(${PIN_LINK_HOURS}시간 · 1회 유효)를 보냅니다.`}
          checked={resetPin}
          onChange={(e) => setResetPin(e.target.checked)}
        />
      ) : (
        <p className={s.note}>{user.pinStatus === 'set' ? 'PIN 초기화는 Lead만 할 수 있는 계정입니다.' : 'PIN을 아직 설정하지 않은 사용자라 함께 초기화할 PIN이 없습니다. 필요하면 목록의 [링크 재발송]을 써 주세요.'}</p>
      )}
    </ConfirmDialog>
  )
}

/**
 * 선택 비활성화 확인 (F-AMB-004). 규칙에 걸리는 사람(자기 자신 · Core 가 고른 Lead · Core · 마지막 활성 Lead)은 빼고, 왜 빠지는지 보여 준다.
 */
export function DeactivateDialog({
  allowed,
  excluded,
  open,
  onClose,
  onDone,
}: {
  allowed: UserRow[]
  excluded: { user: UserRow; reason: string }[]
  open: boolean
  onClose: () => void
  onDone: (r: { changed: number; skipped: { name: string; reason: string }[] }) => void
}) {
  const repos = useAdminRepos()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await repos.users.setStatus(
        allowed.map((u) => u.id),
        'inactive',
      )
      onDone({ changed: r.changed, skipped: [...excluded.map((x) => ({ name: x.user.name, reason: x.reason })), ...r.skipped] })
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  const n = allowed.length
  return (
    <ConfirmDialog
      open={open}
      title={n === 1 ? `${allowed[0].name}${objectParticle(allowed[0].name)} 비활성화할까요?` : `선택한 ${n}명의 사용자를 비활성화할까요?`}
      body="비활성 사용자는 관리자 로그인과 학번 인증이 모두 막힙니다. 계정은 지우지 않고 상태만 바꾸며, 수정 팝업에서 다시 활성화할 수 있습니다. 비활성화 후 1년이 지나면 개인정보가 자동 삭제됩니다."
      confirmLabel={n === 1 ? '비활성화' : `${n}명 비활성화`}
      tone="danger"
      busy={busy}
      onConfirm={() => void run()}
      onCancel={onClose}
    >
      <InlineError message={error} />
      {n > 1 && (
        <p className={s.note}>
          대상: {allowed.slice(0, 5).map((u) => u.name).join(', ')}
          {n > 5 ? ` 외 ${n - 5}명` : ''}
        </p>
      )}
      {excluded.length > 0 && (
        <div className={s.excluded}>
          <p className={s.fieldLabel}>제외되는 {excluded.length}명</p>
          <ul>
            {excluded.map((x) => (
              <li key={x.user.id}>
                <strong>{x.user.name}</strong> — {x.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </ConfirmDialog>
  )
}
