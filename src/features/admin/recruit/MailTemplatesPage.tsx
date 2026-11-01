import { useQuery } from '@tanstack/react-query'
import { useId, useRef, useState } from 'react'
import { actorLabel, adminKeys, errorMessage, isAdminRepoError, useAdminRepos } from '../data'
import { EXAMPLE_VARIABLES, insertAt, MAIL_VARIABLES, renderTemplate, unsupportedVariables } from '../data/recruit/rules'
import { MAIL_RESULTS, type MailResult, type MailTemplate, type TemplateInput } from '../data/recruit/types'
import { Checkbox, Dialog, EmptyState, PageHeader, Panel, SelectField, StatusBadge, TextArea, TextField, focusFirstInvalid, formatDateTimeLong, useConfirm, useToast } from '../ui'
import { useAction, useLeaveGuard } from './hooks'
import { Button } from './badges'
import s from './recruit.module.css'

const EMPTY: TemplateInput = { name: '', result: '서류 합격', subject: '', body: '', isDefault: false }
const toInput = (t: MailTemplate): TemplateInput => ({ name: t.name, result: t.result, subject: t.subject, body: t.body, isDefault: t.isDefault })
const same = (a: TemplateInput, b: TemplateInput) => a.name === b.name && a.result === b.result && a.subject === b.subject && a.body === b.body && a.isDefault === b.isDefault
const kstShortDate = (iso: string) => formatDateTimeLong(iso).slice(5)

type Field = 'subject' | 'body'

/**
 * 이메일 템플릿 (P-ARC-06, Figma 07-6, F-ARC-024~030).
 * 왼쪽 목록(이름 · 적용 결과 · 기본 · 마지막 수정일 · 수정자, 첫 번째가 선택된 상태) + 오른쪽 편집(이름 · 적용 결과 · 기본 · 제목 · 본문 · 변수 넣기).
 * [미리보기]는 예시 값으로 바꿔 보여 주고, [테스트 메일 발송]은 로그인한 운영진 이메일로 보내는 흉내 (지원자 메일 상태 · 이력에는 영향 없음).
 * 템플릿 삭제는 명세 '확정 필요'라 두지 않았다.
 */
