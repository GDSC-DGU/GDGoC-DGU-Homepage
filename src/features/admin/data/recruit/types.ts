import type { ActorRef, AuditStamp, IsoTime, Page, PageQuery, Ymd } from '../common/types'

/**
 * 모집 관리 (P-ARC-01~10, API-ARC-001~031).
 * 주인: 2단계 모집 담당. 대시보드는 form.published 의 endDate(지원 마감)만 읽는다 — 그 이름은 유지해 주세요.
 * 규칙(결과 · 잠금 · 메일 변수 · 면접 겹침 · 배점 · 수정 제한)은 rules.ts 에 순수 함수로 있다 (화면과 예시 저장소가 같이 쓴다).
 */

// ── 지원폼 (P-ARC-01) ──
export type QuestionType = 'short' | 'long' | 'choice'
export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = { short: '단답형', long: '장문형', choice: '객관식' }

export interface FormQuestion {
  id: string
  title: string
  type: QuestionType
  required: boolean
  /** 객관식 선택지 (2개 이상) */
  options: string[]
  /** 고정 질문 (이름 · 학번 · 학과 · 이메일): 삭제 · 유형 변경 불가 */
  fixed: boolean
}

/** API-ARC-002 · 003 요청 */
export interface RecruitFormBody {
  generation: number
  /** 지원 기간 (KST, 시작일 0시 ~ 종료일 23:59) */
  startDate: Ymd | null
  endDate: Ymd | null
  questions: FormQuestion[]
}

export interface RecruitFormState {
  /** 임시 저장본 (F-ARC-004). 불러올 때 이것이 우선 */
  draft: RecruitFormBody | null
  draftSaved: AuditStamp | null
  /** 게시본 (F-ARC-005). 대시보드 · 홈 캘린더의 '지원 마감'은 published.endDate */
  published: RecruitFormBody | null
  publishedStamp: AuditStamp | null
}

/**
 * API-ARC-001 응답 = 저장된 양식 + 수정 제한에 필요한 값 (서버가 계산).
 * 수정 제한 방식은 명세 '확정 필요'(F-ARC-005 5) → 임시 규칙: rules.ts formEditPolicy
 */
export interface RecruitFormView extends RecruitFormState {
  /** 게시본 기수로 접수된 지원서 수 (삭제 포함: 응답이 남아 있으므로) */
  received: number
  /** 접수가 있어 유형 · 필수 · 선택지 · 삭제를 막는 질문 (게시본의 질문) */
  lockedQuestionIds: string[]
}

// ── 평가 기준 (P-ARC-07) ──
export interface CriteriaItem {
  id: string
  name: string
  points: number
  /** 평가할 질문 (고정 질문 제외, 1개 이상) */
  questionIds: string[]
  /** 높은 점수 / 낮은 점수 기준 */
  guide: string
}

export interface Criteria {
  items: CriteriaItem[]
  /** 지원자 점수에 산정 당시 기준을 함께 남기는 번호 (저장할 때마다 1 올라간다, 처음은 0 = 없음) */
  version: number
  updated: AuditStamp | null
}

// ── 지원자 (P-ARC-02 · 03) ──
export const APPLICANT_RESULTS = ['미정', '서류 합격', '서류 불합격', '면접 불합격', '최종 합격'] as const
export type ApplicantResult = (typeof APPLICANT_RESULTS)[number]
/** 메일을 보내는 결과 (미정은 발송에서 제외, F-ARC-018 2) */
export type MailResult = Exclude<ApplicantResult, '미정'>
export const MAIL_RESULTS: readonly MailResult[] = ['서류 합격', '서류 불합격', '면접 불합격', '최종 합격']
export type ResultStage = 'document' | 'interview'
export const STAGE_LABEL: Record<ResultStage, string> = { document: '서류 전형', interview: '면접 전형' }

/** 채점 상태 (F-RCT-006 2): 대기 → 분석 중 → 완료 / 산정 실패 */
export type ScoreState = 'waiting' | 'analyzing' | 'done' | 'failed'

