import { sampleOnly } from '../sample'
import { useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { actorLabel, adminKeys, errorMessage, isAdminRepoError, useAdminRepos } from '../data'
import { formLockViolation, validateForm } from '../data/recruit/rules'
import type { FormQuestion, RecruitFormBody } from '../data/recruit/types'
import { adminPath } from '../screens'
import { DateTimeField, EmptyState, PageHeader, Panel, StatusBadge, TextField, deleteConfirm, focusFirstInvalid, formatDateTimeLong, formatPeriod, useConfirm, useToast } from '../ui'
import { IconLock } from '../ui/icons'
import { FormPreviewDialog, type PreviewForm } from './FormPreviewDialog'
import { QuestionCard } from './QuestionCard'
import { Button, FormTabs } from './badges'
import { useAction, useAnnouncer, useLeaveGuard } from './hooks'
import s from './recruit.module.css'

interface EditForm {
  generation: string
  startDate: string
  endDate: string
  questions: FormQuestion[]
}

const fromBody = (b: RecruitFormBody): EditForm => ({ generation: String(b.generation || ''), startDate: b.startDate ?? '', endDate: b.endDate ?? '', questions: structuredClone(b.questions) })
const toBody = (f: EditForm): RecruitFormBody => ({
  generation: Number(f.generation) || 0,
  startDate: f.startDate || null,
  endDate: f.endDate || null,
  questions: f.questions.map((q) => ({ ...q, title: q.title.trim(), options: q.type === 'choice' ? q.options.map((o) => o.trim()) : [] })),
})
const snapshot = (f: EditForm) => JSON.stringify(toBody(f))

let seq = 0
const newQuestionId = () => `q-new-${Date.now().toString(36)}-${++seq}`

/** 지원 기간의 지금 상태 (KST 날짜 기준) */
function periodState(start: string | null, end: string | null): { label: string; tone: 'success' | 'pending' | 'muted' } | null {
  if (!start || !end) return null
  const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)
  if (today < start) return { label: '지원 기간 전', tone: 'pending' }
  if (today > end) return { label: '지원 기간 끝남', tone: 'muted' }
  return { label: '접수 중', tone: 'success' }
}

/**
 * 지원폼 작성 (P-ARC-01, Figma 07-4, F-ARC-001~005).
 * 임시 저장본(없으면 게시본)을 불러와 기본 설정(기수 · 지원 기간)과 질문 카드로 편집한다. 저장 전에는 서버에 반영되지 않는다.
 * 고정 질문(이름 · 학번 · 학과 · 이메일)은 늘 맨 앞 · 필수. 접수가 시작되면 기존 응답과 맞지 않게 되는 변경을 막는다 (임시 규칙, data/recruit/rules.ts formLockViolation).
 */
