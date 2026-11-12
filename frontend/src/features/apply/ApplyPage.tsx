import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useBlocker, useSearchParams } from 'react-router-dom'
import { PLACE_BY_ID } from '@/config/places'
import { SITE } from '@/config/site'
import { CHAPTER, RECRUITING } from '@/content'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useToday } from '@/hooks/useToday'
import { monthDay, weekday } from '@/lib/date'
import { APPLY_SAMPLE, useApplyForm, useSubmitApplication } from './data/applyRepo'
import { ApplyError, applyErrorText } from './data/repository'
import { FIXED_ID, clearDraft, hasErrors, loadDraft, maxLength, periodState, presetTrack, progress, saveDraft, toInput, validateApplication, type ApplyErrors } from './data/rules'
import type { ApplyReceipt, Consents, FormQuestion, PublicApplyForm } from './data/types'
import s from './apply.module.css'

const NO_CONSENT: Consents = { privacy: false, ai: false }

/** '2026.03.02(월)' */
const fullDay = (ymd: string) => `${ymd.slice(0, 4)}.${monthDay(ymd)}(${weekday(ymd)})`

const PLACEHOLDER: Record<string, string> = { [FIXED_ID.studentId]: '숫자 10자리', [FIXED_ID.email]: 'name@example.com', [FIXED_ID.name]: '홍길동', [FIXED_ID.department]: '컴퓨터공학전공' }

/**
 * 지원서 작성 (/recruits/apply, P-RCT-03).
 * 운영진이 게시한 지원폼(관리자 /admin/recruit/form)의 질문을 그대로 그린다: 단답 · 장문 · 객관식, 필수는 *.
 * 위 '기본 정보'(고정 질문 넷) → '질문'(번호) → 동의 둘 → [제출] → 확인 팝업 → 접수 완료.
 * - 쓰던 답은 이 브라우저에 기수별로 임시 보관한다 (새로고침 · 실수로 닫아도 남게). 제출하면 지운다.
 * - 지원 안내의 파트 카드에서 오면(?part=frontend) 지원 파트를 미리 골라 둔다.
 * - 지원 기간이 아니면 양식 대신 안내를 보여 준다. 예시(APPLY_SAMPLE)일 때는 디자인 확인을 위해 양식을 그대로 보인다.
 */
export function ApplyPage() {
  const form = useApplyForm()
  const generation = form.data?.generation ?? RECRUITING.current.generation
  usePageTitle(`${generation}기 지원서`, PLACE_BY_ID.recruits.label)
  const [receipt, setReceipt] = useState<ApplyReceipt | null>(null)

  let body: ReactNode
  if (form.isPending) body = <p className={s.state}>지원서를 불러오는 중입니다.</p>
  else if (form.isError)
    body = (
      <div className={s.state}>
        <p>지원서를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</p>
        <button type="button" className="btn-secondary btn-sm" onClick={() => void form.refetch()}>
          다시 불러오기
        </button>
      </div>
    )
  else if (receipt) body = <Done receipt={receipt} generation={generation} />
  else if (!form.data) body = <NotOpen generation={generation} why="unset" />
  else body = <Gate form={form.data} onDone={setReceipt} />

  return (
    <div className={`container ${s.page}`}>
      <nav className={s.trail} aria-label="지금 위치">
        <Link to="/recruits">{PLACE_BY_ID.recruits.label}</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">지원서</span>
      </nav>
      {body}
    </div>
  )
}

/** 지원 기간이면 양식, 아니면 안내 (예시면 늘 양식) */
function Gate({ form, onDone }: { form: PublicApplyForm; onDone: (r: ApplyReceipt) => void }) {
  const today = useToday()
  const period = periodState(form, today)
  if (period !== 'open' && !APPLY_SAMPLE) return <NotOpen generation={form.generation} why={period} startDate={form.startDate} />
  return <ApplyForm form={form} period={period} onDone={onDone} />
}

function Head({ form }: { form: PublicApplyForm }) {
  const { startDate, endDate } = form
  return (
    <header className={s.head}>
      <h1 className={s.title}>{form.generation}기 지원서</h1>
      <p className={s.lead}>
        {startDate && endDate ? (
          <>
            지원 기간 <span className="num">{fullDay(startDate)} 00:00</span> ~ <span className="num">{fullDay(endDate)} 23:59</span>
          </>
        ) : (
          '지원 기간은 정해지면 이곳과 인스타그램에 알립니다.'
        )}
      </p>
      <p className={s.meta}>
        <span className={s.star} aria-hidden="true">
          *
        </span>{' '}
        표시는 꼭 답해야 하는 질문입니다. 쓰는 동안 답은 이 브라우저에 임시로 남습니다.
      </p>
    </header>
  )
}

