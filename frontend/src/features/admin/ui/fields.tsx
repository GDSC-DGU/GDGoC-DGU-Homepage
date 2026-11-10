import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { IconErrorMark } from './icons'
import s from './controls.module.css'

/**
 * 폼 부품. label 은 늘 진짜 <label for>, 도움말 · 오류 · 글자 수는 aria-describedby 로 입력 칸에 이어진다.
 * 오류가 있으면 aria-invalid + 칸 아래 문장 (색 + 느낌표 모양 + 글자). 제출 때는 ui/forms.ts 의 focusFirstInvalid 로 첫 오류 칸에 초점.
 * 필수 칸은 label 옆에 '필수' 글자 (별표만 쓰지 않는다). 이 글자는 눈에만 보이고(aria-hidden), 화면 읽기는 required 속성으로 '필수'를 읽는다
 * (이름이 '제목 필수'처럼 겹쳐 읽히지 않게).
 */
interface FieldBase {
  label: ReactNode
  help?: ReactNode
  /** 오류 문장. 있으면 aria-invalid */
  error?: string | null
  required?: boolean
  /** label 을 눈에서만 숨김 (표 안 검색 칸처럼 옆에 뜻이 보일 때) */
  hideLabel?: boolean
  className?: string
}

function ids(base: string) {
  return { input: base, help: `${base}-help`, error: `${base}-error`, count: `${base}-count` }
}

function describedBy(i: ReturnType<typeof ids>, help: unknown, error: unknown, count: boolean, extra?: string) {
  return [extra, help ? i.help : null, error ? i.error : null, count ? i.count : null].filter(Boolean).join(' ') || undefined
}

function FieldText({ i, help, error, count }: { i: ReturnType<typeof ids>; help?: ReactNode; error?: string | null; count?: ReactNode }) {
  return (
    <>
      {(help || count) && (
        <div className={s.metaRow}>
          {help && (
            <p id={i.help} className={s.help}>
              {help}
            </p>
          )}
          {count}
        </div>
      )}
      {error && (
        <p id={i.error} className={s.error}>
          <IconErrorMark />
          {error}
        </p>
      )}
    </>
  )
}

function Label({ htmlFor, label, required, hide }: { htmlFor: string; label: ReactNode; required?: boolean; hide?: boolean }) {
  return (
    <label htmlFor={htmlFor} className={hide ? 'visually-hidden' : s.label}>
      {label}
      {required && (
        <span className={s.req} aria-hidden="true">
          필수
        </span>
      )}
    </label>
  )
}

function Count({ id, length, limit }: { id: string; length: number; limit: number }) {
  return (
    <span id={id} className={`${s.count} ${length > limit ? s.countOver : ''}`}>
      {length}/{limit}
      <span className="visually-hidden">자</span>
    </span>
  )
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & FieldBase & { /** 글자 수 한도 (넘으면 숫자가 빨갛게. 입력을 막지는 않는다) */ limit?: number }

/** 한 줄 입력. type 은 text · email · url · search · password · number … */
export const TextField = forwardRef<HTMLInputElement, InputProps>(function TextField({ label, help, error, required, hideLabel, className, limit, id, 'aria-describedby': extraDesc, ...input }, ref) {
  const auto = useId()
  const i = ids(id ?? auto)
  const length = typeof input.value === 'string' ? input.value.length : 0
  return (
    <div className={`${s.field} ${className ?? ''}`}>
      <Label htmlFor={i.input} label={label} required={required} hide={hideLabel} />
      <input
        {...input}
        ref={ref}
        id={i.input}
        className={s.input}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(i, help, error, !!limit, extraDesc)}
      />
      <FieldText i={i} help={help} error={error} count={limit ? <Count id={i.count} length={length} limit={limit} /> : undefined} />
    </div>
  )
})

type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & FieldBase & { limit?: number }

/** 여러 줄 입력 (후기 200자, 게시글 내용 …) */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea({ label, help, error, required, hideLabel, className, limit, id, 'aria-describedby': extraDesc, ...input }, ref) {
  const auto = useId()
  const i = ids(id ?? auto)
  const length = typeof input.value === 'string' ? input.value.length : 0
  return (
    <div className={`${s.field} ${className ?? ''}`}>
      <Label htmlFor={i.input} label={label} required={required} hide={hideLabel} />
      <textarea
        {...input}
        ref={ref}
        id={i.input}
        className={s.input}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(i, help, error, !!limit, extraDesc)}
      />
      <FieldText i={i} help={help} error={error} count={limit ? <Count id={i.count} length={length} limit={limit} /> : undefined} />
    </div>
  )
})

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> &
  FieldBase & {
    options: readonly SelectOption[]
    /** 아무것도 고르지 않은 첫 줄 ('기수 선택') */
    placeholder?: string
  }

