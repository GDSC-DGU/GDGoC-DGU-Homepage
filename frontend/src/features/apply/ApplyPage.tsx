import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useBlocker, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { PLACE_BY_ID } from '@/config/places'
import { DEV_SWITCH, SITE } from '@/config/site'
import { CHAPTER, RECRUITING } from '@/content'
import { PRIVACY_PROCESSOR_SUMMARY } from '@/content/privacy'
import { Crumbs } from '@/features/dcamp/Crumbs'
import { DevSwitch } from '@/features/pages/recruits/DevSwitch'
import { readPreview } from '@/features/pages/recruits/view'
import { usePageTitle } from '@/hooks/usePageTitle'
import { APPLY_SAMPLE, applyKeys, useApplicationForm, useApplyRepo, useCurrentRecruitment, useSubmitApplication } from './data/applyRepo'
import { ApplyError, applyErrorText } from './data/repository'
import {
  APPLICANT_FIELDS,
  clearDraft,
  closedTitle,
  hasErrors,
  isStudentId,
  kstDateTime,
  loadDraft,
  maxLengthOf,
  presetTrack,
  progress,
  qKey,
  saveDraft,
  toRequest,
  trackLabel,
  validateDraft,
  visibleQuestions,
  type ApplyErrors,
} from './data/rules'
import type { Applicant, ApplicationForm, ApplicationResult, ApplyDraft, Consents, CurrentRecruitment, FormQuestion } from './data/types'
import s from './apply.module.css'

const NO_CONSENT: Consents = { privacy: false, ai: false }

const PLACEHOLDER: Partial<Record<keyof Applicant, string>> = { name: '이름', studentId: '숫자 10자리', major: '예: 컴퓨터공학전공', email: 'name@example.com', phone: '010-0000-0000' }

/**
 * 지원서 페이지 (/recruits/apply, P-RCT-03). 지원하기(/recruits) 첫 화면의 '지원하기'를 누르면 이 페이지로 온다.
 * 데이터는 API 명세(docs/api/openapi.yaml)의 공개 모집 API 를 그대로 쓴다 (data/types.ts):
 *  - RCT-001 현재 모집(rid · cohort · 기간 · tracks · canApply) → 지원할 수 있을 때만 양식
 *  - RCT-002 게시된 문항 (SHORT_TEXT · LONG_TEXT · SINGLE_CHOICE · MULTI_CHOICE · URL, trackOnly)
 *  - RCT-003 학번을 다 적으면 중복 지원 미리 확인
 *  - RCT-005 제출 (applicant · track · answers · privacyConsent · formVersion)
 * 화면: 지금 위치 → '{cohort}기 지원서' → 기본 정보 → 지원 파트 → 문항(번호) → 동의 둘 → [제출] → 확인 팝업 → 접수 완료(같은 페이지).
 * - 쓰던 답은 이 브라우저에 회차(rid)별로 임시 보관한다. 제출하면 지운다. 쓰다가 다른 페이지로 가려 하면 한 번 묻는다.
 * - ?part=frontend 로 오면 지원 파트를 미리 골라 둔다.
 * - 개발 화면(DEV_SWITCH)에서는 왼쪽 아래 '개발' 버튼으로 모집 중 ↔ 모집 기간 아님을 오간다 (?preview=). 예시(APPLY_SAMPLE)면 위에 '예시' 안내.
 */