function ApplyForm({ form, period, onDone }: { form: PublicApplyForm; period: ReturnType<typeof periodState>; onDone: (r: ApplyReceipt) => void }) {
  const [params] = useSearchParams()
  const submit = useSubmitApplication()
  const formRef = useRef<HTMLFormElement>(null)
  const [answers, setAnswers] = useState<Record<string, string>>(() => ({ ...presetTrack(form, params.get('part')), ...loadDraft(form.generation) }))
  const [consents, setConsents] = useState<Consents>(NO_CONSENT)
  const [errors, setErrors] = useState<ApplyErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const sent = useRef(false)

  // 임시 보관: 입력이 멈추고 0.4초 뒤
  useEffect(() => {
    const t = setTimeout(() => saveDraft(form.generation, answers), 400)
    return () => clearTimeout(t)
  }, [answers, form.generation])

  const dirty = Object.values(answers).some((v) => v.trim())
  const leave = useLeaveGuard(dirty && !submit.isPending, sent)

  const fixed = form.questions.filter((q) => q.fixed)
  const rest = form.questions.filter((q) => !q.fixed)
  const { done, total } = useMemo(() => progress(form, answers), [form, answers])

  const set = (id: string, v: string) => {
    setAnswers((a) => ({ ...a, [id]: v }))
    if (errors[id]) setErrors((e) => ({ ...e, [id]: undefined }))
  }

  const check = () => {
    setFormError(null)
    const found = validateApplication(form, answers, consents)
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
    submit.mutate(toInput(form, answers, consents), {
      onSuccess: (r) => {
        sent.current = true
        clearDraft(form.generation)
        setConfirming(false)
        onDone(r)
        window.scrollTo({ top: 0 })
      },
      onError: (e) => {
        setConfirming(false)
        if (e instanceof ApplyError && e.fields) setErrors(e.fields)
        setFormError(applyErrorText(e))
      },
    })
  }

  return (
    <>
      <Head form={form} />
      {APPLY_SAMPLE && (
        <aside className={s.sample} aria-label="예시 화면 안내">
          <span className="sample-badge">예시</span>
          <p>
            지원서 화면을 준비하는 동안 보여 드리는 예시입니다. 질문은 예시이고, 제출해도 접수되지 않습니다.
            {period !== 'open' && ` 실제 ${form.generation}기 지원은 모집이 열리면 받습니다.`}
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
            {fixed.map((q) => (
              <Question key={q.id} q={q} value={answers[q.id] ?? ''} error={errors[q.id]} onChange={(v) => set(q.id, v)} />
            ))}
          </div>
        </section>

        <section className={s.block} aria-labelledby="apply-questions">
          <h2 id="apply-questions" className={s.blockTitle}>
            질문
          </h2>
          <ol className={s.questions}>
            {rest.map((q, i) => (
              <li key={q.id} className={s.qItem}>
                <span className={`${s.qNo} num`} aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Question q={q} value={answers[q.id] ?? ''} error={errors[q.id]} onChange={(v) => set(q.id, v)} />
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
              if (errors.consents) setErrors((e) => ({ ...e, consents: undefined }))
            }}
          />
        </section>

        <div className={s.foot}>
          <p className={s.progress}>
            필수 질문 <span className="num">{done}</span> / <span className="num">{total}</span>
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
        description={`제출한 뒤에는 직접 고칠 수 없습니다. 결과는 ${answers[FIXED_ID.email]?.trim() || '적은 이메일'}로 알려 드립니다.`}
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

/** 질문 하나: 단답(input) · 장문(textarea + 글자 수) · 객관식(알약 고르기) */
function Question({ q, value, error, onChange }: { q: FormQuestion; value: string; error?: string; onChange: (v: string) => void }) {
  const id = useId()
  const errId = `${id}-err`
  const countId = `${id}-count`
  const max = maxLength(q)
  const label = (
    <>
      {q.title}
      {q.required ? (
        <>
          <span className={s.star} aria-hidden="true">
            {' '}
            *
          </span>
          <span className="visually-hidden"> (필수)</span>
        </>
      ) : (
        !/선택/.test(q.title) && <span className={s.optional}>선택</span>
      )}
    </>
  )
  const err = error && (
    <p id={errId} className={s.error}>
      {error}
    </p>
  )

  if (q.type === 'choice')
    return (
      <fieldset className={s.field} aria-describedby={error ? errId : undefined}>
        <legend className={s.label}>{label}</legend>
        <div className={s.choices}>
          {q.options.map((o) => (
            <label key={o} className={s.choice}>
              <input type="radio" name={q.id} value={o} checked={value === o} onChange={() => onChange(o)} aria-invalid={error ? true : undefined} />
              <span>{o}</span>
            </label>
          ))}
        </div>
        {err}
      </fieldset>
    )

  const describedBy = [error ? errId : null, q.type === 'long' ? countId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>
        {label}
      </label>
      {q.type === 'long' ? (
        <>
          <textarea id={id} className={`${s.input} ${s.textarea}`} value={value} rows={6} aria-invalid={error ? true : undefined} aria-describedby={describedBy} onChange={(e) => onChange(e.target.value)} />
          <p id={countId} className={`${s.counter} num`} data-over={value.trim().length > max || undefined}>
            {value.trim().length.toLocaleString()} / {max.toLocaleString()}
            <span className="visually-hidden">자</span>
          </p>
        </>
      ) : (
        <input
          id={id}
          className={s.input}
          value={value}
          type={q.id === FIXED_ID.email ? 'email' : q.id === 'q-link' ? 'url' : 'text'}
          inputMode={q.id === FIXED_ID.studentId ? 'numeric' : undefined}
          autoComplete={q.id === FIXED_ID.name ? 'name' : q.id === FIXED_ID.email ? 'email' : 'off'}
          maxLength={q.id === FIXED_ID.studentId ? 10 : undefined}
          placeholder={PLACEHOLDER[q.id]}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(q.id === FIXED_ID.studentId ? e.target.value.replace(/\D/g, '') : e.target.value)}
        />
      )}
      {err}
    </div>
  )
}

/** 동의 둘 (F-RCT-005 4 · 5) + 처리방침 요약. 문구는 관리자 '지원서 미리보기'와 같다 */
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
          <dd>이름 · 학번 · 학과 · 이메일 · 응답</dd>
          <dt>이용 목적</dt>
          <dd>지원자 선발 · 결과 안내, 합격 후 회원 계정 생성</dd>
          <dt>학번 관리</dt>
          <dd>본인 확인과 회원 계정 생성에만 씁니다. AI 채점에 보내지 않고, 운영진 목록에서는 가운데를 가려 보여 줍니다.</dd>
          <dt>보유 기간</dt>
          <dd>제출일로부터 1년 (지나면 삭제)</dd>
        </dl>
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
          <li>AI에는 평가 항목에 해당하는 응답만 보냅니다. 이름 · 학번 · 학과 · 이메일은 보내지 않습니다.</li>
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

/** 접수 완료 */
function Done({ receipt, generation }: { receipt: ApplyReceipt; generation: number }) {
  const headRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headRef.current?.focus(), [])
  return (
    <section className={s.done} aria-labelledby="apply-done">
      <h1 id="apply-done" ref={headRef} tabIndex={-1} className={s.title}>
        지원서를 받았습니다
      </h1>
      <dl className={s.receipt}>
        <div>
          <dt>접수 번호</dt>
          <dd className="num">
            {generation}-{String(receipt.no).padStart(3, '0')}
          </dd>
        </div>
        <div>
          <dt>결과 안내 받을 곳</dt>
          <dd>{receipt.email}</dd>
        </div>
      </dl>
      <p className={s.lead}>서류 결과는 이 메일로 알려 드립니다. 메일이 보이지 않으면 스팸함도 확인해 주세요.</p>
      {APPLY_SAMPLE && <p className={s.meta}>예시 화면이라 실제로 접수되지 않았고, 메일도 보내지 않습니다.</p>}
      <p className={s.meta}>
        고칠 내용이 있으면 <a href={`mailto:${CHAPTER.email}`}>{CHAPTER.email}</a>로 알려 주세요.
      </p>
      <div className="btn-row">
        <Link to="/" className="btn-primary">
          홈으로
        </Link>
        <a className="btn-secondary" href={SITE.links.instagram ?? RECRUITING.current.channel} target="_blank" rel="noreferrer">
          인스타그램 보기<span className="visually-hidden"> (새 창)</span>
        </a>
      </div>
    </section>
  )
}

/** 지원 기간이 아닐 때 (예시가 아닐 때만) */
function NotOpen({ generation, why, startDate }: { generation: number; why: ReturnType<typeof periodState>; startDate?: string | null }) {
  const title = why === 'after' ? `${generation}기 지원이 마감됐습니다` : why === 'before' && startDate ? `${generation}기 지원은 ${monthDay(startDate)}에 열립니다` : '지금은 지원 기간이 아닙니다'
  return (
    <section className={s.done} aria-labelledby="apply-closed">
      <h1 id="apply-closed" className={s.title}>
        {title}
      </h1>
      <p className={s.lead}>모집 일정과 결과는 인스타그램 {SITE.links.instagramHandle}에 가장 먼저 올립니다.</p>
      <div className="btn-row">
        <a className="btn-primary" href={RECRUITING.current.channel} target="_blank" rel="noreferrer">
          {generation}기 소식 받기<span className="visually-hidden"> (인스타그램, 새 창)</span>
        </a>
        <Link to="/recruits" className="btn-secondary">
          지원 안내 보기
        </Link>
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
