import type { IsoTime } from '../common/types'
import type { Applicant, ApplicantResult, CriteriaItem, FormQuestion, InterviewBoard, MailBatch, MailRecord, RecruitFormBody, ResultStage, ScoreItem } from './types'

/**
 * 모집 관리 규칙 (명세 세부 정책을 한곳에). 화면은 버튼을 막고 안내하는 데, 예시 저장소는 서버처럼 한 번 더 막는 데 쓴다.
 * 테스트: recruit.test.ts
 */

// ── 전형 결과 · 단계 · 잠금 (F-ARC-010 · 014 · 017) ──

/** 결과 메일이 발송돼 잠긴 단계 안내 (명세 문구 그대로, F-ARC-014 2) */
export const LOCKED_MESSAGE = '결과 메일이 발송되어 결과가 잠겼어요.'
export const INTERVIEW_ONLY_PASSED = '면접 전형은 서류 합격자만 선택할 수 있습니다.'

/** 서류 전형의 값: 면접 결과(최종 합격 · 면접 불합격)는 서류 합격을 지나온 것 */
export function documentOf(r: ApplicantResult): '서류 합격' | '서류 불합격' | null {
  if (r === '미정') return null
  return r === '서류 불합격' ? '서류 불합격' : '서류 합격'
}

/** 면접 전형의 값 */
export function interviewOf(r: ApplicantResult): '최종 합격' | '면접 불합격' | null {
  return r === '최종 합격' || r === '면접 불합격' ? r : null
}

/** 결과가 속한 단계 (메일 · 잠금을 보는 단계). 미정은 없음 */
export function stageOf(r: ApplicantResult): ResultStage | null {
  if (r === '미정') return null
  return r === '서류 합격' || r === '서류 불합격' ? 'document' : 'interview'
}

export const passedDocument = (r: ApplicantResult) => documentOf(r) === '서류 합격'

/** 목록 · 상세의 '메일 상태': 지금 결과 단계의 메일 (결과가 바뀌면 '-', F-ARC-014 5) */
export function currentMail(a: Pick<Applicant, 'result' | 'mail'>): MailRecord | null {
  const stage = stageOf(a.result)
  const m = stage ? a.mail[stage] : undefined
  return m && m.result === a.result ? m : null
}

/** 지금 결과가 잠겼는지 (목록의 '잠김' 표시, F-ARC-006 4) */
export function currentLocked(a: Pick<Applicant, 'result' | 'locked'>): boolean {
  const stage = stageOf(a.result)
  return stage ? a.locked[stage] : false
}

/**
 * 결과를 next 로 바꿀 수 없는 이유 (바꿀 수 있으면 null).
 * - 바뀌는 단계가 잠겼으면 막는다 (서류 합격 메일을 받은 지원자도 면접 결과는 고를 수 있다, F-ARC-014 4)
 * - 면접 결과(최종 합격 · 면접 불합격)는 서류 합격자에게만 (F-ARC-010 2 · 014 1)
 */
export function resultChangeBlock(a: Pick<Applicant, 'result' | 'locked'>, next: ApplicantResult): string | null {
  if (a.result === next) return '이미 같은 결과입니다.'
  if (interviewOf(next) && !passedDocument(a.result)) return INTERVIEW_ONLY_PASSED
  if (documentOf(a.result) !== documentOf(next) && a.locked.document) return LOCKED_MESSAGE
  if (interviewOf(a.result) !== interviewOf(next) && a.locked.interview) return LOCKED_MESSAGE
  return null
}

/** 일괄 변경 계획 (F-ARC-010): 적용할 지원자 · 제외할 지원자와 사유 */
export function planBulkResult<T extends Pick<Applicant, 'id' | 'name' | 'result' | 'locked'>>(applicants: readonly T[], next: ApplicantResult) {
  const apply: T[] = []
  const excluded: { applicant: T; reason: string }[] = []
  for (const a of applicants) {
    const block = resultChangeBlock(a, next)
    if (block) excluded.push({ applicant: a, reason: block === LOCKED_MESSAGE ? '결과 잠김 (메일 발송 완료)' : block === INTERVIEW_ONLY_PASSED ? '서류 합격자가 아님' : block })
    else apply.push(a)
  }
  return { apply, excluded }
}

