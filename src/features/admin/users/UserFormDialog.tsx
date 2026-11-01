import { useQuery } from '@tanstack/react-query'
import { useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { useAdminActor } from '../auth/authContext'
import { adminKeys, errorMessage, isAdminRepoError, useAdminRepos } from '../data'
import type { ManagementType } from '../data/common/types'
import { canAddUserOfType } from '../data/permissions'
import { canChangeStatusTo, canChangeTypeTo, canResetPasswordOf, CURRENT_GENERATION, GENERATIONS, PIN_LINK_HOURS } from '../data/users/rules'
import type { IssuedCredential, UserDetail, UserRow } from '../data/users/types'
import { Button, Checkbox, Dialog, RadioGroup, SelectField, StatusBadge, TextField, focusFirstInvalid, formatDate, formatDateTime, hasErrors, useConfirm } from '../ui'
import { IconAlert, IconCheckCircle, IconErrorMark } from '../ui/icons'
import { actorLabel } from '../data/common/accounts'
import { AccountStatusBadge, PinStatusBadges } from './badges'
import { CredentialBox, MailPreview } from './CredentialBox'
import { isAdminType, mailFailedHint, ROLE_GUIDE, TYPE_OPTIONS } from './display'
import { digitsOnly, loginIdFormatError, validateUserForm, type LoginIdCheck, type UserFormErrors, type UserFormValues } from './form'
import s from './users.module.css'

export type UserFormTarget = { mode: 'add' } | { mode: 'edit'; user: UserRow }

/** 팝업을 닫으며 목록에 알릴 결과 (목록이 토스트로 보여 주고, 그 행으로 초점을 지킨다) */
export interface UserFormDone {
  message: string
  tone: 'success' | 'error' | 'info'
  userId: string
}

type Done =
  | { kind: 'added'; result: IssuedCredential; studentId: string }
  | { kind: 'promoted'; result: IssuedCredential; from: ManagementType; message: string }

const EMPTY: UserFormValues = { name: '', studentId: '', email: '', type: 'General', generation: String(CURRENT_GENERATION), loginId: '' }

const fromDetail = (d: UserDetail): UserFormValues => ({ name: d.name, studentId: d.studentId, email: d.email, type: d.type, generation: String(d.generation), loginId: '' })

/**
 * 사용자 추가 · 수정 팝업 (P-AMB-02, Figma 07-3-1 General · 07-3-2 Lead · Core).
 * - 추가 (F-AMB-006 · 007 · 008 · 011): 이름 · 학번 · 이메일 · 관리 유형(기본 General) · 기수. Lead · Core 면 '관리자 페이지 로그인' 영역(아이디 + 중복 확인, 임시 비밀번호 자동 발급).
 *   추가하면 PIN 설정 링크 메일 발송 흉내 → 결과 단계 (발송 결과 · 임시 비밀번호 [복사] · 보낸 메일 보기 · [계속 추가]).
 * - 수정 (F-AMB-009 · 010): 같은 화면에서 이름 · 이메일 · 기수 · 관리 유형 · 상태. 학번은 전체 표시 · 변경 불가.
 *   관리 유형 변경은 Lead 만, General → Lead · Core 면 아이디 · 임시 비밀번호 발급, 반대면 관리자 로그인 계정 비활성. [비밀번호 초기화]는 Lead 만.
 */
export function UserFormDialog({ target, open, activeLeads, onClose, onDone }: { target: UserFormTarget; open: boolean; activeLeads: number; onClose: () => void; onDone: (done: UserFormDone) => void }) {
  const repos = useAdminRepos()
  const actor = useAdminActor()
  const confirm = useConfirm()
  const uid = useId()
  const editId = target.mode === 'edit' ? target.user.id : null
  const detailQuery = useQuery({ queryKey: adminKeys.section('users', 'detail', editId), queryFn: () => repos.users.get(editId!), enabled: !!editId })
  const detail = detailQuery.data

  const [values, setValues] = useState<UserFormValues>(EMPTY)
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [initFor, setInitFor] = useState<string | null>(null)
  // 수정: 처음 받은 값으로 칸을 채운다 (그 뒤 다시 불러와도 쓰던 값은 그대로)
  if (detail && initFor !== detail.id) {
    setInitFor(detail.id)
    setValues(fromDetail(detail))
    setStatus(detail.status === 'inactive' ? 'inactive' : 'active')
  }

  const [errors, setErrors] = useState<UserFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [check, setCheck] = useState<LoginIdCheck | null>(null)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resendAfter, setResendAfter] = useState(true)
  const [issuedPw, setIssuedPw] = useState<string | null>(null)
  const [resettingPw, setResettingPw] = useState(false)
  const [done, setDone] = useState<Done | null>(null)
  const [announce, setAnnounce] = useState('')

  const bodyRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const loginIdRef = useRef<HTMLInputElement>(null)
  const copyRef = useRef<HTMLButtonElement>(null)
  const doneRef = useRef<HTMLDivElement>(null)
  const pwCopyRef = useRef<HTMLButtonElement>(null)

  const isEdit = target.mode === 'edit'
  const wasAdmin = !!detail && isAdminType(detail.type)
  const adminNow = isAdminType(values.type)
  const needsLoginId = adminNow && (!isEdit || !wasAdmin)
  const becomesGeneral = wasAdmin && values.type === 'General'
  const emailChanged = !!detail && values.email.trim() !== detail.email
  const canResendAfter = !!detail && emailChanged && detail.pinStatus !== 'set' && status !== 'inactive'

  const set = <K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  // ── 관리 유형 · 상태 선택지 (권한 함수로 막고 이유를 도움말에) ──
  const typeChoices = TYPE_OPTIONS.map((t) => {
    const d = !isEdit ? canAddUserOfType(actor, t) : detail ? canChangeTypeTo(actor, detail, t, activeLeads) : { allowed: false as const, reason: '' }
    return { value: t, label: t, disabled: !d.allowed, reason: d.allowed ? null : d.reason }
  })
  const typeBlocked = typeChoices.find((c) => c.disabled && c.reason)?.reason
  const typeHelp = typeBlocked ?? `${values.type}: ${ROLE_GUIDE.find((r) => r.type === values.type)!.text}`
  const statusChoices = detail
    ? (['active', 'inactive'] as const).map((v) => {
        const d = canChangeStatusTo(actor, detail, v, activeLeads)
        return { value: v, label: v === 'active' ? '활성' : '비활성', disabled: !d.allowed, reason: d.allowed ? null : d.reason }
      })
    : []
  const statusBlocked = statusChoices.find((c) => c.disabled)?.reason
  const statusHelp = statusBlocked
    ? statusBlocked
    : detail?.status === 'inactive'
      ? status === 'active'
        ? '저장하면 다시 활성화되고 개인정보 삭제 일정이 취소됩니다.'
        : `${detail.purgeAt ? formatDate(detail.purgeAt) : '1년 뒤'}에 개인정보가 자동 삭제됩니다. 그 전에 활성으로 바꾸면 삭제 일정이 취소됩니다.`
      : status === 'inactive'
        ? '비활성으로 바꾸면 관리자 로그인과 학번 인증이 모두 막힙니다. 비활성화 후 1년이 지나면 개인정보가 자동 삭제됩니다.'
        : undefined

  // ── 아이디 중복 확인 (F-AMB-007) ──
  const checkLoginId = async () => {
    const format = loginIdFormatError(values.loginId)
    if (format) {
      setCheck({ value: values.loginId, available: false, message: format })
      setErrors((e) => ({ ...e, loginId: format }))
      loginIdRef.current?.focus()
      return
    }
    setChecking(true)
    try {
      const r = await repos.users.checkLoginId(values.loginId)
      setCheck({ value: values.loginId, ...r })
      setErrors((e) => ({ ...e, loginId: r.available ? undefined : r.message }))
    } catch (e) {
      setErrors((x) => ({ ...x, loginId: errorMessage(e) }))
    } finally {
      setChecking(false)
    }
  }
  const checkedOk = !!check && check.available && check.value === values.loginId
  const onLoginIdKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void checkLoginId()
    }
  }

  const showErrors = (errs: UserFormErrors) => {
    setErrors(errs)
    requestAnimationFrame(() => focusFirstInvalid(bodyRef.current))
  }
  const applyError = (e: unknown) => {
    if (isAdminRepoError(e) && e.fields) {
      showErrors(e.fields as UserFormErrors)
      if (e.fields.loginId) setCheck(null)
    } else setFormError(errorMessage(e))
  }

  // ── 저장 ──
  const submit = async () => {
    if (saving || done) return
    setFormError(null)
    const errs = validateUserForm(values, { mode: isEdit ? 'edit' : 'add', needsLoginId, check })
    if (hasErrors(errs)) return showErrors(errs)
    setSaving(true)
    try {
      if (!isEdit) {
        const result = await repos.users.create({ name: values.name, studentId: values.studentId, email: values.email, type: values.type, generation: Number(values.generation), loginId: needsLoginId ? values.loginId : null })
        setDone({ kind: 'added', result, studentId: values.studentId })
        setAnnounce(`${result.user.name} 사용자를 추가했습니다. PIN 설정 링크 ${result.mail === 'failed' ? '발송 실패' : '발송 완료'}.${result.temporaryPassword ? ' 임시 비밀번호를 발급했습니다.' : ''}`)
        requestAnimationFrame(() => (result.temporaryPassword ? copyRef.current : doneRef.current)?.focus())
        return
      }
      if (!detail) return
      const statusChanged = detail.status !== 'locked' && status !== (detail.status === 'inactive' ? 'inactive' : 'active')
      const nothing = values.name.trim() === detail.name && !emailChanged && Number(values.generation) === detail.generation && values.type === detail.type && !statusChanged
      if (nothing) return onDone({ message: '바뀐 내용이 없어 저장하지 않았습니다.', tone: 'info', userId: detail.id })
      const result = await repos.users.update(detail.id, {
        name: values.name,
        email: values.email,
        generation: Number(values.generation),
        type: values.type,
        loginId: needsLoginId ? values.loginId : null,
        status: statusChanged ? status : undefined,
      })
      // 이메일을 바꿨으면 새 주소로 PIN 설정 링크 재발송 (F-AMB-009 5 · F-AMB-013 4)
      let mailNote = ''
      let tone: UserFormDone['tone'] = 'success'
      if (canResendAfter && resendAfter) {
        try {
          const m = await repos.users.resendPinMail(detail.id)
          if (m.mail === 'sent') mailNote = ' 새 이메일로 PIN 설정 링크를 보냈습니다.'
          else {
            mailNote = ` 새 이메일로 메일을 보내지 못했습니다. ${mailFailedHint}`
            tone = 'error'
          }
        } catch (e) {
          mailNote = ` PIN 설정 링크는 보내지 못했습니다. ${errorMessage(e)}`
          tone = 'error'
        }
      }
      const base = `${result.user.name}의 정보를 저장했습니다.${statusChanged ? (status === 'inactive' ? ' 비활성으로 바꿨습니다.' : ' 다시 활성화했습니다.') : ''}`
      if (result.temporaryPassword) {
        setDone({ kind: 'promoted', result, from: detail.type, message: `${base}${mailNote}` })
        setAnnounce(`${base} 관리자 아이디와 임시 비밀번호를 발급했습니다.`)
        requestAnimationFrame(() => copyRef.current?.focus())
        return
      }
      onDone({ message: `${base}${mailNote}`, tone, userId: detail.id })
    } catch (e) {
      applyError(e)
    } finally {
      setSaving(false)
    }
  }

  // ── 비밀번호 초기화 (F-AMB-010, Lead 만) ──
  const pwDecision = detail ? canResetPasswordOf(actor, detail) : null
  const resetPassword = async () => {
    if (!detail) return
    const ok = await confirm({
      title: `${detail.name}의 비밀번호를 초기화할까요?`,
      body: '기존 비밀번호는 바로 쓸 수 없게 되고 새 임시 비밀번호를 발급합니다. 해당 사용자는 다음 로그인 때 비밀번호를 바꿔야 합니다.',
      confirmLabel: '초기화',
      tone: 'danger',
    })
    if (!ok) return
    setResettingPw(true)
    setFormError(null)
    try {
      const r = await repos.users.resetPassword(detail.id)
      setIssuedPw(r.temporaryPassword)
      requestAnimationFrame(() => pwCopyRef.current?.focus())
    } catch (e) {
      setFormError(errorMessage(e))
    } finally {
      setResettingPw(false)
    }
  }

  const addAnother = () => {
    setDone(null)
    setAnnounce('')
    setValues(EMPTY)
    setErrors({})
    setCheck(null)
    setFormError(null)
    requestAnimationFrame(() => nameRef.current?.focus())
  }

  // ── 그리기 ──
  const title = done ? (done.kind === 'added' ? '사용자를 추가했습니다' : '관리 유형을 바꿨습니다') : isEdit ? '사용자 정보 수정' : '사용자 추가'
  const description = done
    ? undefined
    : isEdit
      ? '학번은 바꿀 수 없습니다. 바꾼 내용은 변경 이력에 남습니다.'
      : '이름 · 학번 · 이메일 · 관리 유형 · 기수를 입력하면 계정을 만들고, 입력한 이메일로 PIN 설정 링크를 보냅니다.'

  const footer = done ? (
    <>
      {done.kind === 'added' && (
        <Button variant="secondary" onClick={addAnother}>
          계속 추가
        </Button>
      )}
      <Button onClick={() => (done.kind === 'promoted' ? onDone({ message: done.message, tone: 'success', userId: done.result.user.id }) : onClose())}>닫기</Button>
    </>
  ) : (
    <>
      <Button variant="secondary" onClick={onClose} disabled={saving}>
        취소
      </Button>
      <Button type="submit" busy={saving} disabled={isEdit && !detail}>
        {isEdit ? '저장' : '추가'}
      </Button>
    </>
  )

  return (
    <Dialog open={open} onClose={onClose} title={title} description={description} size="md" onSubmit={() => void submit()} footer={footer}>
      <div ref={bodyRef} className={s.form}>
        {/* 결과 알림: 폼 → 결과로 바뀌어도 이 칸은 그대로라 화면 읽기가 읽는다 */}
        <p className="visually-hidden" role="status">
          {announce}
        </p>
        {done ? (
          <DoneView done={done} doneRef={doneRef} copyRef={copyRef} />
        ) : isEdit && !detail ? (
          detailQuery.isError ? (
            <div className={s.inlineError} role="alert">
              <IconErrorMark />
              <span>{errorMessage(detailQuery.error)}</span>
              <Button variant="secondary" size="xs" onClick={() => void detailQuery.refetch()}>
                다시 불러오기
              </Button>
            </div>
          ) : (
            <p className={s.loadingLine} role="status">
              사용자 정보를 불러오는 중입니다
            </p>
          )
        ) : (
          <>
            {formError && (
              <p className={s.inlineError} role="alert">
                <IconErrorMark />
                <span>{formError}</span>
              </p>
            )}
            {detail && (
              <dl className={s.summaryFacts}>
                <div>
                  <dt>PIN 설정 상태</dt>
                  <dd>
                    <PinStatusBadges row={detail} />
                  </dd>
                </div>
                <div>
                  <dt>상태</dt>
                  <dd>
                    <AccountStatusBadge row={detail} showPurge={false} />
                  </dd>
                </div>
                <div>
                  <dt>추가</dt>
                  <dd>
                    {actorLabel(detail.created.by)} · <span className="num">{formatDateTime(detail.created.at)}</span>
                  </dd>
                </div>
              </dl>
            )}

            <div className={s.grid2}>
              <TextField ref={nameRef} label="이름" required value={values.name} onChange={(e) => set('name', e.target.value)} error={errors.name} autoComplete="off" />
              {isEdit ? (
                <TextField label="학번" value={values.studentId} readOnly help="학번은 바꿀 수 없습니다." className={s.numField} />
              ) : (
                <TextField
                  label="학번"
                  required
                  inputMode="numeric"
                  autoComplete="off"
                  value={values.studentId}
                  onChange={(e) => set('studentId', digitsOnly(e.target.value))}
                  error={errors.studentId}
                  help="숫자 10자리 · 추가한 뒤에는 바꿀 수 없습니다."
                  className={s.numField}
                />
              )}
            </div>
            {detail?.department && <p className={s.note}>학과 {detail.department} (최종 합격자 일괄 등록 때 지원서에서 가져옴)</p>}

            <TextField label="이메일" required type="email" autoComplete="off" value={values.email} onChange={(e) => set('email', e.target.value)} error={errors.email} help={isEdit ? undefined : 'PIN 설정 링크를 이 주소로 보냅니다.'} />
            {canResendAfter && (
              <Checkbox
                label="저장하면서 새 이메일로 PIN 설정 링크 다시 보내기"
                description={`이전 링크는 더 이상 쓸 수 없고, 새 링크는 ${PIN_LINK_HOURS}시간 동안 한 번만 쓸 수 있습니다.`}
                checked={resendAfter}
                onChange={(e) => setResendAfter(e.target.checked)}
              />
            )}

            <div className={s.grid2}>
              <RadioGroup<ManagementType>
                legend="관리 유형"
                name={`${uid}-type`}
                required
                options={typeChoices.map(({ value, label, disabled }) => ({ value, label, disabled }))}
                value={values.type}
                onChange={(t) => set('type', t)}
                help={typeHelp}
              />
              <SelectField
                label="기수"
                required
                options={GENERATIONS.map((g) => ({ value: String(g), label: `${g}기` }))}
                placeholder="기수 선택"
                value={values.generation}
                onChange={(e) => set('generation', e.target.value)}
                error={errors.generation}
              />
            </div>

            {adminNow && (
              <section className={s.loginBox} aria-labelledby={`${uid}-login`}>
                <h3 id={`${uid}-login`} className={s.boxTitle}>
                  관리자 페이지 로그인
                </h3>
                {needsLoginId ? (
                  <>
                    <div className={s.idRow}>
                      <TextField
                        ref={loginIdRef}
                        label="아이디"
                        required
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={20}
                        value={values.loginId}
                        onChange={(e) => set('loginId', e.target.value.trim())}
                        onKeyDown={onLoginIdKey}
                        error={errors.loginId}
                        help="영문 · 숫자 4~20자. 중복 확인을 통과해야 추가할 수 있습니다."
                        aria-describedby={`${uid}-idcheck`}
                        className={s.idField}
                      />
                      <Button variant="secondary" busy={checking} onClick={() => void checkLoginId()} className={s.idButton}>
                        중복 확인
                      </Button>
                    </div>
                    <p id={`${uid}-idcheck`} role="status" className={checkedOk ? s.okLine : 'visually-hidden'}>
                      {checkedOk && <IconCheckCircle />}
                      {check?.value === values.loginId ? check.message : ''}
                    </p>
                    <p className={s.note}>임시 비밀번호는 {isEdit ? '저장' : '추가'}하면 자동으로 만들어 이 팝업에 한 번만 보여 드립니다. 첫 로그인 때 바꿔야 합니다.</p>
                  </>
                ) : detail ? (
                  <>
                    <dl className={s.facts}>
                      <div>
                        <dt>아이디</dt>
                        <dd className={s.mono}>{detail.loginId}</dd>
                      </div>
                      <div>
                        <dt>비밀번호</dt>
                        <dd>{detail.mustChangePassword ? <StatusBadge tone="pending">임시 비밀번호 · 다음 로그인 때 변경</StatusBadge> : '사용자가 정한 비밀번호'}</dd>
                      </div>
                    </dl>
                    <div className={s.boxActions}>
                      <Button variant="secondary" busy={resettingPw} disabledReason={pwDecision && !pwDecision.allowed ? pwDecision.reason : undefined} onClick={() => void resetPassword()}>
                        비밀번호 초기화
                      </Button>
                      {pwDecision && !pwDecision.allowed && <span className={s.note}>{pwDecision.reason}</span>}
                    </div>
                    {issuedPw && <CredentialBox ref={pwCopyRef} loginId={detail.loginId ?? ''} password={issuedPw} title="새 임시 비밀번호를 발급했습니다" />}
                  </>
                ) : null}
              </section>
            )}
            {becomesGeneral && (
              <p className={s.warn}>
                <IconAlert />
                <span>General로 바꾸면 관리자 로그인 계정(아이디 {detail?.loginId})이 비활성되어 관리자 화면에 들어올 수 없습니다.</span>
              </p>
            )}

            {detail &&
              (detail.status === 'locked' ? (
                <div className={s.lockedLine}>
                  <span className={s.fieldLabel}>상태</span>
                  <p>
                    <StatusBadge tone="locked">잠김</StatusBadge> 잠긴 계정은 목록의 [잠금 해제]로 풀 수 있습니다.
                  </p>
                </div>
              ) : (
                <RadioGroup<'active' | 'inactive'>
                  legend="상태"
                  name={`${uid}-status`}
                  options={statusChoices.map(({ value, label, disabled }) => ({ value, label, disabled }))}
                  value={status}
                  onChange={setStatus}
                  help={statusHelp}
                />
              ))}
          </>
        )}
      </div>
    </Dialog>
  )
}

