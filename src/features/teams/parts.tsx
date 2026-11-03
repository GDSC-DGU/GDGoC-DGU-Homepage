import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { DEMO_ACCOUNT } from './data/sampleSeed'
import { errorText } from './data/repository'
import { EMPTY_CRED, closingSoon, credReady, deadlineLabel, initials, isPin, isStudentId, pageWindow, partShort } from './data/rules'
import type { Author, Credentials, RecruitStatus, TeamPartId, TeamsCategory } from './data/types'
import s from './teams.module.css'

/**
 * 팀원 찾기 화면 조각: 분류 · 상태 · 파트 표시, 예시 안내, 쪽 번호, 팝업(본인 확인 · 확인).
 * 분류 색: 장소색과 같은 구글 4색을 글자 · 테두리에 쓸 때는 흰 바탕 4.5:1 이상으로 짙게 (tokens.css 의 --place-*-text).
 */
const CATEGORY_TONE: Record<TeamsCategory, string> = {
  프로젝트: 'project',
  스터디: 'study',
  소모임: 'club',
  공모전: 'contest',
  기타: 'etc',
}

export function CategoryTag({ category }: { category: TeamsCategory }) {
  return (
    <span className={s.cat} data-tone={CATEGORY_TONE[category]}>
      {category}
    </span>
  )
}

export function StatusTag({ status }: { status: RecruitStatus }) {
  return (
    <span className={s.status} data-open={status === '모집중' || undefined}>
      {status}
    </span>
  )
}

/** 마감까지 남은 날: 'D-5' · '오늘 마감'. 3일 안이면 빨갛게 (마감 임박) */
export function DeadlineTag({ endDate, status, today }: { endDate: string; status: RecruitStatus; today: string }) {
  const label = deadlineLabel(endDate, status, today)
  if (!label) return null
  return (
    <span className={`${s.deadline} num`} data-soon={closingSoon(endDate, status, today) || undefined}>
      {label}
    </span>
  )
}

/** 새 글 (24시간 안) */
export function NewTag() {
  return (
    <span className={s.newTag} lang="en">
      N<span className="visually-hidden"> 새 글</span>
    </span>
  )
}

/** 이름 동그라미 (이름 뒤 두 글자). 색은 이름마다 정해진 옅은 색 */
const AVATAR_TINTS = ['#e8f0fe', '#fce8e6', '#fef7e0', '#e6f4ea', '#f3e8fd', '#e4f7fb']
export function Avatar({ author, size = 32 }: { author: Author; size?: number }) {
  const tint = AVATAR_TINTS[[...author.name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TINTS.length]
  return (
    <span className={s.avatar} style={{ width: size, height: size, background: tint, fontSize: Math.round(size * 0.36) }} aria-hidden="true">
      {initials(author.name)}
    </span>
  )
}

/** 구하는 파트: 'FE · BE'. 고르지 않았으면 '파트 무관' */
export function PartTags({ parts, compact = false }: { parts: readonly TeamPartId[]; compact?: boolean }) {
  if (parts.length === 0) return <span className={s.partsAny}>{compact ? '무관' : '파트 무관'}</span>
  return (
    <span className={s.parts} lang="en">
      {parts.map((p) => (
        <span key={p} className={s.part}>
          {partShort(p)}
        </span>
      ))}
    </span>
  )
}

/** 예시 화면 안내 (백엔드 연결 전). 예시 계정을 알려 줘서 글쓰기 · 댓글 · 수정을 직접 해 볼 수 있다 */
export function SampleNotice({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={s.sample} aria-label="예시 화면 안내">
      <span className="sample-badge">예시</span>
      <p>
        {compact ? (
          '예시 화면입니다. 쓴 글은 이 탭에만 남고 새로고침하면 사라집니다.'
        ) : (
          <>
            게시판을 준비하는 동안 보여 드리는 예시 화면입니다. 아래 글은 실제 모집 글이 아니고, 새로 쓴 글과 댓글은 이 탭에만 남아 새로고침하면 사라집니다.
          </>
        )}{' '}
        써 보려면 학번 <span className="num">{DEMO_ACCOUNT.studentId}</span> · PIN <span className="num">{DEMO_ACCOUNT.pin}</span>을 넣어 보세요.
      </p>
    </aside>
  )
}

/** 쪽 번호: 이전 · 숫자 다섯 · 다음 */
export function Pagination({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (n: number) => void }) {
  if (pageCount <= 1) return null
  return (
    <nav className={s.pager} aria-label="쪽 번호">
      <button type="button" className={s.pageBtn} onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="이전 쪽">
        <Chevron dir="left" />
      </button>
      {pageWindow(page, pageCount).map((n) => (
        <button key={n} type="button" className={`${s.pageBtn} num`} onClick={() => onPage(n)} aria-current={n === page ? 'page' : undefined}>
          {n}
          <span className="visually-hidden">쪽</span>
        </button>
      ))}
      <button type="button" className={s.pageBtn} onClick={() => onPage(page + 1)} disabled={page >= pageCount} aria-label="다음 쪽">
        <Chevron dir="right" />
      </button>
    </nav>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={s.icon}>
      <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  )
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={s.icon}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  )
}