export function ApplyPage() {
  const [params] = useSearchParams()
  const preview = readPreview(params.get('preview'), DEV_SWITCH)
  const cur = useCurrentRecruitment()
  const cohort = cur.data?.cohort ?? RECRUITING.current.generation
  usePageTitle(`${cohort}기 지원서`, PLACE_BY_ID.recruits.label)

  const open = preview === 'open' ? true : preview === 'closed' ? false : !!cur.data?.canApply
  let body: ReactNode
  if (cur.isPending && preview !== 'closed') body = <p className={s.state}>모집 정보를 불러오는 중입니다.</p>
  else if (cur.isError && preview !== 'closed') {
    const notFound = cur.error instanceof ApplyError && cur.error.code === 'NOT_FOUND'
    body = notFound ? (
      <Closed cohort={cohort} current={null} />
    ) : (
      <div className={s.state}>
        <p>모집 정보를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</p>
        <button type="button" className="btn-secondary btn-sm" onClick={() => void cur.refetch()}>
          다시 불러오기
        </button>
      </div>
    )
  } else if (open && cur.data) body = <ApplyBody current={cur.data} />
  else body = <Closed cohort={cohort} current={cur.data ?? null} />

  return (
    <div className={`container ${s.page}`}>
      <Crumbs trail={[PLACE_BY_ID.recruits.label, '지원서']} />
      {body}
      {DEV_SWITCH && <DevSwitch mode={open ? 'form' : 'closed'} />}
    </div>
  )
}

function ApplyBody({ current }: { current: CurrentRecruitment }) {
  const form = useApplicationForm(current.rid)
  const [result, setResult] = useState<{ res: ApplicationResult; email: string } | null>(null)

  if (form.isPending) return <p className={s.state}>지원서를 불러오는 중입니다.</p>
  if (form.isError) {
    const notPublished = form.error instanceof ApplyError && (form.error.code === 'FORM_NOT_PUBLISHED' || form.error.code === 'NOT_FOUND')
    if (notPublished) return <p className={s.state}>지원서를 준비하고 있습니다. 모집 소식은 인스타그램 {SITE.links.instagramHandle}에 올립니다.</p>
    return (
      <div className={s.state}>
        <p>지원서를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</p>
        <button type="button" className="btn-secondary btn-sm" onClick={() => void form.refetch()}>
          다시 불러오기
        </button>
      </div>
    )
  }
  if (result) return <Done result={result.res} email={result.email} cohort={current.cohort} />
  if (!form.data) return null
  return <ApplyForm current={current} form={form.data} onDone={(res, email) => setResult({ res, email })} />
}

/** 지원할 수 없을 때 (모집 전 · 마감 · 폼 미게시 · 주소를 직접 열었을 때) */
function Closed({ cohort, current }: { cohort: number; current: CurrentRecruitment | null }) {
  return (
    <section className={s.done} aria-labelledby="apply-closed">
      <h1 id="apply-closed" className={s.title}>
        {closedTitle(current?.applyState ?? null, cohort, current?.applyStartAt)}
      </h1>
      <p className={s.lead}>모집 일정과 결과는 인스타그램 {SITE.links.instagramHandle}에 가장 먼저 올립니다.</p>
      <div className="btn-row">
        <a className="btn-primary" href={RECRUITING.current.channel} target="_blank" rel="noreferrer">
          {cohort}기 소식 받기<span className="visually-hidden"> (인스타그램, 새 창)</span>
        </a>
        <Link to="/recruits" className="btn-secondary">
          지원 안내 보기
        </Link>
      </div>
    </section>
  )
}

function Head({ current }: { current: CurrentRecruitment }) {
  const { applyStartAt, applyEndAt } = current
  return (
    <header className={s.head}>
      <h1 className={s.title}>{current.cohort}기 지원서</h1>
      <p className={s.lead}>
        {applyStartAt && applyEndAt ? (
          <>
            지원 기간 <span className="num">{kstDateTime(applyStartAt)}</span> ~ <span className="num">{kstDateTime(applyEndAt)}</span>
          </>
        ) : (
          '지원 기간은 정해지면 이곳과 인스타그램에 알립니다.'
        )}
      </p>
      <p className={s.meta}>
        <span className={s.star} aria-hidden="true">
          *
        </span>{' '}
        표시는 꼭 답해야 하는 칸입니다. 쓰는 동안 답은 이 브라우저에 임시로 남습니다.
      </p>
    </header>
  )
}

