import type { ApplicationInput, Consents, FormQuestion, PublicApplyForm, Ymd } from './types'

/**
 * 지원서 규칙 (DOM 없음, apply.test.ts 에 테스트). 화면과 예시 저장소가 같이 쓴다.
 * 서버도 같은 검사를 다시 한다: 화면 검사는 빨리 알려 주려는 것일 뿐이다.
 */

/** 고정 질문 id (관리자 지원폼 FIXED_QUESTIONS 와 같다) */
export const FIXED_ID = { name: 'q-name', studentId: 'q-student-id', department: 'q-department', email: 'q-email' } as const

/** 지원 파트 질문 id (관리자 예시 지원폼과 같다). 지원 안내의 파트 카드에서 ?part= 로 미리 고른다 */
export const TRACK_ID = 'q-track'

/** 글자 수 한도: 단답 100자, 장문 1000자 (질문에 '500자 이내'처럼 적혀 있으면 그 숫자) */
export const SHORT_MAX = 100
export const LONG_MAX = 1000

export const isStudentId = (s: string) => /^\d{10}$/.test(s)
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

/** '지원 동기를 적어 주세요. (500자 이내)' → 500. 없으면 유형별 기본 한도 */
export function maxLength(q: Pick<FormQuestion, 'title' | 'type'>): number {
  const m = q.title.match(/(\d[\d,]*)\s*자\s*이내/)
  const n = m ? Number(m[1].replaceAll(',', '')) : NaN
  if (Number.isFinite(n) && n > 0) return n
  return q.type === 'long' ? LONG_MAX : SHORT_MAX
}

/** 질문 하나의 답 검사. 맞으면 null */
export function answerError(q: FormQuestion, raw: string | undefined): string | null {
  const v = (raw ?? '').trim()
  if (!v) return q.required ? (q.type === 'choice' ? '하나를 골라 주세요.' : '답을 적어 주세요.') : null
  if (q.type === 'choice') return q.options.includes(v) ? null : '선택지 중에서 골라 주세요.'
  if (q.id === FIXED_ID.studentId && !isStudentId(v)) return '학번 10자리를 숫자로 적어 주세요.'
  if (q.id === FIXED_ID.email && !isEmail(v)) return '이메일 주소 모양을 확인해 주세요. (예: name@example.com)'
  const max = maxLength(q)
  if (v.length > max) return `${max.toLocaleString()}자 이내로 적어 주세요. (지금 ${v.length.toLocaleString()}자)`
  return null
}

export type ApplyErrors = Partial<Record<string, string>> & { consents?: string }

/** 지원서 전체 검사. 오류가 없으면 빈 객체 */
export function validateApplication(form: Pick<PublicApplyForm, 'questions'>, answers: Record<string, string>, consents: Consents): ApplyErrors {
  const out: ApplyErrors = {}
  for (const q of form.questions) {
    const err = answerError(q, answers[q.id])
    if (err) out[q.id] = err
  }
  if (!consents.privacy || !consents.ai) out.consents = '두 가지 동의에 모두 체크해야 제출할 수 있습니다.'
  return out
}

export const hasErrors = (e: ApplyErrors) => Object.values(e).some(Boolean)

/** 보낼 답: 앞뒤 공백을 지우고, 질문에 없는 칸 · 빈 선택 답은 뺀다 */
export function cleanAnswers(form: Pick<PublicApplyForm, 'questions'>, answers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const q of form.questions) {
    const v = (answers[q.id] ?? '').trim()
    if (v) out[q.id] = v
  }
  return out
}

export const toInput = (form: PublicApplyForm, answers: Record<string, string>, consents: Consents): ApplicationInput => ({ generation: form.generation, answers: cleanAnswers(form, answers), consents })

/**
 * 지원 기간 안인지 (KST 날짜 기준, 종료일 당일까지).
 * 날짜가 비어 있으면 열리지 않은 것으로 본다.
 */
export function periodState(form: Pick<PublicApplyForm, 'startDate' | 'endDate'>, today: Ymd): 'unset' | 'before' | 'open' | 'after' {
  const { startDate, endDate } = form
  if (!startDate || !endDate) return 'unset'
  if (today < startDate) return 'before'
  if (today > endDate) return 'after'
  return 'open'
}

/** 지원 안내의 파트 id → 지원 파트 선택지 글자 (관리자 예시 지원폼과 같은 이름) */
export const PART_LABEL: Readonly<Record<string, string>> = { frontend: 'Frontend', backend: 'Backend', ai: 'AI/ML', design: 'Product Design' }

/** ?part=frontend 를 지원 파트 질문의 답으로 (선택지에 없으면 비워 둔다) */
export function presetTrack(form: Pick<PublicApplyForm, 'questions'>, part: string | null): Record<string, string> {
  const label = part ? PART_LABEL[part] : undefined
  const q = form.questions.find((x) => x.id === TRACK_ID)
  return label && q?.options.includes(label) ? { [TRACK_ID]: label } : {}
}

/** 몇 개 답했는지 (필수 질문 기준, 진행 표시) */
export function progress(form: Pick<PublicApplyForm, 'questions'>, answers: Record<string, string>): { done: number; total: number } {
  const req = form.questions.filter((q) => q.required)
  return { done: req.filter((q) => !answerError(q, answers[q.id]) && (answers[q.id] ?? '').trim()).length, total: req.length }
}

/**
 * 쓰던 답 임시 보관 (이 브라우저에만, 기수별 칸). 동의 · 제출 결과는 남기지 않는다.
 * 학번 · 이메일도 함께 남으므로 제출하면 지운다. 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 조용히 넘어간다.
 */
export const draftKey = (generation: number) => `gdgoc-apply-draft-${generation}`

export function loadDraft(generation: number, storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): Record<string, string> {
  try {
    const raw = storage?.getItem(draftKey(generation))
    if (!raw) return {}
    const v: unknown = JSON.parse(raw)
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
    return Object.fromEntries(Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string'))
  } catch {
    return {}
  }
}

export function saveDraft(generation: number, answers: Record<string, string>, storage: Pick<Storage, 'setItem' | 'removeItem'> | undefined = safeStorage()) {
  try {
    const kept = Object.fromEntries(Object.entries(answers).filter(([, v]) => v.trim()))
    if (Object.keys(kept).length === 0) storage?.removeItem(draftKey(generation))
    else storage?.setItem(draftKey(generation), JSON.stringify(kept))
  } catch {
    /* 저장소가 막혀 있으면 임시 보관 없이 쓴다 */
  }
}

export function clearDraft(generation: number, storage: Pick<Storage, 'removeItem'> | undefined = safeStorage()) {
  try {
    storage?.removeItem(draftKey(generation))
  } catch {
    /* 위와 같음 */
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}