/**
 * 단계별 처리(API-ARC-008)의 결과를 최종 결과로: 면접 전형의 '미정'은 서류 합격으로 돌아가는 것.
 * 그 단계에서 고를 수 없는 결과면 null.
 */
export function resultForStage(stage: ResultStage, picked: ApplicantResult): ApplicantResult | null {
  if (stage === 'document') return picked === '미정' || picked === '서류 합격' || picked === '서류 불합격' ? picked : null
  if (picked === '미정') return '서류 합격'
  return picked === '최종 합격' || picked === '면접 불합격' ? picked : null
}

/**
 * 결과를 바꾼 뒤의 지원서 (잠금 확인은 먼저 resultChangeBlock 으로).
 * - 바뀐 단계의 메일 상태는 '-'로 (F-ARC-014 5)
 * - 서류 합격이 아닌 결과로 바뀌면 면접 일정 해제 (F-ARC-014 7)
 */
export function applyResult<T extends Pick<Applicant, 'result' | 'mail' | 'interview'>>(a: T, next: ApplicantResult): { next: T; mailCleared: boolean; interviewCleared: boolean } {
  const docChanged = documentOf(a.result) !== documentOf(next)
  const intChanged = interviewOf(a.result) !== interviewOf(next)
  const mail = { ...a.mail }
  let mailCleared = false
  if (docChanged && mail.document) {
    delete mail.document
    mailCleared = true
  }
  if (intChanged && mail.interview) {
    delete mail.interview
    mailCleared = true
  }
  const interviewCleared = !!a.interview && !passedDocument(next)
  return { next: { ...a, result: next, mail, interview: interviewCleared ? null : a.interview }, mailCleared, interviewCleared }
}

// ── 메일 변수 (F-ARC-028) ──

export const MAIL_VARIABLES = ['{{이름}}', '{{학과}}', '{{이메일}}', '{{기수}}', '{{지원일}}', '{{면접일시}}'] as const
const VARIABLE_NAMES = MAIL_VARIABLES.map((v) => v.slice(2, -2))
const VARIABLE_RE = /\{\{\s*([^{}]*?)\s*\}\}/g

export type MailVariables = Record<string, string>

/** 면접 일정이 없는 지원자의 {{면접일시}} */
export const NO_INTERVIEW_TEXT = '면접 일정 미정'

/** 지원자 정보 → 변수 값 (F-ARC-028 2: {{면접일시}}는 면접 일정이 지정된 지원자만, 예: 2026.10.23 (금) 14:00) */
export function applicantVariables(a: Pick<Applicant, 'name' | 'department' | 'email' | 'generation' | 'appliedAt' | 'interview'>): MailVariables {
  return {
    이름: a.name,
    학과: a.department,
    이메일: a.email,
    기수: `${a.generation}기`,
    지원일: kstDay(a.appliedAt),
    면접일시: a.interview ? kstDateTime(a.interview.startAt) : NO_INTERVIEW_TEXT,
  }
}

/** 예시 값 (템플릿 미리보기 · 테스트 메일, F-ARC-029 · 030 2) */
export const EXAMPLE_VARIABLES: MailVariables = {
  이름: '예시 지원자 01',
  학과: '컴퓨터공학전공',
  이메일: 'applicant01@example.com',
  기수: '5기',
  지원일: '2026.10.14 (수)',
  면접일시: '2026.10.23 (금) 14:00',
}

/** 변수 바꾸기. 모르는 변수는 그대로 둔다 (저장할 때 unsupportedVariables 로 막는다) */
export function renderTemplate(text: string, vars: MailVariables): string {
  return text.replace(VARIABLE_RE, (whole, name: string) => (Object.hasOwn(vars, name) ? vars[name] : whole))
}