function ApplyForm({ current, form, onDone }: { current: CurrentRecruitment; form: ApplicationForm; onDone: (r: ApplicationResult, email: string) => void }) {
  const [params] = useSearchParams()
  const repo = useApplyRepo()
  const queryClient = useQueryClient()
  const submit = useSubmitApplication(form.rid)
  const formRef = useRef<HTMLFormElement>(null)
  const tracks = current.tracks
  const [draft, setDraft] = useState<ApplyDraft>(() => {
    const d = loadDraft(form.rid)
    return d.track ? d : { ...d, track: presetTrack(tracks, params.get('part')) }
  })
  const [consents, setConsents] = useState<Consents>(NO_CONSENT)
  const [errors, setErrors] = useState<ApplyErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const sent = useRef(false)
  const checkedId = useRef('')

  // 임시 보관: 입력이 멈추고 0.4초 뒤
  useEffect(() => {
    const t = setTimeout(() => saveDraft(form.rid, draft), 400)
    return () => clearTimeout(t)
  }, [draft, form.rid])

  const dirty = Object.values(draft.applicant).some((v) => v.trim()) || Object.keys(draft.answers).length > 0
  const leave = useLeaveGuard(dirty && !submit.isPending, sent)

  const questions = visibleQuestions(form, draft.track)
  const { done, total } = useMemo(() => progress(form, tracks, draft), [form, tracks, draft])

  const clearError = (key: string) => {
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }
  const setApplicant = (key: keyof Applicant, v: string) => {
    setDraft((d) => ({ ...d, applicant: { ...d.applicant, [key]: v } }))
    clearError(`applicant.${key}`)
  }
  const setAnswer = (id: string, v: string | string[]) => {
    setDraft((d) => ({ ...d, answers: { ...d.answers, [id]: v } }))
    clearError(qKey(id))
  }

  // RCT-003: 학번 칸을 벗어날 때 10자리면 중복 지원을 미리 확인한다 (같은 학번은 한 번만)
  const checkStudentId = async () => {
    const id = draft.applicant.studentId.trim()
    if (!isStudentId(id) || checkedId.current === id) return
    checkedId.current = id
    try {
      const r = await repo.checkDuplicate(form.rid, id)
      if (r.duplicated) setErrors((e) => ({ ...e, 'applicant.studentId': `이 학번으로 낸 ${current.cohort}기 지원서가 이미 있습니다. 고칠 내용이 있으면 운영진 메일로 알려 주세요.` }))
    } catch {
      checkedId.current = '' // 확인 못 하면 제출 때 서버가 다시 막는다
    }
  }

  const check = () => {
    setFormError(null)
    const found = validateDraft(form, tracks, draft, consents)
    if (errors['applicant.studentId']?.includes('이미')) found['applicant.studentId'] = errors['applicant.studentId']
    if (hasErrors(found)) {
      setErrors(found)
      const n = Object.values(found).filter(Boolean).length
      setFormError(`확인할 곳이 ${n}군데 있습니다.`)
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setConfirming(true)
  }

  const send = () => {
    const req = toRequest(form, draft, consents)
    submit.mutate(req, {
      onSuccess: (r) => {
        sent.current = true
        clearDraft(form.rid)
        setConfirming(false)
        onDone(r, req.applicant.email)
        window.scrollTo({ top: 0 })
      },
      onError: (e) => {
        setConfirming(false)
        setFormError(applyErrorText(e))
        if (!(e instanceof ApplyError)) return
        if (e.code === 'APPLICATION_DUPLICATED') setErrors((x) => ({ ...x, 'applicant.studentId': '이 학번 또는 이메일로 낸 지원서가 이미 있습니다.' }))
        // 폼이 바뀌었으면 새 문항을 받아 온다 (쓴 답은 남는다)
        if (e.code === 'FORM_CHANGED') void queryClient.invalidateQueries({ queryKey: applyKeys.all })
        if (e.code === 'RECRUITMENT_CLOSED') void queryClient.invalidateQueries({ queryKey: applyKeys.current })
      },
    })
  }

  return (
    <>
      <Head current={current} />
      {APPLY_SAMPLE && (
        <aside className={s.sample} aria-label="예시 화면 안내">
          <span className="sample-badge">예시</span>
          <p>
            지원서 API 를 붙이기 전이라 보여 드리는 예시입니다. 문항은 예시이고, 제출해도 접수되지 않습니다.
            {!current.canApply && ` 실제 ${current.cohort}기 지원은 모집이 열리면 받습니다.`}
          </p>
        </aside>
      )}

      <form
        ref={formRef}
        className={s.form}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          check()
        }}
      >
        <section className={s.block} aria-labelledby="apply-basic">
          <h2 id="apply-basic" className={s.blockTitle}>
            기본 정보
          </h2>
          <p className={s.blockSub}>합격 안내와 회원 계정을 만들 때 씁니다. AI 채점에는 보내지 않습니다.</p>
          <div className={s.grid2}>
            {APPLICANT_FIELDS.map((f) => (
              <ApplicantField
                key={f.key}
                field={f}
                value={draft.applicant[f.key]}
                error={errors[`applicant.${f.key}`]}
                onChange={(v) => setApplicant(f.key, v)}
                onBlur={f.key === 'studentId' ? () => void checkStudentId() : undefined}
              />
            ))}
          </div>
        </section>

        <section className={s.block} aria-labelledby="apply-track">
          <h2 id="apply-track" className={s.blockTitle}>
            지원 파트
          </h2>
          <fieldset className={s.field} aria-describedby={errors.track ? 'apply-track-err' : undefined}>
            <legend className="visually-hidden">지원 파트 (필수)</legend>
            <div className={s.choices}>
              {tracks.map((t) => (
                <label key={t} className={s.choice}>
                  <input
                    type="radio"
                    name="track"
                    value={t}
                    checked={draft.track === t}
                    aria-invalid={errors.track ? true : undefined}
                    onChange={() => {
                      setDraft((d) => ({ ...d, track: t }))
                      clearError('track')
                    }}
                  />
                  <span lang="en">{trackLabel(t)}</span>
                </label>
              ))}
            </div>
            {errors.track && (
              <p id="apply-track-err" className={s.error}>
                {errors.track}
              </p>
            )}
          </fieldset>
        </section>

        <section className={s.block} aria-labelledby="apply-questions">
          <h2 id="apply-questions" className={s.blockTitle}>
            질문
          </h2>
          <ol className={s.questions}>
            {questions.map((q, i) => (
              <li key={q.questionId} className={s.qItem}>
                <span className={`${s.qNo} num`} aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Question q={q} value={draft.answers[q.questionId]} error={errors[qKey(q.questionId)]} onChange={(v) => setAnswer(q.questionId, v)} />
              </li>
            ))}
          </ol>
        </section>

        <section className={s.block} aria-labelledby="apply-consent">
          <h2 id="apply-consent" className={s.blockTitle}>
            동의
          </h2>
          <ConsentBox
            value={consents}
            error={errors.consents}
            onChange={(c) => {
              setConsents(c)
              clearError('consents')
            }}
          />
        </section>

        <div className={s.foot}>
          <p className={s.progress}>
            필수 항목 <span className="num">{done}</span> / <span className="num">{total}</span>
          </p>
          <p className={s.formMsg} role="alert">
            {formError && <span className={s.errorText}>{formError}</span>}
          </p>
          <button type="submit" className={`btn-primary ${s.submit}`} disabled={submit.isPending}>
            {submit.isPending ? '제출하는 중' : '제출하기'}
          </button>
        </div>
      </form>

      <Modal
        open={confirming}
        onClose={() => !submit.isPending && setConfirming(false)}
        onSubmit={send}
        title="지원서를 제출할까요?"
        description={`제출한 뒤에는 직접 고칠 수 없습니다. 결과는 ${draft.applicant.email.trim() || '적은 이메일'}로 알려 드립니다.`}
        footer={
          <>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setConfirming(false)} disabled={submit.isPending}>
              다시 보기
            </button>
            <button type="submit" className="btn-primary btn-sm" disabled={submit.isPending}>
              {submit.isPending ? '제출하는 중' : '제출'}
            </button>
          </>
        }
      />
      <Modal
        open={leave.asking}
        onClose={leave.stay}
        onSubmit={leave.go}
        title="이 화면을 나갈까요?"
        description="쓴 답은 이 브라우저에 남아 있어, 다시 들어오면 이어서 쓸 수 있습니다. 동의 체크는 다시 해야 합니다."
        footer={
          <>
            <button type="button" className="btn-secondary btn-sm" onClick={leave.stay}>
              계속 쓰기
            </button>
            <button type="submit" className="btn-primary btn-sm">
              나가기
            </button>
          </>
        }
      />
    </>
  )
}

