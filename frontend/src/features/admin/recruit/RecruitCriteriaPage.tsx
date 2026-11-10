import { useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { actorLabel, adminKeys, errorMessage, isAdminRepoError, useAdminRepos } from '../data'
import { CRITERIA_TOTAL, criteriaTotal, scorableQuestions, validateCriteria, type CriteriaDraftItem } from '../data/recruit/rules'
import type { Criteria, FormQuestion } from '../data/recruit/types'
import { adminPath } from '../screens'
import { Checkbox, EmptyState, PageHeader, Panel, StatusBadge, TextArea, TextField, deleteConfirm, focusFirstInvalid, formatDateTimeLong, useConfirm, useToast } from '../ui'
import { IconErrorMark, IconInfo } from '../ui/icons'
import { Button, FormTabs } from './badges'
import { useAction, useAnnouncer, useLeaveGuard } from './hooks'
import s from './recruit.module.css'

type EditItem = CriteriaDraftItem & { key: string }

let seq = 0
const newKey = () => `item-${++seq}`
const fromCriteria = (c: Criteria): EditItem[] => c.items.map((it) => ({ key: newKey(), name: it.name, points: String(it.points), questionIds: [...it.questionIds], guide: it.guide }))
const snapshot = (items: readonly EditItem[]) => JSON.stringify(items.map((it) => ({ name: it.name, points: String(it.points).trim(), questionIds: it.questionIds, guide: it.guide })))

/**
 * 평가 기준 설정 (P-ARC-07, Figma 07-4-1, F-ARC-031~034). 지원폼 작성의 '평가 기준' 탭.
 * 항목명 · 배점 · 평가할 질문(고정 질문 제외) · 평가 가이드. 배점 합계는 입력할 때마다 다시 계산하고, 100점일 때만 저장한다.
 * 처음에는 빈 상태 ('평가 항목을 추가해 주세요.'). '다시 산정'을 고르고 저장하면 이미 접수된 지원서도 새 기준으로 다시 채점한다.
 */
export function RecruitCriteriaPage() {
  const repos = useAdminRepos()
  const toast = useToast()
  const confirm = useConfirm()
  const criteria = useQuery({ queryKey: adminKeys.section('recruit', 'criteria'), queryFn: () => repos.recruit.getCriteria() })
  const form = useQuery({ queryKey: adminKeys.section('recruit', 'form'), queryFn: () => repos.recruit.getForm() })

  const [items, setItems] = useState<EditItem[] | null>(null)
  const [baseline, setBaseline] = useState('')
  const [version, setVersion] = useState<number | null>(null)
  // 저장된 기준이 바뀌면(다른 화면 · 처음으로) 새로 불러온다. 편집 중인 내용은 같은 버전 안에서만 남긴다
  if (criteria.data && version !== criteria.data.version) {
    const next = fromCriteria(criteria.data)
    setItems(next)
    setBaseline(snapshot(next))
    setVersion(criteria.data.version)
  }
  const [rescore, setRescore] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const rootRef = useRef<HTMLDivElement>(null)
  const addRef = useRef<HTMLButtonElement>(null)
  const announcer = useAnnouncer()
  const save = useAction((input: { items: CriteriaDraftItem[]; rescore: boolean }) =>
    repos.recruit.saveCriteria({ items: input.items.map((it) => ({ ...it, points: Number(it.points) })), rescore: input.rescore }),
  )

  const dirty = !!items && snapshot(items) !== baseline
  useLeaveGuard(dirty)

  const header = (
    <PageHeader
      title="평가 기준 설정"
      description="자동 점수(AI 채점)에 쓰는 평가 항목과 배점을 정합니다. 배점 합계가 100점일 때만 저장할 수 있습니다."
      meta={
        criteria.data?.updated ? (
          <>
            기준 v{criteria.data.version} · 마지막 수정 {formatDateTimeLong(criteria.data.updated.at)} · {actorLabel(criteria.data.updated.by)}
            {dirty && (
              <span className={s.dirty}>
                <span aria-hidden="true">●</span> 저장하지 않은 변경이 있습니다
              </span>
            )}
          </>
        ) : criteria.data ? (
          '아직 저장한 평가 기준이 없습니다.'
        ) : undefined
      }
    />
  )

  if (criteria.isError && !criteria.data) {
    return (
      <>
        {header}
        <FormTabs />
        <EmptyState title="평가 기준을 불러오지 못했습니다." description={errorMessage(criteria.error)} action={<Button onClick={() => void criteria.refetch()}>다시 불러오기</Button>} />
      </>
    )
  }
  if (!items || !form.data) {
    return (
      <>
        {header}
        <FormTabs />
        <p className={s.loading} role="status">
          평가 기준을 불러오는 중입니다…
        </p>
      </>
    )
  }

  const questions: FormQuestion[] = scorableQuestions((form.data.draft ?? form.data.published)?.questions ?? [])
  const allQuestions = (form.data.draft ?? form.data.published)?.questions ?? []
  const numberOf = (id: string) => allQuestions.findIndex((q) => q.id === id) + 1
  const total = criteriaTotal(items)
  const received = form.data.received

  const patch = (key: string, next: Partial<CriteriaDraftItem>) => setItems(items.map((it) => (it.key === key ? { ...it, ...next } : it)))
  const focusLater = (selector: string) => requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>(selector)?.focus())
  const add = () => {
    const it: EditItem = { key: newKey(), name: '', points: '', questionIds: [], guide: '' }
    setItems([...items, it])
    announcer.say(`평가 항목 ${items.length + 1}을 추가했습니다.`)
    focusLater(`[data-item-name="${it.key}"]`)
  }
  const remove = async (it: EditItem, index: number) => {
    if (!(await confirm(deleteConfirm('평가 항목', 1, `${it.name.trim() ? `'${it.name.trim()}' ` : ''}항목을 지웁니다. 저장하기 전에는 자동 점수에 반영되지 않습니다.`)))) return
    const rest = items.filter((x) => x.key !== it.key)
    setItems(rest)
    setErrors({})
    announcer.say(`평가 항목 ${index + 1}을 삭제했습니다. 배점 합계 ${criteriaTotal(rest)}점.`)
    const next = rest[index] ?? rest[index - 1]
    if (next) focusLater(`[data-item-name="${next.key}"]`)
    else requestAnimationFrame(() => addRef.current?.focus())
  }

  const onSave = async () => {
    const fields = validateCriteria(items, allQuestions)
    setErrors(fields)
    if (Object.keys(fields).length) {
      requestAnimationFrame(() => focusFirstInvalid(rootRef.current))
      if (fields.total && Object.keys(fields).length === 1) toast.error(fields.total)
      return
    }
    if (rescore) {
      const ok = await confirm({
        title: `지원서 ${received}건의 점수를 다시 산정할까요?`,
        body: "새 기준으로 지원서마다 채점 작업을 만듭니다. 끝날 때까지 지원자 목록에 '분석 중'으로 보이고, 전형 결과와 잠김 상태는 바뀌지 않습니다.",
        confirmLabel: '저장 후 다시 산정',
      })
      if (!ok) return
    }
    try {
      const r = await save.run({ items, rescore })
      const next = fromCriteria(r.criteria)
      setItems(next)
      setBaseline(snapshot(next))
      setVersion(r.criteria.version)
      setRescore(false)
      toast.success(
        r.rescoring > 0
          ? `평가 기준을 저장했습니다 (v${r.criteria.version}). 지원서 ${r.rescoring}건의 점수를 다시 산정합니다. 지원자 관리에서 진행을 볼 수 있습니다.`
          : `평가 기준을 저장했습니다 (v${r.criteria.version}). 이후 접수되는 지원서부터 새 기준으로 점수를 매기고, 기존 점수는 그대로 둡니다.`,
      )
    } catch (e) {
      if (isAdminRepoError(e) && e.fields) setErrors(e.fields)
      toast.error(errorMessage(e))
    }
  }

  const gap = CRITERIA_TOTAL - total
  const totalState =
    items.length === 0
      ? null
      : gap === 0
        ? { tone: 'success' as const, text: '100점' }
        : gap > 0
          ? { tone: 'warning' as const, text: `${gap}점 모자람` }
          : { tone: 'warning' as const, text: `${-gap}점 넘음` }
  const saveBlocked =
    items.length === 0 ? '평가 항목을 1개 이상 추가해 주세요.' : gap !== 0 ? `배점 합계가 100점이어야 저장할 수 있습니다 (지금 ${total}점).` : !dirty && !rescore ? '바뀐 내용이 없습니다.' : undefined

  return (
    <div ref={rootRef}>
      {header}
      <FormTabs />

      <div className={s.infoNote}>
        <IconInfo className={s.noticeIcon} />
        <p>
          AI에는 항목명 · 배점 · 평가 가이드와 항목마다 고른 질문의 응답만 보냅니다. 이름 · 학번 · 학과 · 이메일은 보내지 않습니다. 점수는 운영진 검토용 참고 점수이며 합격 여부를 자동으로 정하지
          않습니다.
        </p>
      </div>

      {questions.length === 0 && (
        <div className={s.notice} role="note">
          <IconInfo className={s.noticeIcon} />
          <p>
            평가할 질문이 없습니다. 고정 질문(이름 · 학번 · 학과 · 이메일)은 평가하지 않으니 먼저 <Link to={adminPath.recruitForm}>지원폼에 질문을 추가</Link>해 주세요.
          </p>
        </div>
      )}

      {items.length === 0 ? (
        <div className={s.emptyCriteria}>
          <EmptyState
            title="평가 항목을 추가해 주세요."
            description="항목마다 이름 · 배점 · 평가할 질문 · 평가 가이드(높은 점수 / 낮은 점수 기준)를 정합니다. 배점 합계는 100점이어야 합니다."
            action={
              <Button ref={addRef} onClick={add} disabledReason={questions.length === 0 ? '평가할 질문이 없습니다. 먼저 지원폼에 질문을 추가해 주세요.' : undefined}>
                + 평가 항목 추가
              </Button>
            }
          />
          {errors.items && (
            <p className={s.fieldError}>
              <IconErrorMark />
              {errors.items}
            </p>
          )}
        </div>
      ) : (
        <>
          <h2 className={s.sectionHeading}>평가 항목 {items.length}개</h2>
          <ol className={s.critList}>
            {items.map((it, i) => (
              <li key={it.key} className={s.qcard}>
                <Panel
                  headingLevel={3}
                  title={
                    <>
                      평가 항목 {i + 1}
                      {it.name.trim() && <span className={s.qcardMeta}>{it.name.trim()}</span>}
                    </>
                  }
                  actions={
                    <Button variant="secondary" size="xs" aria-label={`평가 항목 ${i + 1} 삭제`} onClick={() => void remove(it, i)}>
                      삭제
                    </Button>
                  }
                >
                  <div className={s.critGrid}>
                    <TextField
                      label="항목명"
                      required
                      data-item-name={it.key}
                      value={it.name}
                      limit={30}
                      placeholder="예: 협업 경험"
                      error={errors[`items.${i}.name`]}
                      onChange={(e) => patch(it.key, { name: e.target.value })}
                    />
                    <TextField
                      label="배점"
                      required
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100}
                      step={1}
                      value={String(it.points)}
                      help="1~100점"
                      error={errors[`items.${i}.points`]}
                      onChange={(e) => patch(it.key, { points: e.target.value })}
                    />
                  </div>
                  <fieldset
                    className={s.questionPick}
                    aria-invalid={errors[`items.${i}.questionIds`] ? true : undefined}
                    aria-describedby={errors[`items.${i}.questionIds`] ? `${it.key}-q-error` : `${it.key}-q-help`}
                  >
                    <legend className={s.optionsLegend}>
                      평가할 질문
                      <span className={s.req} aria-hidden="true">
                        필수
                      </span>
                    </legend>
                    <p id={`${it.key}-q-help`} className={s.help}>
                      이 항목에서 AI가 읽을 응답입니다. 1개 이상 고릅니다 (고정 질문 제외).
                    </p>
                    <div className={s.questionChecks}>
                      {questions.map((q) => (
                        <Checkbox
                          key={q.id}
                          label={
                            <>
                              <span className="num">{numberOf(q.id)}.</span> {q.title || '(질문 내용 없음)'}
                            </>
                          }
                          checked={it.questionIds.includes(q.id)}
                          onChange={(e) => patch(it.key, { questionIds: e.target.checked ? [...it.questionIds, q.id] : it.questionIds.filter((x) => x !== q.id) })}
                        />
                      ))}
                    </div>
                    {errors[`items.${i}.questionIds`] && (
                      <p id={`${it.key}-q-error`} className={s.fieldError}>
                        <IconErrorMark />
                        {errors[`items.${i}.questionIds`]}
                      </p>
                    )}
                  </fieldset>
                  <TextArea
                    label="평가 가이드"
                    required
                    rows={3}
                    limit={500}
                    value={it.guide}
                    placeholder="높은 점수: … / 낮은 점수: …"
                    help="높은 점수 / 낮은 점수 기준을 문장으로 적어 주세요."
                    error={errors[`items.${i}.guide`]}
                    onChange={(e) => patch(it.key, { guide: e.target.value })}
                  />
                </Panel>
              </li>
            ))}
          </ol>
          <Button ref={addRef} variant="secondary" className={s.addQuestion} onClick={add}>
            + 평가 항목 추가
          </Button>
        </>
      )}

      <section className={s.saveBar} aria-label="저장">
        <div className={s.totalBox}>
          <p className={s.totalLine} aria-live="polite" aria-atomic="true">
            배점 합계{' '}
            <strong className="num" data-ok={gap === 0 || undefined}>
              {total}
            </strong>{' '}
            / 100점
            {totalState && <StatusBadge tone={totalState.tone}>{totalState.text}</StatusBadge>}
          </p>
          {errors.total && (
            <p className={s.fieldError}>
              <IconErrorMark />
              {errors.total}
            </p>
          )}
        </div>
        <Checkbox
          label={`기존 지원자 점수 다시 산정 (${received}건)`}
          description={
            received === 0
              ? '아직 접수된 지원서가 없습니다. 저장한 기준은 첫 지원서부터 쓰입니다.'
              : '체크하면 이미 접수된 지원서를 새 기준으로 다시 채점합니다. 체크하지 않으면 기존 점수는 그대로 두고, 이후 접수되는 지원서부터 새 기준을 씁니다.'
          }
          checked={rescore}
          disabled={received === 0}
          onChange={(e) => setRescore(e.target.checked)}
        />
        <Button busy={save.pending} disabledReason={save.pending ? undefined : saveBlocked} onClick={() => void onSave()}>
          {rescore ? '저장 후 다시 산정' : '저장'}
        </Button>
      </section>
      {announcer.node}
    </div>
  )
}