/** 고르기 (기수 · 관리 유형 · 정렬 …) */
export const SelectField = forwardRef<HTMLSelectElement, SelectProps>(function SelectField({ label, help, error, required, hideLabel, className, options, placeholder, id, 'aria-describedby': extraDesc, ...select }, ref) {
  const auto = useId()
  const i = ids(id ?? auto)
  return (
    <div className={`${s.field} ${className ?? ''}`}>
      <Label htmlFor={i.input} label={label} required={required} hide={hideLabel} />
      <select {...select} ref={ref} id={i.input} className={s.input} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy(i, help, error, false, extraDesc)}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldText i={i} help={help} error={error} />
    </div>
  )
})

type DateTimeProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type' | 'step'> &
  FieldBase & {
    /** date: 'YYYY-MM-DD' · time: 'HH:mm' · datetime-local: 'YYYY-MM-DDTHH:mm' (모두 한국 시간으로 읽고 쓴다) */
    kind?: 'date' | 'time' | 'datetime-local'
    /** 시각 단위 (면접 일정은 10분, F-ARC-039) */
    stepMinutes?: number
  }

/** 날짜 · 시각 (브라우저 기본 고르기 창). 값은 한국 시간 기준 문자열 */
export const DateTimeField = forwardRef<HTMLInputElement, DateTimeProps>(function DateTimeField({ label, help, error, required, hideLabel, className, kind = 'date', stepMinutes, id, 'aria-describedby': extraDesc, ...input }, ref) {
  const auto = useId()
  const i = ids(id ?? auto)
  return (
    <div className={`${s.field} ${className ?? ''}`}>
      <Label htmlFor={i.input} label={label} required={required} hide={hideLabel} />
      <input
        {...input}
        ref={ref}
        id={i.input}
        type={kind}
        step={stepMinutes ? stepMinutes * 60 : undefined}
        className={`${s.input} num`}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(i, help, error, false, extraDesc)}
      />
      <FieldText i={i} help={help} error={error} />
    </div>
  )
})

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> & {
  label: ReactNode
  description?: ReactNode
  /** 표 안처럼 좁은 곳: 누르는 높이 32 */
  compact?: boolean
  className?: string
}

/** 체크 하나 ('공개' · '다시 산정' · 'PIN도 초기화하기') */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, description, compact, className, id, ...input }, ref) {
  const auto = useId()
  const inputId = id ?? auto
  return (
    <label htmlFor={inputId} className={`${s.check} ${compact ? s.compact : ''} ${className ?? ''}`}>
      <input {...input} ref={ref} id={inputId} type="checkbox" aria-describedby={description ? `${inputId}-desc` : input['aria-describedby']} />
      <span>
        {label}
        {description && (
          <span id={`${inputId}-desc`} className={s.checkDesc}>
            {description}
          </span>
        )}
      </span>
    </label>
  )
})

export interface RadioOption<V extends string> {
  value: V
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}

/** 하나 고르기 (fieldset + legend). 관리 유형 · 공개 여부 · 질문 유형 */
export function RadioGroup<V extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  help,
  error,
  required,
  direction = 'row',
  className,
}: {
  legend: ReactNode
  name: string
  options: readonly RadioOption<V>[]
  value: V | null
  onChange: (value: V) => void
  help?: ReactNode
  error?: string | null
  required?: boolean
  direction?: 'row' | 'column'
  className?: string
}) {
  const i = ids(useId())
  return (
    <fieldset
      role="radiogroup"
      className={`${s.fieldset} ${s.field} ${className ?? ''}`}
      aria-labelledby={`${i.input}-legend`}
      aria-describedby={describedBy(i, help, error, false)}
      aria-invalid={error ? true : undefined}
      aria-required={required || undefined}
    >
      <legend id={`${i.input}-legend`} className={s.label}>
        {legend}
        {required && (
          <span className={s.req} aria-hidden="true">
            필수
          </span>
        )}
      </legend>
      <div className={`${s.options} ${direction === 'column' ? s.vertical : ''}`}>
        {options.map((o) => (
          <label key={o.value} className={s.check}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} disabled={o.disabled} onChange={() => onChange(o.value)} />
            <span>
              {o.label}
              {o.description && <span className={s.checkDesc}>{o.description}</span>}
            </span>
          </label>
        ))}
      </div>
      <FieldText i={i} help={help} error={error} />
    </fieldset>
  )
}