/** 지원하지 않는 변수 ('{{학번}}') — 저장 시 안내 (F-ARC-027 2) */
export function unsupportedVariables(text: string): string[] {
  const found = new Set<string>()
  for (const m of text.matchAll(VARIABLE_RE)) if (!VARIABLE_NAMES.includes(m[1])) found.add(m[0])
  return [...found]
}

/** 커서 위치에 변수 넣기 (F-ARC-028): 새 글과 커서 자리 */
export function insertAt(text: string, insert: string, start: number, end = start): { text: string; caret: number } {
  const a = Math.max(0, Math.min(start, text.length))
  const b = Math.max(a, Math.min(end, text.length))
  return { text: text.slice(0, a) + insert + text.slice(b), caret: a + insert.length }
}

// ── 메일 발송 흉내 ──

/**
 * 예시 메일 서비스 (API-ARC-018 흉내, 실제로 보내지 않음). 결과는 주소로 정해진다:
 * - @ 앞이 'bounce' 로 시작: 주소 오류 (주소를 고칠 때까지 실패, F-ARC-016 · 022 2)
 * - @ 앞이 'busy' 로 시작: 처음 한 번만 일시 오류 (재발송하면 성공)
 * 사용자 관리의 PIN 메일 흉내(users/mail.ts)와 같은 규칙.
 */
export function simulateResultMail(to: string, attempt: number): { ok: true } | { ok: false; reason: string } {
  const local = to.trim().toLowerCase()
  if (local.startsWith('bounce')) return { ok: false, reason: '받는 주소를 찾을 수 없습니다 (주소 오류). 이메일을 고친 뒤 다시 보내 주세요.' }
  if (local.startsWith('busy') && attempt <= 1) return { ok: false, reason: '메일 서비스가 잠시 응답하지 않았습니다 (일시 오류). 다시 보내면 됩니다.' }
  return { ok: true }
}

/** 발송 결과 숫자 (F-ARC-021) */
export function batchCounts(b: Pick<MailBatch, 'items'>) {
  const requested = b.items.length
  const succeeded = b.items.filter((i) => i.state === 'sent').length
  const failed = b.items.filter((i) => i.state === 'failed').length
  return { requested, succeeded, failed, processed: succeeded + failed }
}

// ── 면접 일정 (F-ARC-039) ──

/** 면접 1건 길이 (분). 명세 '30분 기준 (확정 필요)' */
export const INTERVIEW_MINUTES = 30
/** 시각 단위 (분) */
export const INTERVIEW_STEP = 10
/** 고를 수 있는 시작 시각 (KST): 09:00 ~ 21:30 (22시 전에 끝나게) */
export const INTERVIEW_DAY = { from: 9 * 60, to: 21 * 60 + 30 } as const
export const BUSY_MESSAGE = '이 시간에 다른 면접이 있어요.'

export function timeSlots(): string[] {
  const out: string[] = []
  for (let m = INTERVIEW_DAY.from; m <= INTERVIEW_DAY.to; m += INTERVIEW_STEP) out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  return out
}

/** 한국 날짜 · 시각 → ISO ('2026-10-23', '14:00') */
export function kstToIso(ymd: string, hhmm: string): IsoTime {
  return new Date(`${ymd}T${hhmm}:00+09:00`).toISOString()
}

/** ISO → 한국 날짜 'YYYY-MM-DD' · 시각 'HH:mm' */
export function isoToKst(iso: IsoTime): { ymd: string; hhmm: string } {
  const s = new Date(Date.parse(iso) + KST).toISOString()
  return { ymd: s.slice(0, 10), hhmm: s.slice(11, 16) }
}

/** 10분 단위인지 (API-ARC-031: 아니면 400) */
export function isOnStep(iso: IsoTime): boolean {
  const t = Date.parse(iso)
  return Number.isFinite(t) && t % (INTERVIEW_STEP * 60_000) === 0
}

/** 두 면접이 겹치는지 (각 30분) */
export const overlaps = (a: number, b: number) => Math.abs(a - b) < INTERVIEW_MINUTES * 60_000