/** 학번 · PIN 두 칸 (글쓰기 · 댓글 · 본인 확인). 숫자만, PIN 은 가린다. 자동 완성 · 저장 없음 */
export function CredentialFields({ value, onChange, disabled = false, idPrefix, invalid = false }: { value: Credentials; onChange: (v: Credentials) => void; disabled?: boolean; idPrefix: string; invalid?: boolean }) {
  const digits = (v: string, n: number) => v.replace(/\D/g, '').slice(0, n)
  return (
    <div className={s.credFields}>
      <label className={s.credField} htmlFor={`${idPrefix}-sid`}>
        <span className="visually-hidden">학번</span>
        <input
          id={`${idPrefix}-sid`}
          className={s.input}
          inputMode="numeric"
          autoComplete="off"
          placeholder="학번"
          value={value.studentId}
          maxLength={10}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange({ ...value, studentId: digits(e.target.value, 10) })}
        />
      </label>
      <label className={s.credField} htmlFor={`${idPrefix}-pin`}>
        <span className="visually-hidden">PIN 4자리</span>
        <input
          id={`${idPrefix}-pin`}
          className={s.input}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          placeholder="PIN 4자리"
          value={value.pin}
          maxLength={4}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange({ ...value, pin: digits(e.target.value, 4) })}
        />
      </label>
    </div>
  )
}

/**
 * 팝업: 진짜 <dialog> + showModal (바깥은 누를 수 없고 초점이 안에 갇힌다. Esc 로 닫힘, 닫히면 연 버튼으로 초점이 돌아간다).
 * 팝업 안 오류는 팝업 안 글로 보여 준다.
 */
export function Modal({ open, onClose, title, description, children, footer, onSubmit }: { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children?: ReactNode; footer: ReactNode; onSubmit?: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d || typeof d.showModal !== 'function') return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className={s.modal}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <form
        className={s.modalBody}
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onSubmit?.()
        }}
      >
        <h2 id={titleId} className={s.modalTitle}>
          {title}
        </h2>
        {description && (
          <p id={descId} className={s.modalDesc}>
            {description}
          </p>
        )}
        {children}
        <div className={s.modalFoot}>{footer}</div>
      </form>
    </dialog>
  )
}

/**
 * 본인 확인 (P-COM-03): 글을 쓴 학번 · PIN 이 맞으면 onVerified.
 * 인증 상태는 저장하지 않으므로 수정 · 삭제할 때마다 묻는다. 실패 제한은 글쓰기와 같다.
 */
export function VerifyDialog({ open, onClose, verify, onVerified, action }: { open: boolean; onClose: () => void; verify: (cred: Credentials) => Promise<void>; onVerified: (cred: Credentials) => void; action: '수정' | '삭제' }) {
  const [cred, setCred] = useState<Credentials>(EMPTY_CRED)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const close = () => {
    setCred(EMPTY_CRED)
    setError(null)
    onClose()
  }
  const submit = async () => {
    if (!isStudentId(cred.studentId)) return setError('학번 10자리를 넣어 주세요.')
    if (!isPin(cred.pin)) return setError('PIN 4자리를 넣어 주세요.')
    setBusy(true)
    setError(null)
    try {
      await verify(cred)
      const ok = cred
      setCred(EMPTY_CRED)
      onVerified(ok)
    } catch (e) {
      setError(errorText(e))
      setCred((c) => ({ ...c, pin: '' }))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      open={open}
      onClose={close}
      onSubmit={submit}
      title="본인 확인"
      description={`게시글을 ${action}하려면 작성할 때 넣은 학번과 PIN을 넣어 주세요.`}
      footer={
        <>
          <button type="button" className={`btn-secondary btn-sm ${s.lineBtn}`} onClick={close}>
            취소
          </button>
          <button type="submit" className="btn-primary btn-sm" disabled={busy || !credReady(cred)}>
            {busy ? '확인하는 중' : '확인'}
          </button>
        </>
      }
    >
      <div className={s.verifyFields}>
        <CredentialFields idPrefix="verify" value={cred} onChange={setCred} invalid={Boolean(error)} />
      </div>
      <p className={s.help}>작성자 본인의 학번과 일치할 때만 진행돼요. 5번 틀리면 15분 동안 입력할 수 없고, 다시 5번 틀리면 계정이 잠겨 운영진이 풀어 줘야 해요.</p>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
    </Modal>
  )
}

/** 되묻기 팝업 ('게시글을 삭제할까요?', '작성 중인 내용이 사라집니다.') */
export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel = '취소', onConfirm, onClose, busy = false, error }: { open: boolean; title: ReactNode; description?: ReactNode; confirmLabel: string; cancelLabel?: string; onConfirm: () => void; onClose: () => void; busy?: boolean; error?: string | null }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      onSubmit={onConfirm}
      title={title}
      description={description}
      footer={
        <>
          <button type="button" className={`btn-secondary btn-sm ${s.lineBtn}`} onClick={onClose}>
            {cancelLabel}
          </button>
          <button type="submit" className="btn-primary btn-sm" disabled={busy}>
            {confirmLabel}
          </button>
        </>
      }
    >
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
    </Modal>
  )
}
