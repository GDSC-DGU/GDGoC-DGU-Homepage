import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { useToday } from '@/hooks/useToday'
import { TeamsError, errorText, isAuthError } from './data/repository'
import {
  CONTENT_MAX,
  EMPTY_CRED,
  FILE_ACCEPT,
  FILE_MAX,
  FILE_TYPES,
  HEADCOUNT_MAX,
  TITLE_MAX,
  authorLabel,
  credReady,
  fileError,
  reopenError,
  sizeLabel,
  validatePost,
  type FieldErrors,
} from './data/rules'
import { TEAMS_SAMPLE_DATA, heldCredentials, useCreatePost, useTeamPost, useTeamsRepo, useUpdatePost } from './data/teamsRepo'
import { RECRUIT_STATUSES, TEAMS_CATEGORIES, TEAM_PARTS, type Attachment, type Credentials, type PostInput, type RecruitStatus, type TeamPartId, type TeamPost, type TeamsCategory } from './data/types'
import { ConfirmDialog, CredentialFields, SampleNotice, VerifyDialog } from './parts'
import type { FromList } from './TeamsListPage'
import s from './teams.module.css'
import { PLACE_BY_ID } from '@/config/places'
import { usePageTitle } from '@/hooks/usePageTitle'

/**
 * 모집 글 쓰기 (/teams/write) · 고치기 (/teams/:postId/edit), P-TEM-002.
 * - 쓰기: 작성자 확인(학번 · PIN) → 분류 · 제목 · 모집 기간 · 구하는 파트 · 모집 인원 · 연락 방법 · 내용 · 첨부 → [등록].
 *   학번 · PIN 을 모두 넣어야 [등록]과 파일 고르기가 켜진다. 틀리면 안내하고 쓴 내용은 그대로 둔다.
 * - 고치기: 글 화면의 본인 확인을 거쳐 열린다 (넣은 학번 · PIN 은 이 화면이 열려 있는 동안만 메모리에). 새로고침하면 다시 묻는다.
 *   모집 상태(모집중 · 마감)도 바꿀 수 있다.
 * - 쓰던 내용이 있으면 [취소]에서 '작성 중인 내용이 사라집니다.'를 묻고, 탭을 닫으려 하면 브라우저가 한 번 묻는다.
 */
export function TeamsWritePage({ mode }: { mode: 'create' | 'edit' }) {
  usePageTitle(mode === 'edit' ? '글 수정' : '글쓰기', PLACE_BY_ID.teams.label)
  return (
    <div className={`container ${s.page} ${s.narrow}`}>
      <header className={s.writeHead}>
        <h1 className={s.writeTitle}>
          <span className={s.writeMark} aria-hidden="true" />
          {mode === 'create' ? '게시글 작성' : '게시글 수정'}
        </h1>
      </header>
      {TEAMS_SAMPLE_DATA && <SampleNotice compact />}
      {mode === 'create' ? <PostForm initial={EMPTY_FORM} /> : <EditGate />}
    </div>
  )
}

/** 고치기: 글을 불러오고, 본인 확인을 거친 학번 · PIN 이 있어야 양식을 연다 */
function EditGate() {
  const { postId = '' } = useParams()
  const post = useTeamPost(postId)
  const repo = useTeamsRepo()
  const navigate = useNavigate()
  const [cred, setCred] = useState<Credentials | null>(() => heldCredentials.get(postId))
  // 화면을 떠나면 잊는다
  useEffect(() => () => heldCredentials.clear(postId), [postId])

  if (post.isPending) return <p className={s.state}>글을 불러오는 중입니다.</p>
  if (post.isError)
    return (
      <div className={s.state}>
        <p>{post.error instanceof TeamsError ? post.error.message : '글을 불러오지 못했습니다.'}</p>
        <Link to="/teams" className="link-go">
          목록으로
        </Link>
      </div>
    )
  if (!cred)
    return (
      <>
        <p className={s.state}>본인 확인을 거쳐야 글을 고칠 수 있습니다.</p>
        <VerifyDialog open action="수정" verify={(c) => repo.verifyAuthor(postId, c)} onVerified={setCred} onClose={() => navigate(`/teams/${postId}`, { replace: true })} />
      </>
    )
  return <PostForm key={post.data.id} initial={formOf(post.data)} edit={{ post: post.data, cred }} />
}