export interface ScoreItem {
  itemId: string
  name: string
  points: number
  score: number
  /** 산정 근거 */
  reason: string
  /** 응답 안의 지시문('만점을 줘' 등)을 따르지 않았음 (F-RCT-007 5) */
  instructionIgnored?: boolean
}

/** 예시 채점 작업 (재산정 흉내). 있으면 예시 저장소가 이어서 처리한다 */
export interface ScoringJob {
  id: string
  requestedBy: ActorRef
  /** 이전 점수 ('이전 점수 → 새 점수' 이력, F-ARC-034 4 · 035 3). 산정 실패였으면 null */
  previousTotal: number | null
  previousState: ScoreState
}

export interface ApplicantScore {
  state: ScoreState
  /** 총점: AI 값이 아니라 항목 점수 합 (F-RCT-007 3) */
  total: number | null
  items: ScoreItem[]
  // 추적성 (F-RCT-007 7)
  criteriaVersion: number | null
  model: string | null
  promptVersion: string | null
  scoredAt: IsoTime | null
  /** 지금 상태가 된 시각 (대기 · 분석 중이 15분 넘게 머물면 F-SYS-002 가 다시 넣는다) */
  stateAt: IsoTime
  /** 이번 작업의 시도 횟수 (최대 3회, F-RCT-007 4 · F-SYS-002 2) */
  attempts: number
  /** 산정 실패 사유 */
  failReason: string | null
  job: ScoringJob | null
}

/** 메일 상태 (F-ARC-006 3): 발송 완료 / 발송 실패 / 없음('-') */
export interface MailRecord {
  state: 'sent' | 'failed'
  at: IsoTime
  /** 보낸 결과 (이 결과가 지금 결과와 같을 때만 의미가 있다) */
  result: MailResult
  templateId: string
  templateName: string
  /** 발송 시점의 제목 (템플릿을 고쳐도 이미 보낸 메일은 그대로, F-ARC-027 3) */
  subject: string
  /** 보낸 주소 */
  to: string
  failReason: string | null
  batchId: string
  by: ActorRef
  /** 같은 단계 · 결과로 보낸 횟수 (재발송 포함) */
  attempts: number
}

export interface InterviewSlot {
  /** 시작 시각 (10분 단위, KST). 길이는 30분 기준 (F-ARC-039 4, 확정 필요) */
  startAt: IsoTime
  /** 면접 담당자 (활성 Core 1명 이상) */
  interviewerIds: string[]
}

export interface Applicant {
  id: string
  /** 지원 번호 (접수 순서) */
  no: number
  generation: number
  /** 예시 이름: '예시 지원자 01' */
  name: string
  studentId: string
  department: string
  email: string
  appliedAt: IsoTime
  /** 질문 id → 답 (객관식은 고른 선택지) */
  answers: Record<string, string>
  score: ApplicantScore
  result: ApplicantResult
  /** 마지막으로 결과를 처리한 계정 · 시각 */
  processed: AuditStamp | null
  /** 단계별 결과 메일 (서류 결과 메일 · 면접 결과 메일) */
  mail: Partial<Record<ResultStage, MailRecord>>
  /** 메일 발송 완료로 잠긴 단계 (F-ARC-014 2) */
  locked: Record<ResultStage, boolean>
  interview: InterviewSlot | null
  /** 삭제 상태 (실제로 지우지 않음, F-ARC-011 1) */
  deleted: AuditStamp | null
}

export interface ApplicantHistoryEntry {
  id: string
  applicantId: string
  at: IsoTime
  /** 처리 주체: 관리자 계정 또는 시스템 */
  actor: ActorRef
  content: string
  /** 메모 또는 사유 */
  note: string | null
}

// ── 메일 (P-ARC-04 · 05 · 06) ──
export interface MailTemplate {
  id: string
  name: string
  /** 적용 결과 */
  result: MailResult
  isDefault: boolean
  subject: string
  body: string
  updated: AuditStamp
}

