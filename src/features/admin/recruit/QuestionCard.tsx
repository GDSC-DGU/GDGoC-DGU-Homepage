import { Checkbox, SelectField, StatusBadge, TextField } from '../ui'
import { OPTION_MAX, QUESTION_TITLE_MAX } from '../data/recruit/rules'
import { QUESTION_TYPE_LABEL, type FormQuestion, type QuestionType } from '../data/recruit/types'
import { IconErrorMark } from '../ui/icons'
import { Button } from './badges'
import s from './recruit.module.css'

const TYPE_OPTIONS = (Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).map((t) => ({ value: t, label: QUESTION_TYPE_LABEL[t] }))

export interface QuestionCardProps {
  q: FormQuestion
  /** 화면 번호 (고정 질문 4개 다음부터 5) */
  no: number
  first: boolean
  last: boolean
  /** 지원서가 접수되어 유형 · 필수 · 선택지 · 삭제를 막음 (게시본의 질문) */
  locked: boolean
  /** 접수 뒤에 더한 새 질문: '선택'으로만 */
  optionalOnly: boolean
  errors: { title?: string; options?: string }
  onChange: (next: FormQuestion) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  onAddOption: () => void
  onRemoveOption: (index: number) => void
}

const LOCK_REASON = '지원서가 접수된 질문이라 삭제할 수 없습니다. 기존 응답과 맞지 않게 됩니다.'

/**
 * 질문 카드 하나 (F-ARC-002): 질문 내용 · 유형(단답형 / 장문형 / 객관식) · 필수 여부 · 선택지(2개 이상) · 순서 · 삭제.
 * 순서는 드래그 대신 [위로] · [아래로] (BRIEF). 막힌 버튼은 숨기지 않고 이유를 읽힌다.
 */
export function QuestionCard({ q, no, first, last, locked, optionalOnly, errors, onChange, onMove, onRemove, onAddOption, onRemoveOption }: QuestionCardProps) {
  const label = q.title.trim() ? `질문 ${no}` : `질문 ${no} (내용 없음)`
  const headingId = `qcard-${q.id}`
  return (
    <li className={s.qcard} data-question-id={q.id}>
      <div className={s.qcardHead}>
        <h3 id={headingId} className={s.qcardTitle}>
          질문 {no}
          <span className={s.qcardMeta}>
            {QUESTION_TYPE_LABEL[q.type]} · {q.required ? '필수' : '선택'}
          </span>
          {locked && <StatusBadge tone="locked">접수 후 잠김</StatusBadge>}
        </h3>
        <div className={s.qcardTools}>
          <Button
            variant="secondary"
            size="xs"
            data-move={`${q.id}:up`}
            aria-label={`${label} 위로`}
            disabledReason={first ? '맨 위 질문입니다. 고정 질문 위로는 옮길 수 없습니다.' : undefined}
            onClick={() => onMove(-1)}
          >
            위로
          </Button>
          <Button variant="secondary" size="xs" data-move={`${q.id}:down`} aria-label={`${label} 아래로`} disabledReason={last ? '맨 아래 질문입니다.' : undefined} onClick={() => onMove(1)}>
            아래로
          </Button>
          <Button variant="secondary" size="xs" aria-label={`${label} 삭제`} disabledReason={locked ? LOCK_REASON : undefined} onClick={onRemove}>
            삭제
          </Button>
        </div>
      </div>

      <div className={s.qcardBody}>
        <TextField
          label="질문 내용"
          data-question-title={q.id}
          value={q.title}
          limit={QUESTION_TITLE_MAX}
          error={errors.title}
          placeholder="예: 지원 동기를 적어 주세요."
          help={locked ? '유형 · 필수 여부 · 선택지는 바꿀 수 없습니다. 뜻이 바뀌지 않는 문구 수정만 해 주세요.' : undefined}
          onChange={(e) => onChange({ ...q, title: e.target.value })}
        />
        {locked ? (
          q.type === 'choice' && (
            <div className={s.lockedOptions}>
              <p className={s.optionsLegend}>선택지</p>
              <ul className={s.optionChips}>
                {q.options.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
          )
        ) : (
          <>
            <div className={s.qcardRow}>
              <SelectField
                label="질문 유형"
                options={TYPE_OPTIONS}
                value={q.type}
                className={s.typeField}
                onChange={(e) => {
                  const type = e.target.value as QuestionType
                  onChange({ ...q, type, options: type === 'choice' ? (q.options.length >= 2 ? q.options : [...q.options, '', ''].slice(0, Math.max(2, q.options.length))) : q.options })
                }}
              />
              <Checkbox
                label="필수 질문"
                checked={q.required}
                disabled={optionalOnly}
                description={optionalOnly ? '접수 뒤에 더한 질문은 선택 항목으로만 둡니다.' : '지원자 화면에 * 로 표시됩니다.'}
                className={s.requiredCheck}
                onChange={(e) => onChange({ ...q, required: e.target.checked })}
              />
            </div>

            {q.type === 'choice' && (
              <fieldset className={s.options} aria-describedby={errors.options ? `${q.id}-options-error` : undefined} aria-invalid={errors.options ? true : undefined}>
                <legend className={s.optionsLegend}>선택지 (2개 이상)</legend>
                <ol className={s.optionList}>
                  {q.options.map((opt, i) => (
                    <li key={i} className={s.optionRow}>
                      <TextField
                        label={`선택지 ${i + 1}`}
                        hideLabel
                        data-option={`${q.id}:${i}`}
                        value={opt}
                        maxLength={OPTION_MAX}
                        placeholder={`선택지 ${i + 1}`}
                        onChange={(e) => onChange({ ...q, options: q.options.map((o, j) => (j === i ? e.target.value : o)) })}
                      />
                      <Button
                        variant="secondary"
                        size="xs"
                        aria-label={`${label}의 선택지 ${i + 1} 삭제`}
                        disabledReason={q.options.length <= 2 ? '객관식은 선택지가 2개 이상이어야 합니다.' : undefined}
                        onClick={() => onRemoveOption(i)}
                      >
                        삭제
                      </Button>
                    </li>
                  ))}
                </ol>
                {errors.options && (
                  <p id={`${q.id}-options-error`} className={s.fieldError}>
                    <IconErrorMark />
                    {errors.options}
                  </p>
                )}
                <Button variant="ghost" size="xs" data-add-option={q.id} disabledReason={q.options.length >= 10 ? '선택지는 10개까지 둘 수 있습니다.' : undefined} onClick={onAddOption}>
                  + 선택지 추가
                </Button>
              </fieldset>
            )}
          </>
        )}
      </div>
    </li>
  )
}
