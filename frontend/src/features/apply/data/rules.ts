import type { Answer, Applicant, ApplicationForm, ApplicationRequest, ApplyDraft, ApplyState, Consents, FormQuestion, QuestionType } from './types'

/**
 * 지원서 규칙 (DOM 없음, apply.test.ts 에 테스트). 화면과 예시 저장소가 같이 쓴다.
 * 길이 · 형식은 API 명세(API-RCT-002 · 005)와 같은 값. 서버도 같은 검사를 다시 한다: 화면 검사는 빨리 알려 주려는 것일 뿐이다.
 */

/** 문항 타입별 기본 최대 글자 수 (문항에 maxLength 가 있으면 그것) */
export const DEFAULT_MAX: Record<QuestionType, number | undefined> = {
  SHORT_TEXT: 100,
  LONG_TEXT: 1000,
  URL: 2048,
  SINGLE_CHOICE: undefined,
  MULTI_CHOICE: undefined,
}

export const maxLengthOf = (q: Pick<FormQuestion, 'type' | 'maxLength'>) => q.maxLength ?? DEFAULT_MAX[q.type]

export const isStudentId = (s: string) => /^\d{10}$/.test(s.trim())
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
/** http · https 만 */
export const isHttpUrl = (s: string) => {
  try {
    const u = new URL(s.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
/** 010-1234-5678 · 01012345678 (숫자 10~11자리) */
export const isPhone = (s: string) => /^\d{10,11}$/.test(s.replace(/[\s-]/g, ''))

/** 오류 칸 이름: 'applicant.name' · 'track' · 'q:<questionId>' · 'consents' */
export type ApplyErrors = Partial<Record<string, string>>
export const qKey = (questionId: string) => `q:${questionId}`

export const hasErrors = (e: ApplyErrors) => Object.values(e).some(Boolean)

/** 기본 정보 칸 (화면 순서 · 이름 · 필수 여부). 연락처(phone)는 선택 (2026-11-17 결정) */
export const APPLICANT_FIELDS: readonly { key: keyof Applicant; label: string; required: boolean }[] = [
  { key: 'name', label: '이름', required: true },
  { key: 'studentId', label: '학번', required: true },
  { key: 'major', label: '학과(전공)', required: true },
  { key: 'email', label: '이메일', required: true },
  { key: 'phone', label: '연락처', required: false },
]

export function applicantError(key: keyof Applicant, raw: string): string | null {
  const v = raw.trim()
  const field = APPLICANT_FIELDS.find((f) => f.key === key)
  if (!v) return field?.required ? '답을 적어 주세요.' : null
  if (key === 'studentId' && !isStudentId(v)) return '학번 10자리를 숫자로 적어 주세요.'
  if (key === 'email' && !isEmail(v)) return '이메일 주소 모양을 확인해 주세요. (예: name@example.com)'
  if (key === 'phone' && !isPhone(v)) return '연락처를 숫자로 적어 주세요. (예: 010-1234-5678)'
  if ((key === 'name' || key === 'major') && v.length > 100) return '100자 이내로 적어 주세요.'
  return null
}

/** 문항 하나의 답 검사. 맞으면 null */
export function answerError(q: FormQuestion, raw: string | string[] | undefined): string | null {
  if (q.type === 'MULTI_CHOICE') {
    const picked = Array.isArray(raw) ? raw : []
    if (picked.length === 0) return q.required ? '하나 이상 골라 주세요.' : null
    return picked.every((p) => q.options?.includes(p)) ? null : '선택지 중에서 골라 주세요.'
  }
  const v = (typeof raw === 'string' ? raw : '').trim()
  if (!v) return q.required ? (q.type === 'SINGLE_CHOICE' ? '하나를 골라 주세요.' : '답을 적어 주세요.') : null
  if (q.type === 'SINGLE_CHOICE') return q.options?.includes(v) ? null : '선택지 중에서 골라 주세요.'
  if (q.type === 'URL' && !isHttpUrl(v)) return 'http:// 또는 https:// 로 시작하는 주소를 적어 주세요.'
  const max = maxLengthOf(q)
  if (max && v.length > max) return `${max.toLocaleString()}자 이내로 적어 주세요. (지금 ${v.length.toLocaleString()}자)`
  return null
}

/** 고른 파트에게 보이는 문항 (trackOnly 가 비었으면 모두에게) */
export const visibleQuestions = (form: Pick<ApplicationForm, 'questions'>, track: string) => form.questions.filter((q) => !q.trackOnly?.length || q.trackOnly.includes(track))

/** 지원서 전체 검사. 오류가 없으면 빈 객체 */
export function validateDraft(form: Pick<ApplicationForm, 'questions'>, tracks: readonly string[], draft: ApplyDraft, consents: Consents): ApplyErrors {
  const out: ApplyErrors = {}
  for (const f of APPLICANT_FIELDS) {
    const err = applicantError(f.key, draft.applicant[f.key])
    if (err) out[`applicant.${f.key}`] = err
  }
  if (!tracks.includes(draft.track)) out.track = '지원 파트를 골라 주세요.'
  for (const q of visibleQuestions(form, draft.track)) {
    const err = answerError(q, draft.answers[q.questionId])
    if (err) out[qKey(q.questionId)] = err
  }
  if (!consents.privacy || !consents.ai) out.consents = '두 가지 동의에 모두 체크해야 제출할 수 있습니다.'
  return out
}

/** API-RCT-005 요청 본문: 앞뒤 공백을 지우고, 안 보이는 문항 · 빈 답은 빼고, 복수 선택은 values 로 */
export function toRequest(form: ApplicationForm, draft: ApplyDraft, consents: Consents): ApplicationRequest {
  const answers: Answer[] = []
  for (const q of visibleQuestions(form, draft.track)) {
    const raw = draft.answers[q.questionId]
    if (q.type === 'MULTI_CHOICE') {
      const values = Array.isArray(raw) ? raw.filter((v) => q.options?.includes(v)) : []
      if (values.length) answers.push({ questionId: q.questionId, values })
    } else {
      const value = typeof raw === 'string' ? raw.trim() : ''
      if (value) answers.push({ questionId: q.questionId, value })
    }
  }
  const a = draft.applicant
  return {
    applicant: { name: a.name.trim(), studentId: a.studentId.trim(), major: a.major.trim(), email: a.email.trim(), phone: a.phone.trim() },
    track: draft.track,
    answers,
    privacyConsent: consents.privacy,
    formVersion: form.formVersion,
  }
}

/** 몇 개 답했는지 (필수 기준: 기본 정보 + 파트 + 보이는 필수 문항) */
export function progress(form: Pick<ApplicationForm, 'questions'>, tracks: readonly string[], draft: ApplyDraft): { done: number; total: number } {
  const req = APPLICANT_FIELDS.filter((f) => f.required)
  const qs = visibleQuestions(form, draft.track).filter((q) => q.required)
  const filled = (v: string | string[] | undefined) => (Array.isArray(v) ? v.length > 0 : !!v?.trim())
  const done =
    req.filter((f) => draft.applicant[f.key].trim() && !applicantError(f.key, draft.applicant[f.key])).length +
    (tracks.includes(draft.track) ? 1 : 0) +
    qs.filter((q) => filled(draft.answers[q.questionId]) && !answerError(q, draft.answers[q.questionId])).length
  return { done, total: req.length + 1 + qs.length }
}

/* ── 지원 파트 ─────────────────────────── */

/** 파트 코드 → 화면 이름 (모르는 코드는 그대로) */
const TRACK_LABEL: Record<string, string> = { FE: 'Frontend', BE: 'Backend', AI: 'AI/ML', DESIGN: 'Product Design', MOBILE: 'Mobile' }
export const trackLabel = (code: string) => TRACK_LABEL[code.toUpperCase()] ?? code

/** 지원 안내의 파트 id(?part=) → 파트 코드 */
const PART_TO_TRACK: Record<string, string> = { frontend: 'FE', backend: 'BE', ai: 'AI', design: 'DESIGN', mobile: 'MOBILE' }

/** ?part=frontend 를 열린 파트 코드로 (대소문자 무시, 없으면 '') */
export function presetTrack(tracks: readonly string[], part: string | null): string {
  const code = part ? PART_TO_TRACK[part.toLowerCase()] : undefined
  return tracks.find((t) => t.toUpperCase() === code) ?? ''
}

/* ── 지원 상태 ─────────────────────────── */

export function closedTitle(state: ApplyState | null, cohort: number, startAt?: string): string {
  if (state === 'BEFORE_START' && startAt) return `${cohort}기 지원은 ${kstDate(startAt).slice(5)}에 열립니다`
  if (state === 'ENDED' || state === 'CLOSED_MANUALLY') return `${cohort}기 지원이 마감됐습니다`
  return '지금은 지원 기간이 아닙니다'
}

/** ISO 시각 → 'YYYY.MM.DD' (KST) */
export function kstDate(iso: string): string {
  const p = kstParts(iso)
  return p ? `${p.year}.${p.month}.${p.day}` : iso
}

/** ISO 시각 → 'YYYY.MM.DD(요일) HH:mm' (KST) */
export function kstDateTime(iso: string): string {
  const p = kstParts(iso)
  return p ? `${p.year}.${p.month}.${p.day}(${p.weekday}) ${p.hour}:${p.minute}` : iso
}

function kstParts(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const parts = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d)
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? ''
  return { year: get('year'), month: get('month'), day: get('day'), weekday: get('weekday'), hour: get('hour'), minute: get('minute') }
}

/* ── 임시 보관 ─────────────────────────── */

export const EMPTY_APPLICANT: Applicant = { name: '', studentId: '', major: '', email: '', phone: '' }
export const emptyDraft = (): ApplyDraft => ({ applicant: { ...EMPTY_APPLICANT }, track: '', answers: {} })

/**
 * 쓰던 지원서 임시 보관 (이 브라우저에만, 모집 회차(rid)별 칸). 동의 · 제출 결과는 남기지 않는다.
 * 학번 · 이메일도 함께 남으므로 제출하면 지운다. 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 조용히 넘어간다.
 */
export const draftKey = (rid: string) => `gdgoc-apply-draft-${rid}`

export function loadDraft(rid: string, storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): ApplyDraft {
  const out = emptyDraft()
  try {
    const raw = storage?.getItem(draftKey(rid))
    if (!raw) return out
    const v: unknown = JSON.parse(raw)
    if (!v || typeof v !== 'object' || Array.isArray(v)) return out
    const o = v as Record<string, unknown>
    if (o.applicant && typeof o.applicant === 'object') {
      for (const f of APPLICANT_FIELDS) {
        const x = (o.applicant as Record<string, unknown>)[f.key]
        if (typeof x === 'string') out.applicant[f.key] = x
      }
    }
    if (typeof o.track === 'string') out.track = o.track
    if (o.answers && typeof o.answers === 'object' && !Array.isArray(o.answers)) {
      for (const [k, x] of Object.entries(o.answers)) {
        if (typeof x === 'string') out.answers[k] = x
        else if (Array.isArray(x) && x.every((y) => typeof y === 'string')) out.answers[k] = x as string[]
      }
    }
    return out
  } catch {
    return out
  }
}

export const isEmptyDraft = (d: ApplyDraft) => !Object.values(d.applicant).some((v) => v.trim()) && !d.track && !Object.values(d.answers).some((v) => (Array.isArray(v) ? v.length : v.trim()))

export function saveDraft(rid: string, draft: ApplyDraft, storage: Pick<Storage, 'setItem' | 'removeItem'> | undefined = safeStorage()) {
  try {
    if (isEmptyDraft(draft)) storage?.removeItem(draftKey(rid))
    else storage?.setItem(draftKey(rid), JSON.stringify(draft))
  } catch {
    /* 저장소가 막혀 있으면 임시 보관 없이 쓴다 */
  }
}

export function clearDraft(rid: string, storage: Pick<Storage, 'removeItem'> | undefined = safeStorage()) {
  try {
    storage?.removeItem(draftKey(rid))
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
