import { SYSTEM_ACTOR } from '../common/accounts'
import { AdminRepoError } from '../common/errors'
import { byNewest, matchesQuery, newId, paginate } from '../common/list'
import { isEmail, maskStudentId } from '../common/mask'
import { isoNow, requireActor, respond, type MockContext } from '../common/mockContext'
import type { ActorRef } from '../common/types'
import { canUnlockApplicantResult } from '../permissions'
import { bulkRegisterUsers } from '../users/registration'
import type { RecruitRepository } from './repository'
import {
  applicantVariables,
  applyResult,
  batchCounts,
  conflictingInterviewers,
  currentMail,
  documentOf,
  EXAMPLE_VARIABLES,
  formLockViolation,
  INTERVIEW_MINUTES,
  INTERVIEW_ONLY_PASSED,
  interviewOf,
  isOnStep,
  isoToKst,
  isValidScore,
  kstDateTime,
  LOCKED_MESSAGE,
  MAX_ATTEMPTS,
  passedDocument,
  planBulkResult,
  PROMPT_VERSION,
  renderTemplate,
  resultChangeBlock,
  resultForStage,
  SCORING_CONCURRENCY,
  SCORING_MODEL,
  simulateResultMail,
  simulateScoreItems,
  stageOf,
  sumScore,
  unsupportedVariables,
  validateCriteria,
  validateForm,
} from './rules'
import { FIXED_QUESTIONS } from './seed'
import {
  APPLICANT_RESULTS,
  MAIL_RESULTS,
  STAGE_LABEL,
  type Applicant,
  type ApplicantDetail,
  type ApplicantHistoryEntry,
  type ApplicantResult,
  type ApplicantRow,
  type MailBatch,
  type MailBatchItem,
  type MailResult,
  type MailTarget,
  type MailTemplate,
  type RecruitFormBody,
  type RecruitFormView,
  type RecruitState,
  type TemplateInput,
} from './types'

/**
 * 서버 일 흉내의 빠르기 (밀리초). 테스트는 가짜 시계로 넘긴다.
 * - 채점: 한 박자마다 '분석 중'을 끝내고 '대기'를 동시에 5건까지 '분석 중'으로 (F-SYS-002 4)
 * - 메일: 한 박자마다 3명씩 (박자는 예시 저장소 지연 200–400ms 보다 길게: 목록이 진행 상황을 따라 그릴 수 있게)
 */
export const RECRUIT_SIM = { scoreTick: 900, mailTick: 600, mailPerTick: 3 }

type LogInput = { at?: string; actor: ActorRef; content: string; note?: string | null }

const toRow = (a: Applicant): ApplicantRow => {
  const { studentId, answers, ...rest } = a
  void answers
  return { ...rest, maskedStudentId: maskStudentId(studentId) }
}
const toDetail = (a: Applicant): ApplicantDetail => {
  const { studentId, ...rest } = a
  return { ...rest, maskedStudentId: maskStudentId(studentId), answers: { ...a.answers, 'q-student-id': maskStudentId(studentId) } }
}

/** 고정 질문이 빠지지 않게, 늘 맨 앞에 (F-ARC-002 1) */
const withFixed = (body: RecruitFormBody): RecruitFormBody => ({
  ...body,
  questions: [...FIXED_QUESTIONS, ...body.questions.filter((q) => !FIXED_QUESTIONS.some((f) => f.id === q.id)).map((q) => ({ ...q, fixed: false, options: q.type === 'choice' ? q.options : [] }))],
})

const stageValue = (stage: 'document' | 'interview', r: ApplicantResult) => (stage === 'document' ? documentOf(r) : interviewOf(r)) ?? '미정'
const interviewText = (slot: Applicant['interview'], names: (id: string) => string) => (slot ? `${kstDateTime(slot.startAt)} · ${slot.interviewerIds.map(names).join(', ')}` : '없음')

/**
 * 모집 예시 저장소 (store 의 recruit 칸). 메일 발송 · AI 채점은 흉내만 (진행 표시 → 결과). 실제 네트워크 요청 금지 (BRIEF).
 * 메일 · 채점 작업은 이 저장소 안의 타이머가 이어서 처리한다: 팝업을 닫거나 다른 화면으로 가도 계속된다 (F-ARC-020 6).
 * 새로고침하면 남은 작업을 읽을 때 다시 이어 간다.
 */