export function RecruitFormPage() {
  const repos = useAdminRepos()
  const toast = useToast()
  const confirm = useConfirm()
  const form = useQuery({ queryKey: adminKeys.section('recruit', 'form'), queryFn: () => repos.recruit.getForm() })
  const criteria = useQuery({ queryKey: adminKeys.section('recruit', 'criteria'), queryFn: () => repos.recruit.getCriteria() })
  const data = form.data

  const [edit, setEdit] = useState<EditForm | null>(null)
  const [baseline, setBaseline] = useState<string | null>(null)
  if (data && !edit) {
    const src = fromBody((data.draft ?? data.published)!)
    setEdit(src)
    setBaseline(snapshot(src))
  }
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const addRef = useRef<HTMLButtonElement>(null)
  const announcer = useAnnouncer()

  const dirty = !!edit && baseline !== snapshot(edit)
  useLeaveGuard(dirty)

  const save = useAction((body: RecruitFormBody) => repos.recruit.saveDraft(body))
  const publish = useAction((body: RecruitFormBody) => repos.recruit.publish(body))

  if (form.isError && !data) {
    return (
      <>
        <PageHeader title="지원폼 작성" />
        <FormTabs />
        <EmptyState title="지원폼을 불러오지 못했습니다." description={errorMessage(form.error)} action={<Button onClick={() => void form.refetch()}>다시 불러오기</Button>} />
      </>
    )
  }
  if (!data || !edit) {
    return (
      <>
        <PageHeader title="지원폼 작성" description="지원서 질문과 모집 기수 · 지원 기간을 정해 임시 저장하거나 게시합니다." />
        <FormTabs />
        <p className={s.loading} role="status">
          지원폼을 불러오는 중입니다…
        </p>
      </>
    )
  }

  const locked = new Set(data.lockedQuestionIds)
  const anyLocked = locked.size > 0
  const fixed = edit.questions.filter((q) => q.fixed)
  const custom = edit.questions.filter((q) => !q.fixed)
  const criteriaReady = (criteria.data?.items.length ?? 0) > 0

  const patch = (next: Partial<EditForm>) => setEdit({ ...edit, ...next })
  const setQuestion = (q: FormQuestion) => patch({ questions: edit.questions.map((x) => (x.id === q.id ? q : x)) })
  const focusLater = (selector: string) =>
    requestAnimationFrame(() => {
      const el = rootRef.current?.querySelector<HTMLElement>(selector)
      el?.focus()
    })

  const move = (q: FormQuestion, dir: -1 | 1) => {
    const list = [...custom]
    const i = list.findIndex((x) => x.id === q.id)
    const j = i + dir
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    patch({ questions: [...fixed, ...list] })
    announcer.say(`질문 ${fixed.length + i + 1}을 ${fixed.length + j + 1}번째로 옮겼습니다.`)
    focusLater(`[data-move="${q.id}:${dir < 0 ? 'up' : 'down'}"]`)
  }
  const add = () => {
    const q: FormQuestion = { id: newQuestionId(), title: '', type: 'short', required: !anyLocked, options: [], fixed: false }
    patch({ questions: [...edit.questions, q] })
    announcer.say(`질문 ${edit.questions.length + 1}을 추가했습니다.`)
    focusLater(`[data-question-title="${q.id}"]`)
  }
  const remove = async (q: FormQuestion) => {
    const i = custom.findIndex((x) => x.id === q.id)
    const ok = await confirm(
      deleteConfirm('질문', 1, q.title.trim() ? `'${q.title.trim()}' 질문을 지웁니다. 저장하기 전에는 홈페이지에 반영되지 않습니다.` : '저장하기 전에는 홈페이지에 반영되지 않습니다.'),
    )
    if (!ok) return
    const rest = custom.filter((x) => x.id !== q.id)
    patch({ questions: [...fixed, ...rest] })
    announcer.say(`질문 ${fixed.length + i + 1}을 삭제했습니다.`)
    const next = rest[i] ?? rest[i - 1]
    if (next) focusLater(`[data-question-title="${next.id}"]`)
    else requestAnimationFrame(() => addRef.current?.focus())
  }
  const addOption = (q: FormQuestion) => {
    setQuestion({ ...q, options: [...q.options, ''] })
    focusLater(`[data-option="${q.id}:${q.options.length}"]`)
  }
  const removeOption = (q: FormQuestion, index: number) => {
    setQuestion({ ...q, options: q.options.filter((_, j) => j !== index) })
    announcer.say(`선택지 ${index + 1}을 삭제했습니다.`)
    focusLater(index > 0 ? `[data-option="${q.id}:${index - 1}"]` : `[data-add-option="${q.id}"]`)
  }

  const showErrors = (fields: Record<string, string>) => {
    setErrors(fields)
    requestAnimationFrame(() => focusFirstInvalid(rootRef.current))
  }
  const handleError = (e: unknown) => {
    if (isAdminRepoError(e) && e.fields) showErrors(e.fields)
    toast.error(errorMessage(e))
  }

  const onSaveDraft = async () => {
    const body = toBody(edit)
    const fields = validateForm(body, { publish: false })
    if (Object.keys(fields).length) return showErrors(fields)
    setErrors({})
    try {
      const v = await save.run(body)
      setBaseline(snapshot(edit))
      toast.success(`임시 저장했습니다 (${formatDateTimeLong(v.draftSaved!.at)}). 홈페이지에는 반영되지 않습니다.`)
    } catch (e) {
      handleError(e)
    }
  }

  const onPublish = async () => {
    const body = toBody(edit)
    const fields = validateForm(body, { publish: true })
    if (Object.keys(fields).length) {
      return showErrors(fields)
    }
    setErrors({})
    const lock = formLockViolation(body, data.published, data.lockedQuestionIds)
    if (lock) return toast.error(lock)
    if (!criteriaReady) return toast.error('평가 기준을 먼저 저장해 주세요. 평가 기준이 있어야 게시할 수 있습니다.')
    const ok = await confirm({
      title: '지원폼을 게시할까요?',
      body: `홈페이지 Recruits의 지원서 양식과 지원 기간(${formatPeriod(body.startDate!, body.endDate)})이 이 내용으로 바뀌고, 종료일은 홈 캘린더에 '지원 마감'으로 표시됩니다.${sampleOnly(' 예시 화면이라 실제 홈페이지는 바뀌지 않습니다.')}`,
      confirmLabel: '게시',
    })
    if (!ok) return
    try {
      await publish.run(body)
      setBaseline(snapshot(edit))
      toast.success(`${body.generation}기 지원폼을 게시했습니다.${sampleOnly(' (예시: 실제 홈페이지는 바뀌지 않습니다)')}`)
    } catch (e) {
      handleError(e)
    }
  }

  const pub = data.published
  const ps = pub ? periodState(pub.startDate, pub.endDate) : null
  const busy = save.pending || publish.pending
  const previewForm: PreviewForm = edit

  return (
    <div ref={rootRef}>
      <PageHeader
        title="지원폼 작성"
        description="지원서 질문과 모집 기수 · 지원 기간을 정해 임시 저장하거나 게시합니다. 저장하기 전에는 서버에 반영되지 않습니다."
        meta={
          <>
            {data.draftSaved ? `마지막 임시 저장 ${formatDateTimeLong(data.draftSaved.at)} · ${actorLabel(data.draftSaved.by)}` : '임시 저장본 없음'}
            {dirty && (
              <span className={s.dirty}>
                <span aria-hidden="true">●</span> 저장하지 않은 변경이 있습니다
              </span>
            )}
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setPreview(true)}>
              미리보기
            </Button>
            <Button variant="secondary" busy={save.pending} disabled={busy && !save.pending} onClick={() => void onSaveDraft()}>
              임시 저장
            </Button>
            <Button busy={publish.pending} disabled={busy && !publish.pending} onClick={() => void onPublish()}>
              게시
            </Button>
          </>
        }
      />
      <FormTabs />

      <section className={s.statusBar} aria-label="게시 상태">
        {pub ? (
          <p className={s.statusLine}>
            <StatusBadge tone="success">게시됨</StatusBadge>
            <span>
              <strong>{pub.generation}기</strong> · 지원 기간 {formatPeriod(pub.startDate!, pub.endDate)}
            </span>
            {ps && <StatusBadge tone={ps.tone}>{ps.label}</StatusBadge>}
            <span>
              접수 <strong className="num">{data.received}</strong>건
            </span>
            {data.publishedStamp && (
              <span className={s.muted}>
                마지막 게시 {formatDateTimeLong(data.publishedStamp.at)} · {actorLabel(data.publishedStamp.by)}
              </span>
            )}
          </p>
        ) : (
          <p className={s.statusLine}>
            <StatusBadge tone="pending">게시 전</StatusBadge>
            <span>아직 게시하지 않았습니다. 게시하면 홈페이지 Recruits의 지원 기간과 지원서 양식에 반영됩니다.</span>
          </p>
        )}
        {data.draft && pub && <p className={s.statusSub}>임시 저장본을 불러왔습니다. 게시하기 전에는 홈페이지에 게시본이 그대로 보입니다.</p>}
        {!criteriaReady && criteria.data && (
          <p className={s.statusWarn}>
            <StatusBadge tone="warning">평가 기준 없음</StatusBadge>
            평가 기준이 저장돼 있어야 게시할 수 있습니다. <Link to={adminPath.recruitCriteria}>평가 기준 설정으로 가기</Link>
          </p>
        )}
      </section>

      {anyLocked && (
        <div className={s.notice} role="note">
          <IconLock className={s.noticeIcon} />
          <div>
            <p className={s.noticeTitle}>지원서 {data.received}건이 접수되어 일부만 고칠 수 있습니다</p>
            <p>
              기존 질문의 유형 · 필수 여부 · 선택지는 바꿀 수 없고 삭제할 수 없습니다 (기존 응답과 맞지 않게 됩니다). 질문 문구 · 순서와 지원 기간은 고칠 수 있고, 새 질문은 '선택' 항목으로만 더할 수
              있습니다. 모집 기수는 바꿀 수 없습니다.
            </p>
          </div>
        </div>
      )}

      <div className={s.formStack}>
        <Panel title="기본 설정" description="모집 기수와 지원 기간은 게시할 때 필수입니다. 지원 기간은 한국 시간(KST) 기준으로 시작일 0시부터 종료일 23:59까지입니다.">
          <div className={s.basicGrid}>
            <TextField
              label="모집 기수"
              required
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              value={edit.generation}
              disabled={anyLocked}
              error={errors.generation}
              help={anyLocked ? '지원서가 접수되어 바꿀 수 없습니다.' : '숫자만 (예: 5)'}
              onChange={(e) => patch({ generation: e.target.value })}
            />
            <DateTimeField label="지원 시작일" required kind="date" value={edit.startDate} error={errors.startDate} help="이날 0시부터" onChange={(e) => patch({ startDate: e.target.value })} />
            <DateTimeField
              label="지원 종료일"
              required
              kind="date"
              value={edit.endDate}
              error={errors.endDate}
              help="이날 23:59까지 · 홈 캘린더 '지원 마감'"
              onChange={(e) => patch({ endDate: e.target.value })}
            />
          </div>
        </Panel>

        <Panel title="지원서 질문" description={`지원자에게 이 순서대로 보입니다 (모두 ${edit.questions.length}개). 순서는 [위로] · [아래로]로 바꿉니다.`}>
          <div className={s.fixedBox}>
            <p className={s.fixedTitle}>
              <IconLock className={s.inlineIcon} />
              고정 질문 {fixed.length}개 · 늘 맨 앞 · 필수
            </p>
            <ol className={s.fixedList}>
              {fixed.map((q, i) => (
                <li key={q.id}>
                  <span className="num">{i + 1}</span> {q.title}
                </li>
              ))}
            </ol>
            <p className={s.fixedHelp}>지원자 목록 표시 · 중복 제출 확인 · 합격 후 계정 생성에 쓰므로 삭제하거나 유형을 바꿀 수 없습니다.</p>
          </div>

          {custom.length === 0 ? (
            <EmptyState title="추가한 질문이 없습니다." description="[+ 질문 추가]로 단답형 · 장문형 · 객관식 질문을 만듭니다." />
          ) : (
            <ol className={s.qlist}>
              {custom.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  q={q}
                  no={fixed.length + i + 1}
                  first={i === 0}
                  last={i === custom.length - 1}
                  locked={locked.has(q.id)}
                  optionalOnly={anyLocked && !locked.has(q.id)}
                  errors={{ title: errors[`q.${q.id}.title`], options: errors[`q.${q.id}.options`] }}
                  onChange={setQuestion}
                  onMove={(dir) => move(q, dir)}
                  onRemove={() => void remove(q)}
                  onAddOption={() => addOption(q)}
                  onRemoveOption={(index) => removeOption(q, index)}
                />
              ))}
            </ol>
          )}
          <Button ref={addRef} variant="secondary" className={s.addQuestion} onClick={add}>
            + 질문 추가
          </Button>
        </Panel>
      </div>
      {announcer.node}

      <FormPreviewDialog open={preview} onClose={() => setPreview(false)} form={previewForm} />
    </div>
  )
}
