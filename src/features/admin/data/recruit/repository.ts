import type {
  ApplicantDetail,
  ApplicantHistoryEntry,
  ApplicantListQuery,
  ApplicantListResult,
  ApplicantResult,
  BulkResultResponse,
  Criteria,
  CriteriaInput,
  CriteriaSaveResult,
  FinalPassedRow,
  InterviewBoard,
  MailBatch,
  MailTarget,
  MailTemplate,
  RecruitFormBody,
  RecruitFormView,
  RegisterResult,
  ResendBody,
  ResultStage,
  TemplateInput,
} from './types'

/**
 * 모집 관리 저장소 (메서드 하나 = 명세서 API 하나). 주인: 2단계 모집 담당.
 * BE 끼리 부르는 API(API-ARC-015 · 026 · SYS)는 화면이 부르지 않으므로 여기 없다 (예시 저장소가 안에서 흉내 낸다).
 * 명세 API 와 다른 점: 응답에 화면이 쓰는 값을 더했다 (getForm 의 received · lockedQuestionIds, listApplicants 의 counts · failedMailIds · sending · criteriaVersion,
 * mailTargets 의 applicantIds · excludedNoInterview, mailPreview 의 to). 타입은 types.ts.
 */
export interface RecruitRepository {
  // 지원폼
  /** API-ARC-001 GET /api/admin/recruit/form — 임시 저장본 우선 + 접수 수 · 수정 제한 질문 */
  getForm(): Promise<RecruitFormView>
  /** API-ARC-002 PUT /api/admin/recruit/form/draft */
  saveDraft(body: RecruitFormBody): Promise<RecruitFormView>
  /** API-ARC-003 POST /api/admin/recruit/form/publish — 평가 기준이 저장돼 있어야 게시 가능 */
  publish(body: RecruitFormBody): Promise<RecruitFormView>
  // 평가 기준
  /** API-ARC-024 GET /api/admin/recruit/criteria */
  getCriteria(): Promise<Criteria>
  /** API-ARC-025 PUT /api/admin/recruit/criteria — 배점 합계 100 일 때만, rescore 면 전체 재산정 (API-ARC-026) */
  saveCriteria(input: CriteriaInput): Promise<CriteriaSaveResult>
  // 지원자
  /** API-ARC-004 GET /api/admin/applicants?result&q&sort&page (10명) */
  listApplicants(query: ApplicantListQuery): Promise<ApplicantListResult>
  /** API-ARC-005 PATCH /api/admin/applicants/results */
  setResults(applicantIds: string[], result: ApplicantResult): Promise<BulkResultResponse>
  /** API-ARC-006 DELETE /api/admin/applicants (삭제 상태로) */
  removeApplicants(applicantIds: string[]): Promise<{ deleted: number }>
  /** API-ARC-007 GET /api/admin/applicants/{applicantId} */
  getApplicant(applicantId: string): Promise<ApplicantDetail>
  /** API-ARC-008 PATCH /api/admin/applicants/{applicantId}/result — 면접 전형의 '미정'은 서류 합격으로 돌아가기 */
  setResult(applicantId: string, body: { stage: ResultStage; result: ApplicantResult; memo: string }): Promise<ApplicantDetail>
  /** API-ARC-009 GET /api/admin/applicants/{applicantId}/history (최신순) */
  history(applicantId: string): Promise<ApplicantHistoryEntry[]>
  /** API-ARC-010 PATCH /api/admin/applicants/{applicantId}/email */
  updateEmail(applicantId: string, email: string): Promise<ApplicantDetail>
  /** API-ARC-011 POST /api/admin/applicants/{applicantId}/unlock (Lead 만) */
  unlockResult(applicantId: string, body: { stage: ResultStage; reason: string }): Promise<ApplicantDetail>
  /** API-ARC-027 POST /api/admin/applicants/{applicantId}/rescore */
  rescore(applicantId: string): Promise<ApplicantDetail>
  // 면접 일정
  /** API-ARC-030 GET /api/admin/interviews?from&to (KST 'YYYY-MM-DD') */
  interviews(range: { from: string; to: string }): Promise<InterviewBoard>
  /** API-ARC-031 PUT /api/admin/applicants/{applicantId}/interview */
  saveInterview(applicantId: string, body: { startAt: string; interviewerIds: string[] }): Promise<ApplicantDetail>
  // 메일
  /** API-ARC-012 GET /api/admin/mail/targets?excludeSent */
  mailTargets(excludeSent: boolean): Promise<MailTarget[]>
  /** API-ARC-013 GET /api/admin/mail/preview?templateId&applicantId (없으면 예시 값) */
  mailPreview(templateId: string, applicantId?: string): Promise<{ subject: string; body: string; to: string | null }>
  /** API-ARC-014 POST /api/admin/mail/batches — 만들고 바로 돌려준다 (status 'sending'), 처리는 이어서 */
  sendBatch(body: { targets: { result: ApplicantResult; templateId: string }[]; excludeSent: boolean }): Promise<MailBatch>
  /** API-ARC-016 GET /api/admin/mail/batches/{batchId} */
  getBatch(batchId: string): Promise<MailBatch>
  /** API-ARC-017 POST /api/admin/mail/resend — batchId 가 있으면 그 작업의 실패 건을 다시 (결과 갱신), 없으면 새 작업 */
  resend(body: ResendBody): Promise<MailBatch>
  // 템플릿
  /** API-ARC-019 GET /api/admin/mail/templates */
  listTemplates(): Promise<MailTemplate[]>
  /** API-ARC-020 GET /api/admin/mail/templates/{templateId} */
  getTemplate(templateId: string): Promise<MailTemplate>
  /** API-ARC-021 POST /api/admin/mail/templates */
  createTemplate(input: TemplateInput): Promise<MailTemplate>
  /** API-ARC-022 PUT /api/admin/mail/templates/{templateId} */
  saveTemplate(templateId: string, input: TemplateInput): Promise<MailTemplate>
  /** API-ARC-023 POST /api/admin/mail/templates/{templateId}/test — 로그인한 운영진 이메일로 */
  sendTestMail(templateId: string): Promise<{ to: string; subject: string }>
  // 최종 합격자 사용자 등록
  /** API-ARC-028 GET /api/admin/applicants/final-passed */
  finalPassed(): Promise<FinalPassedRow[]>
  /** API-ARC-029 POST /api/admin/users/bulk */
  registerFinalPassed(body: { applicantIds: string[]; generation: number }): Promise<RegisterResult>
}