/** 그 시각에 다른 면접이 있는 담당자 (자기 면접은 뺀다) */
export function busyAt(interviews: InterviewBoard['interviews'], startAt: IsoTime, exceptApplicantId: string): Set<string> {
  const t = Date.parse(startAt)
  const busy = new Set<string>()
  for (const i of interviews) {
    if (i.applicantId === exceptApplicantId) continue
    if (overlaps(Date.parse(i.startAt), t)) i.interviewerIds.forEach((id) => busy.add(id))
  }
  return busy
}

/** 고른 담당자 중 겹치는 사람 (저장 때 서버가 다시 확인, F-ARC-039 5) */
export function conflictingInterviewers(interviews: InterviewBoard['interviews'], startAt: IsoTime, interviewerIds: readonly string[], exceptApplicantId: string): string[] {
  const busy = busyAt(interviews, startAt, exceptApplicantId)
  return interviewerIds.filter((id) => busy.has(id))
}

// ── 평가 기준 (F-ARC-031~033) ──

export const CRITERIA_TOTAL = 100

export interface CriteriaDraftItem {
  name: string
  /** 입력 칸 그대로 (숫자가 아닐 수 있음) */
  points: string | number
  questionIds: string[]
  guide: string
}

export const pointsOf = (p: string | number): number => {
  const n = typeof p === 'number' ? p : Number(String(p).trim())
  return Number.isFinite(n) ? n : 0
}

/** 배점 합계 (입력할 때마다 다시 계산, F-ARC-032 3) */
export const criteriaTotal = (items: readonly Pick<CriteriaDraftItem, 'points'>[]) => items.reduce((sum, i) => sum + pointsOf(i.points), 0)

/** 평가할 수 있는 질문 = 고정 질문을 뺀 지원폼 질문 (F-ARC-032 1) */
export const scorableQuestions = (questions: readonly FormQuestion[]) => questions.filter((q) => !q.fixed)

/**
 * 평가 기준 검증 (F-ARC-032 · 033). 칸별 오류: 'items.0.name' · 'items.0.points' · 'items.0.questionIds' · 'items.0.guide' · 'total' · 'items'
 */
export function validateCriteria(items: readonly CriteriaDraftItem[], questions: readonly FormQuestion[]): Record<string, string> {
  const fields: Record<string, string> = {}
  if (items.length === 0) fields.items = '평가 항목을 1개 이상 추가해 주세요.'
  const allowed = new Set(scorableQuestions(questions).map((q) => q.id))
  items.forEach((it, i) => {
    if (!it.name.trim()) fields[`items.${i}.name`] = '항목명을 입력해 주세요.'
    else if (it.name.trim().length > 30) fields[`items.${i}.name`] = '항목명은 30자 이내로 입력해 주세요.'
    const raw = String(it.points).trim()
    const p = Number(raw)
    if (!raw) fields[`items.${i}.points`] = '배점을 입력해 주세요.'
    else if (!Number.isInteger(p) || p < 1 || p > CRITERIA_TOTAL) fields[`items.${i}.points`] = '배점은 1~100 사이의 정수로 입력해 주세요.'
    if (it.questionIds.length === 0) fields[`items.${i}.questionIds`] = '평가할 질문을 1개 이상 골라 주세요.'
    else if (it.questionIds.some((id) => !allowed.has(id))) fields[`items.${i}.questionIds`] = '지원폼에 없는 질문이 있습니다. 다시 골라 주세요.'
    if (!it.guide.trim()) fields[`items.${i}.guide`] = '평가 가이드를 입력해 주세요.'
  })
  const total = criteriaTotal(items)
  if (items.length > 0 && total !== CRITERIA_TOTAL) fields.total = `배점 합계가 100점이어야 저장할 수 있습니다 (지금 ${total}점).`
  return fields
}

// ── 지원폼 (F-ARC-002 · 005) ──

export const QUESTION_TITLE_MAX = 200
export const OPTION_MAX = 50