export function createMockRecruitRepository(ctx: MockContext): RecruitRepository {
  const state = () => ctx.store.get('recruit')
  const set = (fn: (s: RecruitState) => RecruitState) => ctx.store.set('recruit', fn)
  const live = () => state().applicants.filter((a) => !a.deleted)
  const findApplicant = (id: string) => {
    const a = state().applicants.find((x) => x.id === id && !x.deleted)
    if (!a) throw new AdminRepoError('NOT_FOUND', '지원서를 찾을 수 없습니다. 삭제되었을 수 있습니다.')
    return a
  }
  const findTemplate = (id: string) => {
    const t = state().templates.find((x) => x.id === id)
    if (!t) throw new AdminRepoError('NOT_FOUND', '템플릿을 찾을 수 없습니다.')
    return t
  }
  const userName = (id: string) => ctx.store.get('users').users.find((u) => u.id === id)?.name ?? '알 수 없는 담당자'
  const entry = (applicantId: string, l: LogInput): ApplicantHistoryEntry => ({ id: newId('ah'), applicantId, at: l.at ?? isoNow(ctx), actor: l.actor, content: l.content, note: l.note ?? null })

  /** 지원자 여러 명을 한 번에 고치고 이력을 남긴다 (store 한 번) */
  const update = (changes: Map<string, { next: Applicant; logs: LogInput[] }>) => {
    if (changes.size === 0) return
    set((s) => ({
      ...s,
      applicants: s.applicants.map((a) => changes.get(a.id)?.next ?? a),
      history: [...s.history, ...[...changes].flatMap(([id, c]) => c.logs.map((l) => entry(id, l)))],
    }))
  }
  const updateOne = (next: Applicant, logs: LogInput[]) => update(new Map([[next.id, { next, logs }]]))

  // ── 채점 흉내 (F-RCT-006 · 007, F-ARC-034 · 035) ──
  let scoreTimer: ReturnType<typeof setTimeout> | null = null
  /** 이 저장소가 만든 작업만 처리한다 (seed 의 'seedjob-' 은 멈춰 있는 예시) */
  const isSimJob = (a: Applicant) => !a.deleted && !!a.score.job?.id.startsWith('job-') && (a.score.state === 'waiting' || a.score.state === 'analyzing')
  const kickScoring = () => {
    if (scoreTimer || !state().applicants.some(isSimJob)) return
    scoreTimer = setTimeout(scoreTick, RECRUIT_SIM.scoreTick)
  }
  function scoreTick() {
    scoreTimer = null
    const at = isoNow(ctx)
    const { criteria } = state()
    const changes = new Map<string, { next: Applicant; logs: LogInput[] }>()
    // 1) 분석 중 → 완료 / 산정 실패
    for (const a of state().applicants) {
      if (!isSimJob(a) || a.score.state !== 'analyzing') continue
      const job = a.score.job!
      const items = simulateScoreItems(a.answers, criteria.items)
      const before = job.previousTotal === null ? '산정 실패' : `${job.previousTotal}점`
      if (criteria.items.length > 0 && isValidScore(items, criteria.items)) {
        const total = sumScore(items)
        changes.set(a.id, {
          next: {
            ...a,
            score: {
              state: 'done',
              total,
              items,
              criteriaVersion: criteria.version,
              model: SCORING_MODEL,
              promptVersion: PROMPT_VERSION,
              scoredAt: at,
              stateAt: at,
              attempts: a.score.attempts,
              failReason: null,
              job: null,
            },
          },
          logs: [{ actor: SYSTEM_ACTOR, content: `점수 재산정 (${before} → ${total}점) · 평가 기준 v${criteria.version}` }],
        })
      } else if (a.score.attempts < MAX_ATTEMPTS) {
        changes.set(a.id, { next: { ...a, score: { ...a.score, state: 'waiting', stateAt: at } }, logs: [] })
      } else {
        changes.set(a.id, {
          next: { ...a, score: { ...a.score, state: 'failed', total: null, items: [], stateAt: at, failReason: '응답 형식 검증 실패 · 3회 재시도 후 실패', job: null } },
          logs: [{ actor: SYSTEM_ACTOR, content: '산정 실패 (3회 재시도) · 응답 형식 검증 실패' }],
        })
      }
    }
    // 2) 대기 → 분석 중 (동시에 5건까지)
    const busy = state().applicants.filter((a) => isSimJob(a) && a.score.state === 'analyzing' && !changes.has(a.id)).length
    let slots = SCORING_CONCURRENCY - busy
    for (const a of state().applicants) {
      if (slots <= 0) break
      if (!isSimJob(a) || changes.has(a.id) || a.score.state !== 'waiting') continue
      slots -= 1
      changes.set(a.id, { next: { ...a, score: { ...a.score, state: 'analyzing', stateAt: at, attempts: a.score.attempts + 1 } }, logs: [] })
    }
    update(changes)
    kickScoring()
  }
  const startJob = (a: Applicant, by: ActorRef, at: string): Applicant => ({
    ...a,
    score: {
      ...a.score,
      state: 'waiting',
      total: null,
      items: [],
      scoredAt: null,
      stateAt: at,
      attempts: 0,
      failReason: null,
      job: { id: newId('job'), requestedBy: by, previousTotal: a.score.state === 'done' ? a.score.total : (a.score.job?.previousTotal ?? null), previousState: a.score.state },
    },
  })

  // ── 메일 발송 흉내 (API-ARC-015 · 018) ──
  let mailTimer: ReturnType<typeof setTimeout> | null = null
  const kickMail = () => {
    if (mailTimer || !state().batches.some((b) => b.status === 'sending')) return
    mailTimer = setTimeout(mailTick, RECRUIT_SIM.mailTick)
  }
  function mailTick() {
    mailTimer = null
    const at = isoNow(ctx)
    set((s) => {
      let budget = RECRUIT_SIM.mailPerTick
      const applicants = new Map(s.applicants.map((a) => [a.id, a]))
      const logs: ApplicantHistoryEntry[] = []
      const batches = s.batches.map((b) => {
        if (b.status !== 'sending' || budget <= 0) return b
        const items = b.items.map((item): MailBatchItem => {
          if (item.state !== 'queued' || budget <= 0) return item
          budget -= 1
          const a = applicants.get(item.applicantId)
          if (!a || a.deleted) return { ...item, state: 'failed', reason: '삭제된 지원자라 보내지 않았습니다.' }
          if (a.result !== item.result) return { ...item, state: 'failed', reason: '발송 전에 결과가 바뀌어 보내지 않았습니다.' }
          const tpl = s.templates.find((t) => t.id === item.templateId)
          if (!tpl) return { ...item, state: 'failed', reason: '템플릿을 찾을 수 없습니다.' }
          const prev = a.mail[item.stage]
          const attempts = prev && prev.result === item.result ? prev.attempts + 1 : 1
          const sent = simulateResultMail(a.email, attempts)
          const reason = sent.ok ? null : sent.reason
          const vars = applicantVariables(a)
          applicants.set(a.id, {
            ...a,
            mail: {
              ...a.mail,
              [item.stage]: {
                state: sent.ok ? 'sent' : 'failed',
                at,
                result: item.result,
                templateId: tpl.id,
                templateName: tpl.name,
                subject: renderTemplate(tpl.subject, vars),
                to: a.email,
                failReason: reason,
                batchId: b.id,
                by: b.by,
                attempts,
              },
            },
            // 성공하면 그 단계 결과가 잠긴다. 실패는 잠기지 않는다 (F-ARC-020 2 · 3)
            locked: sent.ok ? { ...a.locked, [item.stage]: true } : a.locked,
          })
          const again = attempts > 1 ? '재발송' : '발송'
          logs.push(entry(a.id, { at, actor: b.by, content: `${item.result} 메일 ${again} ${sent.ok ? '완료' : '실패'} · 템플릿 「${tpl.name}」`, note: reason }))
          return { ...item, email: a.email, state: sent.ok ? 'sent' : 'failed', reason }
        })
        const done = items.every((i) => i.state !== 'queued')
        return { ...b, items, status: done ? ('done' as const) : b.status, finishedAt: done ? at : b.finishedAt }
      })
      return { ...s, applicants: s.applicants.map((a) => applicants.get(a.id) ?? a), batches, history: [...s.history, ...logs] }
    })
    kickMail()
  }
  /** 읽을 때 남은 작업을 이어 간다 (새로고침 뒤) */
  const resume = () => {
    kickScoring()
    kickMail()
  }
  const sendingBatch = () => state().batches.find((b) => b.status === 'sending')
  const guardSending = () => {
    if (sendingBatch()) throw new AdminRepoError('CONFLICT', '다른 메일을 보내는 중입니다. 발송이 끝난 뒤 다시 시도해 주세요.')
  }

  /** 결과별 발송 대상 (F-ARC-018) */
  const targetsOf = (result: MailResult, excludeSent: boolean) => {
    const stage = stageOf(result)!
    const all = live()
      .filter((a) => a.result === result)
      .filter((a) => !(excludeSent && a.mail[stage]?.state === 'sent' && a.mail[stage]?.result === result))
      .sort((a, b) => a.no - b.no)
    const noInterview = result === '서류 합격' ? all.filter((a) => !a.interview) : []
    return { list: all.filter((a) => !noInterview.includes(a)), noInterview: noInterview.length }
  }

  // ── 지원폼 ──
  const formView = (): RecruitFormView => {
    const f = state().form
    const pub = f.published
    const received = pub ? state().applicants.filter((a) => a.generation === pub.generation).length : 0
    const lockedQuestionIds = pub && received > 0 ? pub.questions.filter((q) => !q.fixed).map((q) => q.id) : []
    // 처음 만들 때는 고정 질문만 있는 빈 양식 (F-ARC-001 1)
    const base = !f.draft && !pub ? { ...f, draft: { generation: 5, startDate: null, endDate: null, questions: [...FIXED_QUESTIONS] } } : f
    return { ...base, received, lockedQuestionIds }
  }
  const checkForm = (body: RecruitFormBody, publish: boolean) => {
    const fields = validateForm(body, { publish })
    if (Object.keys(fields).length) throw new AdminRepoError('VALIDATION', '입력한 내용을 확인해 주세요.', { fields })
    const view = formView()
    const lock = formLockViolation(body, view.published, view.lockedQuestionIds)
    if (lock) throw new AdminRepoError('CONFLICT', lock)
  }

  // ── 템플릿 ──
  const checkTemplate = (input: TemplateInput, current: MailTemplate | null) => {
    const fields: Record<string, string> = {}
    if (!input.name.trim()) fields.name = '템플릿 이름을 입력해 주세요.'
    else if (input.name.trim().length > 40) fields.name = '템플릿 이름은 40자 이내로 입력해 주세요.'
    if (!MAIL_RESULTS.includes(input.result)) fields.result = '적용 결과를 골라 주세요.'
    if (!input.subject.trim()) fields.subject = '메일 제목을 입력해 주세요.'
    else if (input.subject.length > 100) fields.subject = '메일 제목은 100자 이내로 입력해 주세요.'
    if (!input.body.trim()) fields.body = '본문을 입력해 주세요.'
    else if (input.body.length > 3000) fields.body = '본문은 3,000자 이내로 입력해 주세요.'
    const badSubject = unsupportedVariables(input.subject)
    const badBody = unsupportedVariables(input.body)
    if (!fields.subject && badSubject.length) fields.subject = `지원하지 않는 변수가 있습니다: ${badSubject.join(' ')}`
    if (!fields.body && badBody.length) fields.body = `지원하지 않는 변수가 있습니다: ${badBody.join(' ')}`
    if (Object.keys(fields).length) throw new AdminRepoError('VALIDATION', '입력한 내용을 확인해 주세요.', { fields })
    if (current?.isDefault && (!input.isDefault || input.result !== current.result)) {
      throw new AdminRepoError('CONFLICT', `「${current.name}」은 ${current.result}의 기본 템플릿입니다. 같은 결과의 다른 템플릿을 먼저 기본으로 지정해 주세요.`)
    }
  }
  const saveTemplates = (next: MailTemplate) =>
    set((s) => {
      const exists = s.templates.some((t) => t.id === next.id)
      const list = exists ? s.templates.map((t) => (t.id === next.id ? next : t)) : [...s.templates, next]
      // 기본 템플릿은 결과별 1개: 새로 지정하면 기존 기본은 해제 (F-ARC-027 1)
      return { ...s, templates: next.isDefault ? list.map((t) => (t.id !== next.id && t.result === next.result && t.isDefault ? { ...t, isDefault: false } : t)) : list }
    })

  return {
    // ── 지원폼 (API-ARC-001~003) ──
    getForm: () => respond(formView),

    saveDraft: (body) =>
      respond(() => {
        const stamp = { by: requireActor(ctx), at: isoNow(ctx) }
        const next = withFixed(body)
        checkForm(next, false)
        set((s) => ({ ...s, form: { ...s.form, draft: next, draftSaved: stamp } }))
        return formView()
      }),

    publish: (body) =>
      respond(() => {
        const stamp = { by: requireActor(ctx), at: isoNow(ctx) }
        const next = withFixed(body)
        checkForm(next, true)
        const { criteria } = state()
        if (criteria.items.length === 0) throw new AdminRepoError('CONFLICT', '평가 기준을 먼저 저장해 주세요. 평가 기준이 있어야 게시할 수 있습니다.')
        const ids = new Set(next.questions.filter((q) => !q.fixed).map((q) => q.id))
        const broken = criteria.items.find((it) => it.questionIds.some((id) => !ids.has(id)))
        if (broken) throw new AdminRepoError('CONFLICT', `평가 기준의 「${broken.name}」이 지원폼에 없는 질문을 평가합니다. 평가 기준을 먼저 고쳐 주세요.`)
        set((s) => ({ ...s, form: { draft: null, draftSaved: null, published: next, publishedStamp: stamp } }))
        return formView()
      }),

    // ── 평가 기준 (API-ARC-024 · 025 · 026) ──
    getCriteria: () => respond(() => state().criteria),

    saveCriteria: (input) =>
      respond(() => {
        const actor = requireActor(ctx)
        const at = isoNow(ctx)
        const f = state().form
        const questions = (f.draft ?? f.published)?.questions ?? FIXED_QUESTIONS
        const fields = validateCriteria(input.items, questions)
        if (Object.keys(fields).length) throw new AdminRepoError('VALIDATION', fields.total ?? '입력한 내용을 확인해 주세요.', { fields })
        const version = state().criteria.version + 1
        const criteria = {
          items: input.items.map((it, i) => ({ id: `crit-v${version}-${i + 1}`, name: it.name.trim(), points: Number(it.points), questionIds: [...it.questionIds], guide: it.guide.trim() })),
          version,
          updated: { by: actor, at },
        }
        set((s) => ({ ...s, criteria }))
        let rescoring = 0
        if (input.rescore) {
          // 이미 접수된 지원서마다 채점 작업 (F-ARC-034 2). 결과 · 잠김은 그대로 (3)
          const changes = new Map<string, { next: Applicant; logs: LogInput[] }>()
          for (const a of live()) changes.set(a.id, { next: startJob(a, actor, at), logs: [{ actor, content: `점수 다시 산정 요청 (평가 기준 v${version}, 전체)` }] })
          update(changes)
          rescoring = changes.size
          kickScoring()
        }
        return { criteria: state().criteria, rescoring }
      }),

    // ── 지원자 (API-ARC-004~011 · 027) ──
    listApplicants: (query) =>
      respond(() => {
        resume()
        const all = live()
        const counts = Object.fromEntries([['전체', all.length], ...APPLICANT_RESULTS.map((r) => [r, all.filter((a) => a.result === r).length])]) as Record<'전체' | ApplicantResult, number>
        const scoreOf = (a: Applicant) => (a.score.state === 'done' ? (a.score.total ?? 0) : -1)
        const rows = all
          .filter((a) => !query.result || a.result === query.result)
          .filter((a) => matchesQuery(query.q, [a.name, a.department, a.email]))
          // 점수 순이면 점수가 없는 지원자(분석 중 · 산정 실패)는 맨 뒤 (F-ARC-009 2)
          .sort(query.sort === 'score' ? (a, b) => scoreOf(b) - scoreOf(a) || b.appliedAt.localeCompare(a.appliedAt) : byNewest((a) => a.appliedAt))
          .map(toRow)
        const failedMailIds = all.filter((a) => currentMail(a)?.state === 'failed').map((a) => a.id)
        const b = sendingBatch()
        const sending = b ? { batchId: b.id, ...(({ processed, requested }) => ({ processed, requested }))(batchCounts(b)) } : null
        return { ...paginate(rows, { pageSize: 10, ...query }), counts, failedMailCount: failedMailIds.length, failedMailIds, sending, criteriaVersion: state().criteria.version }
      }),

    setResults: (ids, result) =>
      respond(() => {
        const actor = requireActor(ctx)
        if (!APPLICANT_RESULTS.includes(result)) throw new AdminRepoError('VALIDATION', '바꿀 결과를 골라 주세요.')
        if (ids.length === 0) throw new AdminRepoError('VALIDATION', '지원자를 골라 주세요.')
        const at = isoNow(ctx)
        const found = ids.map((id) => state().applicants.find((a) => a.id === id && !a.deleted)).filter((a): a is Applicant => !!a)
        const { apply, excluded } = planBulkResult(found, result)
        const changes = new Map<string, { next: Applicant; logs: LogInput[] }>()
        for (const a of apply) {
          const r = applyResult(a, result)
          const logs: LogInput[] = [{ actor, content: `결과 일괄 변경: ${a.result} → ${result}${r.mailCleared ? ' · 메일 상태 초기화' : ''}` }]
          if (r.interviewCleared) logs.push({ actor, content: `면접 일정 해제: ${interviewText(a.interview, userName)} → 없음 (서류 합격이 아닌 결과로 바뀜)` })
          changes.set(a.id, { next: { ...r.next, processed: { by: actor, at } }, logs })
        }
        update(changes)
        const missing = ids.filter((id) => !found.some((a) => a.id === id)).map((id) => ({ applicantId: id, name: '-', reason: '지원서를 찾을 수 없음' }))
        return { applied: apply.length, excluded: [...excluded.map((x) => ({ applicantId: x.applicant.id, name: x.applicant.name, reason: x.reason })), ...missing] }
      }),

    removeApplicants: (ids) =>
      respond(() => {
        const actor = requireActor(ctx)
        const at = isoNow(ctx)
        const changes = new Map<string, { next: Applicant; logs: LogInput[] }>()
        for (const id of ids) {
          const a = state().applicants.find((x) => x.id === id && !x.deleted)
          // 실제로 지우지 않고 삭제 상태로 (처리 이력 보존, F-ARC-011 1 · 3)
          if (a) changes.set(id, { next: { ...a, deleted: { by: actor, at } }, logs: [{ actor, content: '지원자 삭제 (목록에서 빠짐 · 처리 이력 보존)' }] })
        }
        update(changes)
        return { deleted: changes.size }
      }),

    getApplicant: (id) =>
      respond(() => {
        resume()
        return toDetail(findApplicant(id))
      }),

    setResult: (id, { stage, result, memo }) =>
      respond(() => {
        const actor = requireActor(ctx)
        const a = findApplicant(id)
        const next = resultForStage(stage, result)
        if (!next) throw new AdminRepoError('VALIDATION', '이 전형에서 고를 수 없는 결과입니다.')
        if (stage === 'interview' && !passedDocument(a.result)) throw new AdminRepoError('CONFLICT', INTERVIEW_ONLY_PASSED)
        if (a.locked[stage]) throw new AdminRepoError('LOCKED', LOCKED_MESSAGE)
        if (memo.length > 500) throw new AdminRepoError('VALIDATION', '메모는 500자 이내로 입력해 주세요.', { fields: { memo: '메모는 500자 이내로 입력해 주세요.' } })
        const block = resultChangeBlock(a, next)
        if (block === LOCKED_MESSAGE) throw new AdminRepoError('LOCKED', block)
        if (block) throw new AdminRepoError('CONFLICT', block)
        const at = isoNow(ctx)
        const r = applyResult(a, next)
        const logs: LogInput[] = [
          {
            actor,
            content: `${stage === 'document' ? '서류' : '면접'} 전형 결과: ${stageValue(stage, a.result)} → ${stageValue(stage, next)}${r.mailCleared ? ' · 메일 상태 초기화' : ''}`,
            note: memo.trim() || null,
          },
        ]
        if (r.interviewCleared) logs.push({ actor, content: `면접 일정 해제: ${interviewText(a.interview, userName)} → 없음 (서류 합격이 아닌 결과로 바뀜)` })
        updateOne({ ...r.next, processed: { by: actor, at } }, logs)
        return toDetail(findApplicant(id))
      }),

    history: (id) =>
      respond(() => {
        findApplicant(id)
        return state()
          .history.filter((h) => h.applicantId === id)
          .sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id))
      }),

    updateEmail: (id, email) =>
      respond(() => {
        const actor = requireActor(ctx)
        const a = findApplicant(id)
        const next = email.trim()
        if (!isEmail(next)) throw new AdminRepoError('VALIDATION', '이메일 형식이 올바르지 않습니다.', { fields: { email: '이메일 형식이 올바르지 않습니다. 예: name@example.com' } })
        if (next === a.email) throw new AdminRepoError('VALIDATION', '지금 주소와 같습니다.', { fields: { email: '지금 주소와 같습니다. 새 주소를 입력해 주세요.' } })
        updateOne({ ...a, email: next, answers: { ...a.answers, 'q-email': next } }, [{ actor, content: `이메일 수정: ${a.email} → ${next}` }])
        return toDetail(findApplicant(id))
      }),

    unlockResult: (id, { stage, reason }) =>
      respond(() => {
        const actor = requireActor(ctx)
        const role = actor.kind === 'admin' && (actor.role === 'Lead' || actor.role === 'Core') ? actor.role : 'Core'
        const d = canUnlockApplicantResult({ id: actor.kind === 'admin' ? actor.id : '', role })
        if (!d.allowed) throw new AdminRepoError('FORBIDDEN', d.reason)
        const a = findApplicant(id)
        if (!a.locked[stage]) throw new AdminRepoError('CONFLICT', '잠긴 단계만 해제할 수 있습니다.')
        const why = reason.trim()
        if (!why) throw new AdminRepoError('VALIDATION', '해제 사유를 입력해 주세요.', { fields: { reason: '해제 사유를 입력해 주세요.' } })
        if (why.length > 300) throw new AdminRepoError('VALIDATION', '사유는 300자 이내로 입력해 주세요.', { fields: { reason: '사유는 300자 이내로 입력해 주세요.' } })
        updateOne({ ...a, locked: { ...a.locked, [stage]: false } }, [{ actor, content: `결과 잠금 해제 (${STAGE_LABEL[stage]}) · 이미 보낸 메일은 취소되지 않음`, note: why }])
        return toDetail(findApplicant(id))
      }),

    rescore: (id) =>
      respond(() => {
        const actor = requireActor(ctx)
        const a = findApplicant(id)
        const { criteria } = state()
        if (criteria.items.length === 0) throw new AdminRepoError('CONFLICT', '평가 기준을 먼저 저장해 주세요.')
        if (a.score.state === 'waiting' || a.score.state === 'analyzing') throw new AdminRepoError('CONFLICT', '이미 점수를 산정하는 중입니다. 끝난 뒤 다시 시도해 주세요.')
        const at = isoNow(ctx)
        updateOne(startJob(a, actor, at), [{ actor, content: `점수 다시 산정 요청 (평가 기준 v${criteria.version})` }])
        kickScoring()
        return toDetail(findApplicant(id))
      }),

    // ── 면접 일정 (API-ARC-030 · 031) ──
    interviews: ({ from, to }) =>
      respond(() => {
        const interviewers = ctx.store
          .get('users')
          .users.filter((u) => u.type === 'Core' && u.status === 'active')
          .map((u) => ({ userId: u.id, name: u.name }))
        const interviews = live()
          .filter((a) => a.interview && isoToKst(a.interview.startAt).ymd >= from && isoToKst(a.interview.startAt).ymd <= to)
          .map((a) => ({
            applicantId: a.id,
            applicantName: a.name,
            startAt: a.interview!.startAt,
            endAt: new Date(Date.parse(a.interview!.startAt) + INTERVIEW_MINUTES * 60_000).toISOString(),
            interviewerIds: [...a.interview!.interviewerIds],
          }))
          .sort((x, y) => x.startAt.localeCompare(y.startAt))
        return { interviewers, interviews }
      }),

    saveInterview: (id, { startAt, interviewerIds }) =>
      respond(() => {
        const actor = requireActor(ctx)
        const a = findApplicant(id)
        if (!isOnStep(startAt)) throw new AdminRepoError('VALIDATION', '면접 시각은 10분 단위로 골라 주세요.', { fields: { startAt: '면접 시각은 10분 단위로 골라 주세요 (예: 14:00, 14:10).' } })
        if (a.result !== '서류 합격') throw new AdminRepoError('CONFLICT', '면접 일정은 전형 결과가 서류 합격일 때만 정할 수 있습니다.')
        if (a.locked.document) throw new AdminRepoError('CONFLICT', '서류 합격 메일이 발송되어 면접 일정도 잠겼습니다. 결과 잠금 해제 뒤 고칠 수 있습니다.')
        const ids = [...new Set(interviewerIds)]
        if (ids.length === 0) throw new AdminRepoError('VALIDATION', '면접 담당자를 1명 이상 골라 주세요.', { fields: { interviewerIds: '면접 담당자를 1명 이상 골라 주세요.' } })
        const cores = new Set(
          ctx.store
            .get('users')
            .users.filter((u) => u.type === 'Core' && u.status === 'active')
            .map((u) => u.id),
        )
        if (ids.some((x) => !cores.has(x)))
          throw new AdminRepoError('VALIDATION', '활성 상태의 Core만 면접 담당자로 고를 수 있습니다.', { fields: { interviewerIds: '활성 상태의 Core만 면접 담당자로 고를 수 있습니다.' } })
        // 저장할 때 겹침을 다시 확인 (두 사람이 동시에 저장하는 경우, F-ARC-039 5)
        const board = live().flatMap((x) => (x.interview ? [{ applicantId: x.id, applicantName: x.name, startAt: x.interview.startAt, endAt: '', interviewerIds: x.interview.interviewerIds }] : []))
        const clash = conflictingInterviewers(board, startAt, ids, a.id)
        if (clash.length)
          throw new AdminRepoError('CONFLICT', `${clash.map(userName).join(', ')}에게 이 시간에 다른 면접이 있어 저장하지 않았습니다. 다른 시각이나 담당자를 골라 주세요.`, {
            detail: { interviewerIds: clash },
          })
        const slot = { startAt: new Date(startAt).toISOString(), interviewerIds: ids }
        if (a.interview && a.interview.startAt === slot.startAt && a.interview.interviewerIds.join() === ids.join()) return toDetail(a)
        updateOne({ ...a, interview: slot }, [{ actor, content: `면접 일정 ${a.interview ? '변경' : '지정'}: ${interviewText(a.interview, userName)} → ${interviewText(slot, userName)}` }])
        return toDetail(findApplicant(id))
      }),

    // ── 메일 (API-ARC-012~017) ──
    mailTargets: (excludeSent) =>
      respond(() =>
        MAIL_RESULTS.map((result): MailTarget => {
          const t = targetsOf(result, excludeSent)
          return {
            result,
            count: t.list.length,
            applicantIds: t.list.map((a) => a.id),
            defaultTemplateId: state().templates.find((x) => x.result === result && x.isDefault)?.id ?? null,
            excludedNoInterview: t.noInterview,
          }
        }),
      ),

    mailPreview: (templateId, applicantId) =>
      respond(() => {
        const t = findTemplate(templateId)
        const a = applicantId ? findApplicant(applicantId) : null
        const vars = a ? applicantVariables(a) : EXAMPLE_VARIABLES
        return { subject: renderTemplate(t.subject, vars), body: renderTemplate(t.body, vars), to: a?.email ?? null }
      }),

    sendBatch: ({ targets, excludeSent }) =>
      respond(() => {
        const actor = requireActor(ctx)
        guardSending()
        const items: MailBatchItem[] = []
        for (const target of targets) {
          if (!MAIL_RESULTS.includes(target.result as MailResult)) throw new AdminRepoError('VALIDATION', '미정은 발송에서 제외합니다.')
          const result = target.result as MailResult
          const tpl = findTemplate(target.templateId)
          if (tpl.result !== result) throw new AdminRepoError('VALIDATION', `${result}에는 ${result} 템플릿만 쓸 수 있습니다.`)
          for (const a of targetsOf(result, excludeSent).list)
            items.push({ applicantId: a.id, name: a.name, email: a.email, result, stage: stageOf(result)!, templateId: tpl.id, state: 'queued', reason: null })
        }
        if (items.length === 0) throw new AdminRepoError('CONFLICT', '보낼 대상이 없습니다.')
        const batch: MailBatch = { id: newId('batch'), at: isoNow(ctx), by: actor, kind: 'batch', status: 'sending', finishedAt: null, items }
        set((s) => ({ ...s, batches: [...s.batches, batch] }))
        kickMail()
        return batch
      }),

    getBatch: (batchId) =>
      respond(() => {
        resume()
        const b = state().batches.find((x) => x.id === batchId)
        if (!b) throw new AdminRepoError('NOT_FOUND', '발송 기록을 찾을 수 없습니다.')
        return b
      }),

    resend: (body) =>
      respond(() => {
        const actor = requireActor(ctx)
        guardSending()
        const at = isoNow(ctx)
        /** 지금도 '발송 실패'인 지원자만 (같은 결과 · 같은 템플릿으로, F-ARC-012) */
        const stillFailed = (applicantId: string) => {
          const a = state().applicants.find((x) => x.id === applicantId && !x.deleted)
          const m = a ? currentMail(a) : null
          return a && m?.state === 'failed' ? { a, m } : null
        }
        if ('batchId' in body && body.batchId) {
          const b = state().batches.find((x) => x.id === body.batchId)
          if (!b) throw new AdminRepoError('NOT_FOUND', '발송 기록을 찾을 수 없습니다.')
          const wanted = 'applicantIds' in body ? new Set(body.applicantIds) : null
          const requeue = new Set(b.items.filter((i) => i.state === 'failed' && (!wanted || wanted.has(i.applicantId)) && stillFailed(i.applicantId)).map((i) => i.applicantId))
          if (requeue.size === 0) throw new AdminRepoError('CONFLICT', '다시 보낼 실패 건이 없습니다. 결과가 바뀌었거나 이미 보냈을 수 있습니다.')
          // 같은 발송 기록의 실패 건을 다시 처리해 결과를 갱신한다 (F-ARC-022 · 023)
          set((s) => ({
            ...s,
            batches: s.batches.map((x) =>
              x.id === b.id ? { ...x, status: 'sending', finishedAt: null, items: x.items.map((i) => (requeue.has(i.applicantId) ? { ...i, state: 'queued', reason: null } : i)) } : x,
            ),
          }))
          kickMail()
          return state().batches.find((x) => x.id === b.id)!
        }
        const ids = 'applicantIds' in body ? body.applicantIds : []
        const items = ids.flatMap((id): MailBatchItem[] => {
          const f = stillFailed(id)
          return f ? [{ applicantId: f.a.id, name: f.a.name, email: f.a.email, result: f.m.result, stage: stageOf(f.m.result)!, templateId: f.m.templateId, state: 'queued', reason: null }] : []
        })
        if (items.length === 0) throw new AdminRepoError('CONFLICT', '다시 보낼 실패 건이 없습니다. 결과가 바뀌었거나 이미 보냈을 수 있습니다.')
        const batch: MailBatch = { id: newId('batch'), at, by: actor, kind: 'resend', status: 'sending', finishedAt: null, items }
        set((s) => ({ ...s, batches: [...s.batches, batch] }))
        kickMail()
        return batch
      }),

    // ── 템플릿 (API-ARC-019~023) ──
    listTemplates: () => respond(() => state().templates),
    getTemplate: (id) => respond(() => findTemplate(id)),

    createTemplate: (input) =>
      respond(() => {
        const actor = requireActor(ctx)
        checkTemplate(input, null)
        const t: MailTemplate = {
          id: newId('tpl'),
          name: input.name.trim(),
          result: input.result,
          isDefault: input.isDefault,
          subject: input.subject.trim(),
          body: input.body,
          updated: { by: actor, at: isoNow(ctx) },
        }
        saveTemplates(t)
        return findTemplate(t.id)
      }),

    saveTemplate: (id, input) =>
      respond(() => {
        const actor = requireActor(ctx)
        const current = findTemplate(id)
        checkTemplate(input, current)
        saveTemplates({
          ...current,
          name: input.name.trim(),
          result: input.result,
          isDefault: input.isDefault,
          subject: input.subject.trim(),
          body: input.body,
          updated: { by: actor, at: isoNow(ctx) },
        })
        return findTemplate(id)
      }),

    sendTestMail: (id) =>
      respond(() => {
        const actor = requireActor(ctx)
        const t = findTemplate(id)
        // 받는 사람: 로그인한 운영진 계정의 이메일 (사용자 관리에 등록된 이메일, F-ARC-030 1). 지원자 메일 상태 · 이력에는 영향 없음 (3)
        const me = actor.kind === 'admin' ? ctx.store.get('users').users.find((u) => u.id === actor.id) : undefined
        if (!me?.email) throw new AdminRepoError('CONFLICT', '로그인한 계정에 등록된 이메일이 없습니다. 사용자 관리에서 이메일을 넣어 주세요.')
        return { to: me.email, subject: renderTemplate(t.subject, EXAMPLE_VARIABLES) }
      }),

    // ── 최종 합격자 사용자 등록 (API-ARC-028 · 029) ──
    finalPassed: () =>
      respond(() => {
        const taken = new Set(ctx.store.get('users').users.map((u) => u.studentId))
        return live()
          .filter((a) => a.result === '최종 합격')
          .sort((a, b) => a.no - b.no)
          .map((a) => ({ applicantId: a.id, name: a.name, maskedStudentId: maskStudentId(a.studentId), department: a.department, email: a.email, registrable: !taken.has(a.studentId) }))
      }),

    registerFinalPassed: ({ applicantIds, generation }) =>
      respond(() => {
        const actor = requireActor(ctx)
        if (!Number.isInteger(generation) || generation < 1 || generation > 99)
          throw new AdminRepoError('VALIDATION', '등록 기수를 입력해 주세요.', { fields: { generation: '등록 기수를 1~99 사이 숫자로 입력해 주세요.' } })
        if (applicantIds.length === 0) throw new AdminRepoError('VALIDATION', '등록할 최종 합격자가 없습니다.')
        const failed: { applicantId: string; name: string; reason: string }[] = []
        const people = applicantIds.flatMap((id) => {
          const a = state().applicants.find((x) => x.id === id && !x.deleted)
          if (!a || a.result !== '최종 합격') {
            failed.push({ applicantId: id, name: a?.name ?? '-', reason: '최종 합격자가 아닙니다.' })
            return []
          }
          return [{ key: a.id, name: a.name, studentId: a.studentId, email: a.email, department: a.department }]
        })
        // General · PIN 대기 · PIN 설정 메일 · 같은 학번 제외 · 사용자 변경 이력은 사용자 구역 함수가 한 번에 (F-ARC-037 · 038)
        const r = bulkRegisterUsers(ctx.store, { people, generation, actor, now: ctx.now() })
        const nameOf = (id: string) => state().applicants.find((a) => a.id === id)?.name ?? '-'
        const changes = new Map<string, { next: Applicant; logs: LogInput[] }>()
        for (const x of r.registered) {
          const a = state().applicants.find((y) => y.id === x.key)!
          changes.set(a.id, { next: a, logs: [{ actor, content: `사용자 등록 (General · ${generation}기) · PIN 설정 링크 ${x.mail === 'sent' ? '발송 완료' : '발송 실패'}` }] })
        }
        for (const x of r.skipped) {
          const a = state().applicants.find((y) => y.id === x.key)!
          changes.set(a.id, { next: a, logs: [{ actor, content: '사용자 등록 제외 · 같은 학번의 사용자가 이미 있음' }] })
        }
        update(changes)
        return {
          registered: r.registered.map((x) => ({ applicantId: x.key, name: nameOf(x.key), mail: x.mail })),
          skipped: r.skipped.map((x) => ({ applicantId: x.key, name: nameOf(x.key), reason: '같은 학번의 사용자가 이미 있어 제외했습니다.' })),
          failed: [...failed, ...r.failed.map((x) => ({ applicantId: x.key, name: nameOf(x.key), reason: x.reason }))],
        }
      }),
  }
}