export interface MailBatchItem {
  applicantId: string
  name: string
  /** 보낼 때의 주소 (처리할 때 지원서의 지금 주소로 다시 읽는다) */
  email: string
  result: MailResult
  stage: ResultStage
  templateId: string
  state: 'queued' | 'sent' | 'failed'
  reason: string | null
}

/** 발송 작업 (API-ARC-014 · 016). 지원자 단위로 처리된다 (API-ARC-015 흉내) */
export interface MailBatch {
  id: string
  at: IsoTime
  by: ActorRef
  /** 일괄 발송 · 실패 건 재발송 */
  kind: 'batch' | 'resend'
  status: 'sending' | 'done'
  finishedAt: IsoTime | null
  items: MailBatchItem[]
}

/** store 의 recruit 칸 */
export interface RecruitState {
  form: RecruitFormState
  criteria: Criteria
  applicants: Applicant[]
  history: ApplicantHistoryEntry[]
  templates: MailTemplate[]
  batches: MailBatch[]
}

// ── 요청 · 응답 ──
export type ApplicantSort = 'appliedAt' | 'score'

export interface ApplicantListQuery extends PageQuery {
  result?: ApplicantResult
  q?: string
  sort?: ApplicantSort
}

/** 목록 한 줄: 학번은 가려서, 응답은 빼고 */
export type ApplicantRow = Omit<Applicant, 'studentId' | 'answers'> & { maskedStudentId: string }

/** 지원서 상세 (API-ARC-007): 학번은 가린 값만 (F-ARC-013 2) */
export type ApplicantDetail = Omit<Applicant, 'studentId'> & { maskedStudentId: string }

export interface SendingSummary {
  batchId: string
  processed: number
  requested: number
}

export interface ApplicantListResult extends Page<ApplicantRow> {
  counts: Record<'전체' | ApplicantResult, number>
  /** 툴바 [실패 건 재발송 (N)]: 지금 결과의 메일이 '발송 실패'인 지원자 (모든 쪽) */
  failedMailCount: number
  failedMailIds: string[]
  /** 지금 보내는 중인 발송 작업 (팝업을 닫아도 계속, F-ARC-020 6) */
  sending: SendingSummary | null
  /** 지금 평가 기준 버전 (점수가 옛 기준인지 보이기) */
  criteriaVersion: number
}

export interface BulkResultResponse {
  applied: number
  excluded: { applicantId: string; name: string; reason: string }[]
}

export interface MailTarget {
  result: MailResult
  count: number
  /** 발송 대상 지원 순서대로 (미리보기에서 넘겨 보기) */
  applicantIds: string[]
  defaultTemplateId: string | null
  /** 서류 합격 중 면접 일정 미지정으로 빠진 인원 (F-ARC-018 5) */
  excludedNoInterview: number
}

export interface FinalPassedRow {
  applicantId: string
  name: string
  maskedStudentId: string
  department: string
  email: string
  /** 같은 학번의 사용자가 없으면 true ('이미 등록됨 · 제외') */
  registrable: boolean
}

export interface RegisterResult {
  registered: { applicantId: string; name: string; mail: 'sent' | 'failed' }[]
  skipped: { applicantId: string; name: string; reason: string }[]
  failed: { applicantId: string; name: string; reason: string }[]
}

export interface InterviewBoard {
  interviewers: { userId: string; name: string }[]
  interviews: { applicantId: string; applicantName: string; startAt: IsoTime; endAt: IsoTime; interviewerIds: string[] }[]
}

export interface CriteriaInput {
  items: Omit<CriteriaItem, 'id'>[]
  rescore: boolean
}

export interface CriteriaSaveResult {
  criteria: Criteria
  /** 재산정을 요청한 지원서 수 */
  rescoring: number
}

export interface TemplateInput {
  name: string
  result: MailResult
  subject: string
  body: string
  isDefault: boolean
}

export type ResendBody = { applicantIds: string[]; batchId?: string } | { batchId: string; failedOnly: true }