/** 추가 · 관리 유형 변경이 끝난 뒤: 발송 결과 · 임시 비밀번호 · 보낸 메일 */
function DoneView({ done, doneRef, copyRef }: { done: Done; doneRef: RefObject<HTMLDivElement | null>; copyRef: RefObject<HTMLButtonElement | null> }) {
  const { user, temporaryPassword, mail } = done.result
  return (
    <div ref={doneRef} tabIndex={-1} className={s.done}>
      <p className={s.doneLead}>
        {done.kind === 'added' ? (
          <>
            <strong>{user.name}</strong>
            <span className="num"> ({user.maskedStudentId})</span> 사용자를 추가했습니다. {user.type} · {user.generation}기 · PIN 설정 상태 대기
          </>
        ) : (
          <>
            {done.message} 관리 유형을 {done.from}에서 {user.type}로 바꾸고 관리자 아이디와 임시 비밀번호를 발급했습니다.
          </>
        )}
      </p>
      {done.kind === 'added' && mail && (
        <p className={s.mailLine}>
          {mail === 'sent' ? (
            <>
              <StatusBadge tone="success">발송 완료</StatusBadge>
              <span>
                PIN 설정 링크를 {user.email} 주소로 보냈습니다. 링크는 {PIN_LINK_HOURS}시간 동안 한 번만 쓸 수 있습니다.
              </span>
            </>
          ) : (
            <>
              <StatusBadge tone="danger">발송 실패</StatusBadge>
              <span>PIN 설정 메일을 보내지 못했습니다. {mailFailedHint}</span>
            </>
          )}
        </p>
      )}
      {temporaryPassword && user.loginId && <CredentialBox ref={copyRef} loginId={user.loginId} password={temporaryPassword} />}
      {done.kind === 'added' && mail === 'sent' && user.pinLinkExpiresAt && <MailPreview to={user.email} name={user.name} studentId={done.studentId} kind="setup" expiresAt={user.pinLinkExpiresAt} />}
    </div>
  )
}