/** 지원폼 검증 (임시 저장은 형식만, 게시는 기수 · 지원 기간까지). 칸별 오류: 'generation' · 'startDate' · 'endDate' · 'q.<id>.title' · 'q.<id>.options' */
export function validateForm(body: RecruitFormBody, { publish }: { publish: boolean }): Record<string, string> {
  const fields: Record<string, string> = {}
  if (publish) {
    if (!Number.isInteger(body.generation) || body.generation < 1 || body.generation > 99) fields.generation = '모집 기수를 입력해 주세요.'
    if (!body.startDate) fields.startDate = '지원 시작일을 입력해 주세요.'
    if (!body.endDate) fields.endDate = '지원 종료일을 입력해 주세요.'
    if (body.startDate && body.endDate && body.startDate > body.endDate) fields.endDate = '종료일은 시작일과 같거나 뒤여야 합니다.'
  }
  for (const q of body.questions) {
    if (q.fixed) continue
    if (publish && !q.title.trim()) fields[`q.${q.id}.title`] = '질문 내용을 입력해 주세요.'
    else if (q.title.length > QUESTION_TITLE_MAX) fields[`q.${q.id}.title`] = `질문 내용은 ${QUESTION_TITLE_MAX}자 이내로 입력해 주세요.`
    if (q.type === 'choice') {
      const filled = q.options.map((o) => o.trim()).filter(Boolean)
      if (publish && filled.length < 2) fields[`q.${q.id}.options`] = '객관식은 선택지를 2개 이상 입력해 주세요.'
      else if (new Set(filled).size !== filled.length) fields[`q.${q.id}.options`] = '같은 선택지가 두 번 있습니다.'
    }
  }
  return fields
}

/**
 * 접수 뒤 수정 제한 (F-ARC-005 5 '확정 필요' → 아래 임시 규칙. 기획 확정 뒤 이 함수만 바꾸면 된다).
 * 게시본 기수로 지원서가 1건이라도 접수되면 기존 응답과 맞지 않게 되는 변경만 막는다:
 * - 게시본의 질문: 삭제 · 유형 · 필수 여부 · 선택지 변경 불가 (문구 · 순서는 고칠 수 있음)
 * - 새 질문: 더할 수 있지만 '선택' 항목으로만 (이미 낸 지원자에게는 답이 없으므로)
 * - 모집 기수 변경 불가 (지원 기간은 고칠 수 있음)
 */
export function formLockViolation(body: RecruitFormBody, published: RecruitFormBody | null, lockedIds: readonly string[]): string | null {
  if (!published || lockedIds.length === 0) return null
  if (body.generation !== published.generation) return '지원서가 접수된 뒤에는 모집 기수를 바꿀 수 없습니다.'
  const locked = new Set(lockedIds)
  for (const id of lockedIds) {
    const was = published.questions.find((q) => q.id === id)!
    const now = body.questions.find((q) => q.id === id)
    if (!now) return `지원서가 접수된 질문은 삭제할 수 없습니다 ('${was.title}').`
    if (now.type !== was.type || now.required !== was.required || now.options.join('\n') !== was.options.join('\n')) {
      return `지원서가 접수된 질문은 유형 · 필수 여부 · 선택지를 바꿀 수 없습니다 ('${was.title}').`
    }
  }
  const newRequired = body.questions.find((q) => !q.fixed && !locked.has(q.id) && q.required)
  if (newRequired) return `지원서가 접수된 뒤에 더한 질문은 '선택' 항목으로만 둘 수 있습니다 ('${newRequired.title || '새 질문'}').`
  return null
}

// ── AI 채점 흉내 (F-RCT-007) ──

/** 추적성 표시 값 (F-RCT-007 7). 모델은 명세 '확정 필요' 라 예시 값 */
export const SCORING_MODEL = 'Vertex AI Gemini (예시 · 모델 미정)'
export const PROMPT_VERSION = 'scoring-prompt v1 (예시)'
/** 재시도 한도 (F-RCT-007 4 · F-SYS-002 2) */
export const MAX_ATTEMPTS = 3
/** 동시에 처리하는 채점 수 (F-SYS-002 4 예시 값) */
export const SCORING_CONCURRENCY = 5