function RequiredMark({ required }: { required: boolean }) {
  return required ? (
    <>
      <span className={s.star} aria-hidden="true">
        {' '}
        *
      </span>
      <span className="visually-hidden"> (필수)</span>
    </>
  ) : (
    <span className={s.optional}>선택</span>
  )
}

/** 기본 정보 칸 하나 (API-RCT-005 applicant) */
function ApplicantField({
  field,
  value,
  error,
  onChange,
  onBlur,
}: {
  field: (typeof APPLICANT_FIELDS)[number]
  value: string
  error?: string
  onChange: (v: string) => void
  onBlur?: () => void
}) {
  const id = useId()
  const errId = `${id}-err`
  const { key } = field
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>
        {field.label}
        <RequiredMark required={field.required} />
      </label>
      <input
        id={id}
        className={s.input}
        value={value}
        type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
        inputMode={key === 'studentId' ? 'numeric' : key === 'phone' ? 'tel' : undefined}
        autoComplete={key === 'name' ? 'name' : key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'off'}
        maxLength={key === 'studentId' ? 10 : key === 'phone' ? 13 : 100}
        placeholder={PLACEHOLDER[key]}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        onChange={(e) => onChange(key === 'studentId' ? e.target.value.replace(/\D/g, '') : e.target.value)}
        onBlur={onBlur}
      />
      {error && (
        <p id={errId} className={s.error}>
          {error}
        </p>
      )}
    </div>
  )
}