export function MailTemplatesPage() {
  const repos = useAdminRepos()
  const toast = useToast()
  const confirm = useConfirm()
  const list = useQuery({ queryKey: adminKeys.section('recruit', 'templates'), queryFn: () => repos.recruit.listTemplates() })
  const templates = list.data

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isNew, setIsNew] = useState(false)
  const current = isNew ? null : (templates?.find((t) => t.id === selectedId) ?? templates?.[0] ?? null)
  const editKey = isNew ? 'new' : (current?.id ?? null)
  const [edit, setEdit] = useState<TemplateInput | null>(null)
  const [editFor, setEditFor] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof TemplateInput, string>>>({})
  if (editKey && editFor !== editKey) {
    setEditFor(editKey)
    setEdit(isNew ? EMPTY : toInput(current!))
    setErrors({})
  }
  const [preview, setPreview] = useState(false)
  const [lastField, setLastField] = useState<Field>('body')
  const subjectRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const chipsId = useId()

  const base = isNew ? EMPTY : current ? toInput(current) : null
  const dirty = !!edit && !!base && !same(edit, base)
  useLeaveGuard(dirty)
  const save = useAction((input: TemplateInput) => (isNew ? repos.recruit.createTemplate(input) : repos.recruit.saveTemplate(current!.id, input)))
  const test = useAction((id: string) => repos.recruit.sendTestMail(id))

  const leaveOk = async () => {
    if (!dirty) return true
    return confirm({ title: '저장하지 않은 변경을 버릴까요?', body: '이 템플릿에서 바꾼 내용은 사라집니다.', confirmLabel: '버리고 이동', tone: 'danger' })
  }
  const choose = async (id: string) => {
    if (!isNew && current?.id === id) return
    if (!(await leaveOk())) return
    setIsNew(false)
    setSelectedId(id)
  }
  const addNew = async () => {
    if (!(await leaveOk())) return
    setIsNew(true)
    requestAnimationFrame(() => nameRef.current?.focus())
  }

  const insertVariable = (v: string) => {
    if (!edit) return
    const el = lastField === 'subject' ? subjectRef.current : bodyRef.current
    const value = edit[lastField]
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? start
    const r = insertAt(value, v, start, end)
    setEdit({ ...edit, [lastField]: r.text })
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(r.caret, r.caret)
    })
  }

  const onSave = async () => {
    if (!edit) return
    const next: Partial<Record<keyof TemplateInput, string>> = {}
    if (!edit.name.trim()) next.name = '템플릿 이름을 입력해 주세요.'
    if (!edit.subject.trim()) next.subject = '메일 제목을 입력해 주세요.'
    if (!edit.body.trim()) next.body = '본문을 입력해 주세요.'
    const badS = unsupportedVariables(edit.subject)
    const badB = unsupportedVariables(edit.body)
    if (!next.subject && badS.length) next.subject = `지원하지 않는 변수가 있습니다: ${badS.join(' ')}. 쓸 수 있는 변수: ${MAIL_VARIABLES.join(' ')}`
    if (!next.body && badB.length) next.body = `지원하지 않는 변수가 있습니다: ${badB.join(' ')}. 쓸 수 있는 변수: ${MAIL_VARIABLES.join(' ')}`
    setErrors(next)
    if (Object.keys(next).length) {
      requestAnimationFrame(() => focusFirstInvalid(formRef.current))
      return
    }
    try {
      const t = await save.run(edit)
      setIsNew(false)
      setSelectedId(t.id)
      setEditFor(null)
      toast.success(`템플릿 「${t.name}」을 저장했습니다.${t.isDefault && (!current || !current.isDefault) ? ` ${t.result}의 기본 템플릿으로 지정했습니다.` : ''} 이미 발송된 메일은 바뀌지 않습니다.`)
    } catch (e) {
      if (isAdminRepoError(e) && e.fields) setErrors(e.fields)
      toast.error(errorMessage(e))
    }
  }

  const onTest = async () => {
    if (!current) return
    try {
      const r = await test.run(current.id)
      toast.success(`테스트 메일을 ${r.to}(로그인한 운영진 계정)로 보냈습니다. 예시 화면이라 실제로 보내지 않으며, 지원자 메일 상태와 처리 이력에는 영향이 없습니다.`)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const otherDefault = edit && templates?.find((t) => t.result === edit.result && t.isDefault && t.id !== current?.id)
  const lockedDefault = !isNew && !!current?.isDefault

  return (
    <>
      <PageHeader
        title="이메일 템플릿"
        description="전형 결과별 메일 양식을 만들고 고칩니다. 템플릿을 고쳐도 이미 발송된 메일은 바뀌지 않습니다 (발송 시점의 내용으로 이력에 남음)."
        actions={
          <Button variant="secondary" onClick={() => void addNew()}>
            + 추가
          </Button>
        }
      />

      {list.isError && !templates ? (
        <EmptyState title="템플릿을 불러오지 못했습니다." description={errorMessage(list.error)} action={<Button onClick={() => void list.refetch()}>다시 불러오기</Button>} />
      ) : !templates || !edit ? (
        <p className={s.loading} role="status">
          템플릿을 불러오는 중입니다…
        </p>
      ) : (
        <div className={s.tplLayout}>
          <section className={s.tplListBox} aria-labelledby="tpl-list-title">
            <h2 id="tpl-list-title" className={s.tplListTitle}>
              템플릿 {templates.length + (isNew ? 1 : 0)}개
            </h2>
            <ul className={s.tplList}>
              {isNew && (
                <li>
                  <button type="button" className={s.tplItem} aria-current="true" onClick={() => nameRef.current?.focus()}>
                    <span className={s.tplName}>{edit.name.trim() || '새 템플릿'}</span>
                    <span className={s.tplMeta}>
                      <StatusBadge tone="pending">저장 전</StatusBadge>
                    </span>
                  </button>
                </li>
              )}
              {templates.map((t) => (
                <li key={t.id}>
                  <button type="button" className={s.tplItem} aria-current={!isNew && current?.id === t.id ? 'true' : undefined} onClick={() => void choose(t.id)}>
                    <span className={s.tplName}>{t.name}</span>
                    <span className={s.tplMeta}>
                      <StatusBadge tone="neutral">{t.result}</StatusBadge>
                      {t.isDefault && <StatusBadge tone="success">기본</StatusBadge>}
                    </span>
                    <span className={s.tplStamp}>
                      {kstShortDate(t.updated.at)} · {actorLabel(t.updated.by)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <Panel
            title={isNew ? '새 템플릿' : current!.name}
            description={isNew ? '이름 · 적용 결과 · 제목 · 본문은 필수입니다.' : `마지막 수정 ${formatDateTimeLong(current!.updated.at)} · ${actorLabel(current!.updated.by)}`}
            actions={
              dirty ? (
                <span className={s.dirty}>
                  <span aria-hidden="true">●</span> 저장하지 않은 변경
                </span>
              ) : undefined
            }
          >
            <form
              ref={formRef}
              className={s.tplForm}
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                void onSave()
              }}
            >
              <div className={s.tplGrid}>
                <TextField ref={nameRef} label="템플릿 이름" required limit={40} value={edit.name} error={errors.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                <SelectField
                  label="적용 결과"
                  required
                  options={MAIL_RESULTS.map((r) => ({ value: r, label: r }))}
                  value={edit.result}
                  disabled={lockedDefault}
                  error={errors.result}
                  help={lockedDefault ? '기본 템플릿은 적용 결과를 바꿀 수 없습니다.' : undefined}
                  onChange={(e) => setEdit({ ...edit, result: e.target.value as MailResult })}
                />
              </div>
              <Checkbox
                label={`${edit.result}의 기본 템플릿으로 쓰기`}
                description={
                  lockedDefault
                    ? '기본 템플릿은 결과별 1개입니다. 해제하려면 같은 결과의 다른 템플릿을 기본으로 지정해 주세요.'
                    : otherDefault
                      ? `지정하면 지금 기본인 「${otherDefault.name}」은 기본에서 해제됩니다. 일괄 발송에서 자동으로 골라집니다.`
                      : '일괄 발송에서 이 결과에 자동으로 골라집니다.'
                }
                checked={edit.isDefault}
                disabled={lockedDefault}
                onChange={(e) => setEdit({ ...edit, isDefault: e.target.checked })}
              />
              <TextField
                ref={subjectRef}
                label="메일 제목"
                required
                limit={100}
                value={edit.subject}
                error={errors.subject}
                onFocus={() => setLastField('subject')}
                onChange={(e) => setEdit({ ...edit, subject: e.target.value })}
              />
              <div className={s.chips} role="group" aria-labelledby={chipsId}>
                <p id={chipsId} className={s.chipsLabel}>
                  변수 넣기 <span className={s.muted}>· {lastField === 'subject' ? '메일 제목' : '본문'}의 커서 위치에 들어갑니다</span>
                </p>
                {MAIL_VARIABLES.map((v) => (
                  <button key={v} type="button" className={s.chip} onMouseDown={(e) => e.preventDefault()} onClick={() => insertVariable(v)}>
                    {v}
                  </button>
                ))}
              </div>
              <TextArea
                ref={bodyRef}
                label="본문"
                required
                rows={12}
                limit={3000}
                value={edit.body}
                error={errors.body}
                help="{{면접일시}}는 면접 일정이 지정된 지원자만 바뀝니다 (예: 2026.10.23 (금) 14:00). 없으면 '면접 일정 미정'."
                onFocus={() => setLastField('body')}
                onChange={(e) => setEdit({ ...edit, body: e.target.value })}
              />
              <div className={s.tplActions}>
                <Button variant="secondary" onClick={() => setPreview(true)}>
                  미리보기
                </Button>
                <Button
                  variant="secondary"
                  busy={test.pending}
                  disabledReason={test.pending ? undefined : isNew || dirty ? '저장한 뒤 보낼 수 있습니다. 테스트 메일은 저장된 내용으로 보냅니다.' : undefined}
                  onClick={() => void onTest()}
                >
                  테스트 메일 발송
                </Button>
                <Button type="submit" busy={save.pending} disabledReason={save.pending ? undefined : !dirty ? '바뀐 내용이 없습니다.' : undefined}>
                  저장
                </Button>
              </div>
            </form>
          </Panel>
        </div>
      )}

      {edit && <TemplatePreviewDialog open={preview} onClose={() => setPreview(false)} input={edit} />}
    </>
  )
}

/** 템플릿 미리보기 (F-ARC-029): 변수를 예시 값으로 바꾼 제목 · 본문 (치환 규칙은 일괄 발송 미리보기와 같음) */
function TemplatePreviewDialog({ open, onClose, input }: { open: boolean; onClose: () => void; input: TemplateInput }) {
  const bad = unsupportedVariables(`${input.subject}\n${input.body}`)
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="템플릿 미리보기"
      description="변수를 예시 값으로 바꿔 보여 줍니다. 저장하지 않은 내용도 그대로 보입니다."
      footer={<Button onClick={onClose}>닫기</Button>}
    >
      <div className={s.mailBox} tabIndex={0} role="region" aria-label="메일 미리보기">
        <p className={s.mailTo}>받는 사람: {EXAMPLE_VARIABLES['이메일']} (예시)</p>
        <p className={s.mailSubject}>{renderTemplate(input.subject, EXAMPLE_VARIABLES) || '(제목 없음)'}</p>
        <div className={s.mailBody}>{renderTemplate(input.body, EXAMPLE_VARIABLES) || '(본문 없음)'}</div>
      </div>
      {bad.length > 0 && (
        <p className={s.warnLine}>
          <StatusBadge tone="warning">지원하지 않는 변수</StatusBadge> {bad.join(' ')} 은 바뀌지 않고 그대로 보입니다. 저장할 때 고쳐 주세요.
        </p>
      )}
      <dl className={s.varList}>
        {Object.entries(EXAMPLE_VARIABLES).map(([k, v]) => (
          <div key={k}>
            <dt>{`{{${k}}}`}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  )
}