/** 응답 안의 지시문 (지원자가 채점자에게 시키려는 말). 따르지 않고 근거에 표시한다 */
const INSTRUCTION_RE = /(만점|100점|최고점)\s*(을|를)?\s*(줘|주세요|달라|줄 것)|(이전|앞의)\s*지시(를|는)?\s*무시|ignore (all )?previous/i
export const hasInstruction = (text: string) => INSTRUCTION_RE.test(text)

/** 문자열 → 0..999 (같은 응답이면 같은 점수: temperature 0 흉내, F-RCT-007 6) */
function hash(text: string): number {
  let h = 7
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 1000
  return h
}

/**
 * 예시 채점: 항목마다 지정한 질문의 응답만 보고(이름 · 학번 · 학과 · 이메일은 보지 않음, F-RCT-007 1) 0~배점 정수와 근거를 낸다.
 * 실제 AI 가 아니다. 응답 길이 · 글자로 정해지는 예시 점수라 같은 응답이면 늘 같은 점수가 나온다.
 */
export function simulateScoreItems(answers: Readonly<Record<string, string>>, items: readonly CriteriaItem[]): ScoreItem[] {
  return items.map((it) => {
    const text = it.questionIds
      .map((id) => answers[id] ?? '')
      .join('\n')
      .trim()
    const ignored = hasInstruction(text)
    if (!text) return { itemId: it.id, name: it.name, points: it.points, score: 0, reason: '(예시 근거) 이 항목의 질문에 답하지 않았습니다.' }
    const lengthScore = Math.min(text.length, 140) / 140
    const ratio = Math.min(1, 0.12 + lengthScore * 0.76 + (hash(text) % 13) / 100 - (ignored ? 0.2 : 0))
    const score = Math.max(0, Math.min(it.points, Math.round(it.points * ratio)))
    const band = score / it.points
    const base =
      band >= 0.8
        ? `(예시 근거) '${it.name}' 기준에 맞는 구체적인 경험과 이유가 적혀 있어 높은 점수 기준에 가깝습니다.`
        : band >= 0.55
          ? `(예시 근거) '${it.name}'에 맞는 내용이지만 구체적인 예가 적어 중간 점수를 주었습니다.`
          : `(예시 근거) 답이 짧고 일반적인 표현이 많아 '${it.name}'의 낮은 점수 기준에 가깝습니다.`
    const reason = ignored ? `${base} 응답 안의 지시문('만점을 줘')은 채점 지시로 따르지 않고 응답 내용으로만 평가했습니다.` : base
    return { itemId: it.id, name: it.name, points: it.points, score, reason, ...(ignored ? { instructionIgnored: true } : {}) }
  })
}

/** 검증 (F-RCT-007 3): 항목 수가 같고, 0~배점 정수, 근거가 비어 있지 않음 */
export function isValidScore(items: readonly ScoreItem[], criteria: readonly CriteriaItem[]): boolean {
  return items.length === criteria.length && items.every((s, i) => s.itemId === criteria[i].id && Number.isInteger(s.score) && s.score >= 0 && s.score <= s.points && s.reason.trim().length > 0)
}

/** 총점은 AI 값이 아니라 항목 점수 합 (F-RCT-007 3) */
export const sumScore = (items: readonly Pick<ScoreItem, 'score'>[]) => items.reduce((s, i) => s + i.score, 0)

// ── 한국 시간 표기 (메일 변수 · 이력 문구) ──

const KST = 9 * 3_600_000
const WEEKDAYS = '일월화수목금토'

/** '2026.10.23 (금)' */
export function kstDay(iso: IsoTime): string {
  const t = new Date(Date.parse(iso) + KST)
  return `${t.getUTCFullYear()}.${String(t.getUTCMonth() + 1).padStart(2, '0')}.${String(t.getUTCDate()).padStart(2, '0')} (${WEEKDAYS[t.getUTCDay()]})`
}

/** '2026.10.23 (금) 14:00' (명세 {{면접일시}} 예) */
export function kstDateTime(iso: IsoTime): string {
  const t = new Date(Date.parse(iso) + KST)
  return `${kstDay(iso)} ${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`
}