interface FormState {
  category: TeamsCategory | ''
  title: string
  startDate: string
  endDate: string
  parts: TeamPartId[]
  headcount: string
  contactUrl: string
  content: string
  status: RecruitStatus
  files: Attachment[]
}

const EMPTY_FORM: FormState = { category: '', title: '', startDate: '', endDate: '', parts: [], headcount: '', contactUrl: '', content: '', status: '모집중', files: [] }

const formOf = (p: TeamPost): FormState => ({
  category: p.category,
  title: p.title,
  startDate: p.startDate,
  endDate: p.endDate,
  parts: p.parts,
  headcount: p.headcount ? String(p.headcount) : '',
  contactUrl: p.contactUrl ?? '',
  content: p.content,
  status: p.status,
  files: p.attachments,
})

const toInput = (f: FormState): PostInput => ({
  category: f.category as TeamsCategory,
  title: f.title,
  startDate: f.startDate,
  endDate: f.endDate,
  parts: f.parts,
  headcount: f.headcount ? Number(f.headcount) : null,
  contactUrl: f.contactUrl.trim() || null,
  content: f.content,
  attachmentIds: f.files.map((a) => a.id),
})

function PostForm({ initial, edit }: { initial: FormState; edit?: { post: TeamPost; cred: Credentials } }) {
  const navigate = useNavigate()
  const repo = useTeamsRepo()
  const today = useToday()
  const create = useCreatePost()
  const update = useUpdatePost()
  const formRef = useRef<HTMLFormElement>(null)
  const [form, setForm] = useState<FormState>(initial)
  const [cred, setCred] = useState<Credentials>(edit?.cred ?? EMPTY_CRED)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [authError, setAuthError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [fileMsg, setFileMsg] = useState<string | null>(null)
  const [uploading, setUploading] = useState(0)
  const busy = create.isPending || update.isPending
  /** 저장이 끝나 떠나는 이동은 묻지 않는다 */
  const saved = useRef(false)

  const initialJson = useMemo(() => JSON.stringify(initial), [initial])
  const dirty = JSON.stringify(form) !== initialJson || (!edit && (cred.studentId !== '' || cred.pin !== ''))
  const leave = useLeaveGuard(dirty && !busy, saved)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key as keyof FieldErrors]) setErrors((e) => ({ ...e, [key]: undefined }))
  }
  const back = edit ? `/teams/${edit.post.id}` : '/teams'

  const submit = () => {
    setFormError(null)
    setAuthError(null)
    const input = toInput(form)
    const found: FieldErrors = validatePost(input)
    if (edit && form.status === '모집중') {
      const err = reopenError(form.endDate, today)
      if (err && !found.startDate) found.status = err
    }
    if (!edit && !found.startDate && form.endDate < today) found.startDate = '종료일은 오늘이거나 그 뒤로 골라 주세요.'
    if (Object.values(found).some(Boolean)) {
      setErrors(found)
      setFormError('입력한 내용을 확인해 주세요.')
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    const onError = (e: unknown) => {
      if (e instanceof TeamsError && e.code === 'INVALID' && e.fields) {
        setErrors(e.fields)
        setFormError(e.message)
      } else if (isAuthError(e)) {
        setAuthError(errorText(e))
        if (!edit) setCred((c) => ({ ...c, pin: '' }))
      } else setFormError(errorText(e))
    }
    if (edit) {
      update.mutate({ id: edit.post.id, input: { ...input, status: form.status }, cred }, { onSuccess: () => ((saved.current = true), navigate(`/teams/${edit.post.id}`, { replace: true })), onError })
    } else {
      create.mutate({ input, cred }, { onSuccess: () => ((saved.current = true), navigate('/teams', { state: { flash: '게시글을 등록했습니다.' } satisfies FromList })), onError })
    }
  }

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return
    setFileMsg(null)
    const room = FILE_MAX - form.files.length
    const picked = Array.from(list)
    if (picked.length > room) setFileMsg(`첨부파일은 ${FILE_MAX}개까지 올릴 수 있습니다.`)
    for (const file of picked.slice(0, Math.max(0, room))) {
      const err = fileError(file)
      if (err) {
        setFileMsg(err)
        continue
      }
      setUploading((n) => n + 1)
      try {
        const a = await repo.upload(file, cred)
        setForm((f) => (f.files.length < FILE_MAX ? { ...f, files: [...f.files, a] } : f))
      } catch (e) {
        setFileMsg(errorText(e))
      } finally {
        setUploading((n) => n - 1)
      }
    }
  }

  const canSubmit = credReady(cred) && uploading === 0 && !busy

  return (
    <>
    <form
      ref={formRef}
      className={s.form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {/* 작성자 확인 */}
      {edit ? (
        <p className={s.authorDone}>
          작성자 확인됨: <strong>{authorLabel(edit.post.author)}</strong>
        </p>
      ) : (
        <fieldset className={s.authorBox}>
          <legend className={s.authorLegend}>
            작성자 확인 <span className={s.required}>필수</span>
          </legend>
          <CredentialFields idPrefix="write" value={cred} onChange={setCred} invalid={Boolean(authError)} />
          <p className={s.help}>[등록]을 누를 때 학번과 PIN을 함께 확인합니다. 인증 상태는 저장되지 않아 글을 쓸 때마다 입력합니다. 5번 틀리면 15분 동안 입력할 수 없고, 다시 5번 틀리면 계정이 잠겨 운영진이 풀어야 합니다.</p>
          {authError && (
            <p className={s.error} role="alert">
              {authError}
            </p>
          )}
        </fieldset>
      )}

      <Field label="분류" error={errors.category} group>
        <div className={s.chips} role="radiogroup" aria-label="분류">
          {TEAMS_CATEGORIES.map((c) => (
            <label key={c} className={s.chip}>
              <input type="radio" name="category" value={c} checked={form.category === c} onChange={() => set('category', c)} aria-invalid={errors.category ? true : undefined} />
              <span>{c}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field label="제목" error={errors.title}>
        {(id, describedBy) => (
          <input id={id} className={s.input} value={form.title} maxLength={TITLE_MAX} placeholder="제목을 입력하세요" aria-invalid={errors.title ? true : undefined} aria-describedby={describedBy} onChange={(e) => set('title', e.target.value)} />
        )}
      </Field>

      <Field label="모집 기간" error={errors.startDate} group>
        <div className={s.period}>
          <label>
            <span className="visually-hidden">시작일</span>
            <input type="date" className={s.input} value={form.startDate} aria-invalid={errors.startDate ? true : undefined} onChange={(e) => set('startDate', e.target.value)} />
          </label>
          <span aria-hidden="true">~</span>
          <label>
            <span className="visually-hidden">종료일</span>
            <input type="date" className={s.input} value={form.endDate} min={edit ? form.startDate || undefined : [form.startDate, today].filter(Boolean).sort().at(-1)} aria-invalid={errors.startDate ? true : undefined} onChange={(e) => set('endDate', e.target.value)} />
          </label>
        </div>
        <p className={s.help}>종료일 다음 날 0시에 자동으로 마감됩니다.</p>
      </Field>

      <div className={s.twoCol}>
        <Field label="구하는 파트" hint="선택, 여러 개 고를 수 있습니다" error={errors.parts} group>
          <div className={s.chips} lang="en">
            {TEAM_PARTS.map((p) => (
              <label key={p.id} className={s.chip}>
                <input type="checkbox" checked={form.parts.includes(p.id)} onChange={(e) => set('parts', e.target.checked ? TEAM_PARTS.map((x) => x.id).filter((id) => id === p.id || form.parts.includes(id)) : form.parts.filter((x) => x !== p.id))} />
                <span>{p.short}</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="모집 인원" hint="선택" error={errors.headcount}>
          {(id, describedBy) => (
            <select id={id} className={`${s.input} ${s.selectInput}`} value={form.headcount} aria-describedby={describedBy} aria-invalid={errors.headcount ? true : undefined} onChange={(e) => set('headcount', e.target.value)}>
              <option value="">정하지 않음</option>
              {Array.from({ length: HEADCOUNT_MAX }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}명
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <Field label="연락 방법 링크" hint="선택 (오픈채팅, 디스코드 등)" error={errors.contactUrl}>
        {(id, describedBy) => (
          <input id={id} type="url" inputMode="url" className={s.input} value={form.contactUrl} placeholder="https://" aria-invalid={errors.contactUrl ? true : undefined} aria-describedby={describedBy} onChange={(e) => set('contactUrl', e.target.value)} />
        )}
      </Field>

      <Field label="내용" error={errors.content} counter={`${form.content.length.toLocaleString()} / ${CONTENT_MAX.toLocaleString()}`}>
        {(id, describedBy) => (
          <textarea id={id} className={`${s.input} ${s.textarea}`} value={form.content} maxLength={CONTENT_MAX} placeholder="어떤 팀원을 찾는지, 언제 어떻게 진행하는지 적어 주세요" aria-invalid={errors.content ? true : undefined} aria-describedby={describedBy} onChange={(e) => set('content', e.target.value)} />
        )}
      </Field>

      <Field label="첨부파일" hint="선택" error={errors.attachmentIds} group>
        <FileDrop disabled={!credReady(cred) || form.files.length >= FILE_MAX} busy={uploading > 0} onFiles={addFiles} full={form.files.length >= FILE_MAX} />
        {fileMsg && (
          <p className={s.error} role="alert">
            {fileMsg}
          </p>
        )}
        {form.files.length > 0 && (
          <ul className={s.fileList}>
            {form.files.map((f) => (
              <li key={f.id} className={s.fileRow}>
                <span className={s.fileType}>{FILE_TYPES[f.type] ?? '파일'}</span>
                <span className={s.fileName}>{f.name}</span>
                <span className={`${s.fileSize} num`}>{sizeLabel(f.size)}</span>
                <button type="button" className={s.fileDown} onClick={() => set('files', form.files.filter((x) => x.id !== f.id))}>
                  삭제<span className="visually-hidden"> {f.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>

      {edit && (
        <Field label="모집 상태" error={errors.status} group>
          <div className={s.chips} role="radiogroup" aria-label="모집 상태">
            {RECRUIT_STATUSES.map((st) => (
              <label key={st} className={s.chip}>
                <input type="radio" name="status" value={st} checked={form.status === st} onChange={() => set('status', st)} aria-invalid={errors.status ? true : undefined} />
                <span>{st}</span>
              </label>
            ))}
          </div>
          <p className={s.help}>'마감'으로 바꾸면 종료일 전이라도 바로 마감됩니다.</p>
        </Field>
      )}

      <div className={s.formFoot}>
        <p className={s.formMsg} role="alert">
          {formError && <span className={s.errorText}>{formError}</span>}
        </p>
        <button type="button" className={`btn-secondary btn-sm ${s.lineBtn}`} onClick={() => navigate(back)}>
          취소
        </button>
        <button type="submit" className={`btn-primary btn-sm ${s.submitBtn}`} disabled={!canSubmit}>
          {busy ? '저장하는 중' : edit ? '저장' : '등록'}
        </button>
      </div>
      {!credReady(cred) && !edit && <p className={`${s.help} ${s.footHelp}`}>학번과 PIN을 모두 넣으면 [등록]을 누를 수 있습니다.</p>}
    </form>
    {/* 팝업은 글쓰기 <form> 밖에 둔다 (폼 안의 폼이면 팝업 제출이 글쓰기 폼까지 올라간다) */}
    <ConfirmDialog open={leave.asking} title="작성 중인 내용이 사라집니다." description="지금 나가면 쓴 내용은 저장되지 않습니다." cancelLabel="계속 쓰기" confirmLabel="나가기" onClose={leave.stay} onConfirm={leave.go} />
    </>
  )
}

/** 입력 칸 하나: 이름표 · 도움말 · 오류. group 이면 fieldset + legend (여러 칸 · 고르기) */
function Field({ label, hint, error, counter, group = false, children }: { label: string; hint?: string; error?: string; counter?: string; group?: boolean; children: ReactNode | ((id: string, describedBy: string | undefined) => ReactNode) }) {
  const id = useId()
  const errId = `${id}-err`
  const head = (
    <>
      {label}
      {hint && <span className={s.hint}>{hint}</span>}
    </>
  )
  const tail = (
    <>
      {counter && (
        <p className={`${s.counter} num`} aria-hidden="true">
          {counter}
        </p>
      )}
      {error && (
        <p id={errId} className={s.error}>
          {error}
        </p>
      )}
    </>
  )
  if (group)
    return (
      <fieldset className={s.field} aria-describedby={error ? errId : undefined}>
        <legend className={s.label}>{head}</legend>
        {typeof children === 'function' ? children(id, error ? errId : undefined) : children}
        {tail}
      </fieldset>
    )
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>
        {head}
      </label>
      {typeof children === 'function' ? children(id, error ? errId : undefined) : children}
      {tail}
    </div>
  )
}

/** 파일 놓는 자리 + [파일 선택]. 학번 · PIN 을 넣어야 켜진다 (F-TEM-002 3) */
function FileDrop({ disabled, busy, full, onFiles }: { disabled: boolean; busy: boolean; full: boolean; onFiles: (files: FileList | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div
      className={s.drop}
      data-over={over || undefined}
      data-disabled={disabled || undefined}
      onDragOver={(e) => {
        if (disabled) return
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        if (!disabled) onFiles(e.dataTransfer.files)
      }}
    >
      <p className={s.dropMain}>
        {busy ? (
          '올리는 중…'
        ) : (
          <>
            파일을 끌어다 놓거나{' '}
            <button type="button" className={s.dropBtn} disabled={disabled} onClick={() => inputRef.current?.click()}>
              파일 선택
            </button>
          </>
        )}
      </p>
      <p className={s.dropSub}>{full ? `첨부파일은 ${FILE_MAX}개까지입니다.` : disabled ? '학번과 PIN을 먼저 넣어야 파일을 고를 수 있습니다.' : `PDF, JPG, PNG 파일당 10MB 이하, 최대 ${FILE_MAX}개`}</p>
      <input
        ref={inputRef}
        type="file"
        accept={FILE_ACCEPT}
        multiple
        hidden
        disabled={disabled}
        onChange={(e) => {
          onFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}

/**
 * 쓰던 내용이 있으면 떠나기 전에 묻는다.
 * - 사이트 안 이동(취소 · 뒤로가기 · 머리말 메뉴): 라우터가 멈추고 '작성 중인 내용이 사라집니다' 팝업
 * - 탭 닫기 · 새로고침: 브라우저 기본 확인
 */
function useLeaveGuard(dirty: boolean, saved: { current: boolean }) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !saved.current && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search))
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
  return {
    asking: blocker.state === 'blocked',
    stay: () => blocker.reset?.(),
    go: () => blocker.proceed?.(),
  }
}