/** 문항 하나: SHORT_TEXT · URL(input) · LONG_TEXT(textarea + 글자 수) · SINGLE_CHOICE(하나 고르기) · MULTI_CHOICE(여러 개 고르기) */
function Question({ q, value, error, onChange }: { q: FormQuestion; value: string | string[] | undefined; error?: string; onChange: (v: string | string[]) => void }) {
  const id = useId()
  const errId = `${id}-err`
  const descId = `${id}-desc`
  const countId = `${id}-count`
  const max = maxLengthOf(q)
  const label = (
    <>
      {q.title}
      <RequiredMark required={q.required} />
    </>
  )
  const desc = q.description && (
    <p id={descId} className={s.qDesc}>
      {q.description}
    </p>
  )
  const err = error && (
    <p id={errId} className={s.error}>
      {error}
    </p>
  )

  if (q.type === 'SINGLE_CHOICE' || q.type === 'MULTI_CHOICE') {
    const multi = q.type === 'MULTI_CHOICE'
    const picked = multi ? (Array.isArray(value) ? value : []) : typeof value === 'string' ? value : ''
    const describedBy = [q.description ? descId : null, error ? errId : null].filter(Boolean).join(' ') || undefined
    return (
      <fieldset className={s.field} aria-describedby={describedBy}>
        <legend className={s.label}>
          {label}
          {multi && <span className={s.optional}>여러 개 고를 수 있어요</span>}
        </legend>
        {desc}
        <div className={s.choices}>
          {(q.options ?? []).map((o) => {
            const on = multi ? (picked as string[]).includes(o) : picked === o
            return (
              <label key={o} className={s.choice}>
                <input
                  type={multi ? 'checkbox' : 'radio'}
                  name={q.questionId}
                  value={o}
                  checked={on}
                  aria-invalid={error ? true : undefined}
                  onChange={() => {
                    if (!multi) return onChange(o)
                    const list = picked as string[]
                    onChange(on ? list.filter((x) => x !== o) : [...list, o])
                  }}
                />
                <span>{o}</span>
              </label>
            )
          })}
        </div>
        {err}
      </fieldset>
    )
  }

  const text = typeof value === 'string' ? value : ''
  const long = q.type === 'LONG_TEXT'
  const describedBy = [q.description ? descId : null, error ? errId : null, long && max ? countId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>
        {label}
      </label>
      {desc}
      {long ? (
        <>
          <textarea id={id} className={`${s.input} ${s.textarea}`} value={text} rows={6} aria-invalid={error ? true : undefined} aria-describedby={describedBy} onChange={(e) => onChange(e.target.value)} />
          {max && (
            <p id={countId} className={`${s.counter} num`} data-over={text.trim().length > max || undefined}>
              {text.trim().length.toLocaleString()} / {max.toLocaleString()}
              <span className="visually-hidden">자</span>
            </p>
          )}
        </>
      ) : (
        <input
          id={id}
          className={s.input}
          value={text}
          type={q.type === 'URL' ? 'url' : 'text'}
          inputMode={q.type === 'URL' ? 'url' : undefined}
          placeholder={q.type === 'URL' ? 'https://' : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {err}
    </div>
  )
}

/** 동의 둘 (F-RCT-005) + 처리방침 요약 · 전문 링크(새 탭, 쓰던 답이 남게, F-COM-005). 둘 다 체크해야 제출되지만, API 에는 privacyConsent 만 보낸다 (AI 채점 동의는 체크박스로만, 2026-11-17 결정) */
function ConsentBox({ value, error, onChange }: { value: Consents; error?: string; onChange: (c: Consents) => void }) {
  const all = value.privacy && value.ai
  return (
    <fieldset className={s.consents} aria-describedby={error ? 'apply-consent-err' : undefined}>
      <legend className="visually-hidden">동의 (모두 필수)</legend>
      <label className={`${s.check} ${s.checkAll}`}>
        <input type="checkbox" checked={all} onChange={(e) => onChange({ privacy: e.target.checked, ai: e.target.checked })} aria-invalid={error && !all ? true : undefined} />
        <span>아래 내용에 모두 동의합니다</span>
      </label>
      <label className={s.check}>
        <input type="checkbox" checked={value.privacy} onChange={(e) => onChange({ ...value, privacy: e.target.checked })} aria-invalid={error && !value.privacy ? true : undefined} />
        <span>
          개인정보 수집 · 이용에 동의합니다 <span className={s.must}>(필수)</span>
        </span>
      </label>
      <details className={s.details}>
        <summary>개인정보 처리방침 요약 보기</summary>
        <dl className={s.policy}>
          <dt>수집 항목</dt>
          <dd>이름 · 학번 · 학과 · 이메일 · 연락처(선택) · 지원 파트 · 응답</dd>
          <dt>이용 목적</dt>
          <dd>지원자 선발 · 결과 안내, 합격 후 회원 계정 생성</dd>
          <dt>학번 관리</dt>
          <dd>본인 확인과 회원 계정 생성에만 씁니다. AI 채점에 보내지 않고, 운영진 목록에서는 가운데를 가려 보여 줍니다.</dd>
          <dt>보유 기간</dt>
          <dd>제출일로부터 1년 (지나면 삭제)</dd>
          <dt>처리 위탁</dt>
          <dd>{PRIVACY_PROCESSOR_SUMMARY} · 미국으로 이전</dd>
        </dl>
        <p className={s.policyMore}>
          <Link className="link-text" to="/privacy" target="_blank" rel="noopener">
            개인정보 처리방침 전문 보기<span className="visually-hidden"> (새 탭)</span>
          </Link>
        </p>
      </details>
      <label className={s.check}>
        <input type="checkbox" checked={value.ai} onChange={(e) => onChange({ ...value, ai: e.target.checked })} aria-invalid={error && !value.ai ? true : undefined} />
        <span>
          AI 자동 채점 활용에 동의합니다 <span className={s.must}>(필수)</span>
        </span>
      </label>
      <details className={s.details}>
        <summary>AI 자동 채점 안내 보기</summary>
        <ul className={s.policyList}>
          <li>AI에는 평가 항목에 해당하는 응답만 보냅니다. 이름 · 학번 · 학과 · 이메일 · 연락처는 보내지 않습니다.</li>
          <li>AI(Google Gemini)에 보낸 응답은 Google의 AI 학습이나 서비스 개선에 쓰이지 않습니다.</li>
          <li>점수는 운영진이 검토할 때 참고하는 점수이며, 합격 여부는 운영진이 결정합니다.</li>
        </ul>
      </details>
      {error && (
        <p id="apply-consent-err" className={s.error}>
          {error}
        </p>
      )}
    </fieldset>
  )
}

/** 접수 완료 (API-RCT-005 201: aid · submittedAt) */
function Done({ result, email, cohort }: { result: ApplicationResult; email: string; cohort: number }) {
  const headRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headRef.current?.focus(), [])
  return (
    <section className={s.done} aria-labelledby="apply-done">
      <h1 id="apply-done" ref={headRef} tabIndex={-1} className={s.title}>
        {cohort}기 지원서를 받았습니다
      </h1>
      <dl className={s.receipt}>
        <div>
          <dt>접수 번호</dt>
          <dd className="num">{result.aid}</dd>
        </div>
        <div>
          <dt>제출 시각</dt>
          <dd className="num">{kstDateTime(result.submittedAt)}</dd>
        </div>
        <div>
          <dt>결과 안내 받을 곳</dt>
          <dd>{email}</dd>
        </div>
      </dl>
      <p className={s.lead}>서류 결과는 이 메일로 알려 드립니다. 메일이 보이지 않으면 스팸함도 확인해 주세요.</p>
      {APPLY_SAMPLE && <p className={s.meta}>예시 화면이라 실제로 접수되지 않았고, 메일도 보내지 않습니다.</p>}
      <p className={s.meta}>
        고칠 내용이 있으면 <a href={`mailto:${CHAPTER.email}`}>{CHAPTER.email}</a>로 알려 주세요.
      </p>
      <div className="btn-row">
        <a className="btn-primary" href={SITE.links.instagram ?? RECRUITING.current.channel} target="_blank" rel="noreferrer">
          인스타그램 보기<span className="visually-hidden"> (새 창)</span>
        </a>
      </div>
    </section>
  )
}

/** 팝업: 진짜 <dialog> + showModal (Esc 로 닫힘, 닫히면 연 버튼으로 초점이 돌아간다). 팀원 찾기 팝업과 같은 방식 */
function Modal({ open, onClose, onSubmit, title, description, footer }: { open: boolean; onClose: () => void; onSubmit: () => void; title: string; description: string; footer: ReactNode }) {
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
      aria-describedby={descId}
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
          onSubmit()
        }}
      >
        <h2 id={titleId} className={s.modalTitle}>
          {title}
        </h2>
        <p id={descId} className={s.modalDesc}>
          {description}
        </p>
        <div className={s.modalFoot}>{footer}</div>
      </form>
    </dialog>
  )
}

/**
 * 쓰던 답이 있으면 사이트 안 이동 전에 묻는다 (답은 임시 보관돼 있어 탭 닫기 · 새로고침은 막지 않는다).
 * 같은 주소 안 이동(?part= 등)은 묻지 않는다.
 */
function useLeaveGuard(dirty: boolean, sent: { current: boolean }) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !sent.current && currentLocation.pathname !== nextLocation.pathname)
  return {
    asking: blocker.state === 'blocked',
    stay: () => blocker.reset?.(),
    go: () => blocker.proceed?.(),
  }
}
