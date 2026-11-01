import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createSessionStore } from '../auth/session'
import type { AdminRepoError } from '../common/errors'
import { setMockOptions } from '../common/mockContext'
import { createMockAdminRepositories } from '../repositories'
import { createAdminStore, memoryStorage } from '../store'
import { RECRUIT_SIM } from './mockRepository'
import {
  applicantVariables,
  applyResult,
  busyAt,
  conflictingInterviewers,
  criteriaTotal,
  currentLocked,
  currentMail,
  EXAMPLE_VARIABLES,
  formLockViolation,
  insertAt,
  isOnStep,
  kstToIso,
  LOCKED_MESSAGE,
  planBulkResult,
  renderTemplate,
  resultChangeBlock,
  simulateScoreItems,
  sumScore,
  timeSlots,
  unsupportedVariables,
  validateCriteria,
  validateForm,
} from './rules'
import { createRecruitSeed, FIXED_QUESTIONS } from './seed'
import type { Applicant, CriteriaItem, RecruitFormBody } from './types'

const NOW = Date.parse('2026-11-01T03:00:00Z')
beforeAll(() => setMockOptions({ latency: [0, 0], failureRate: 0 }))
afterEach(() => vi.useRealTimers())

async function signedIn(loginId: 'lead-a' | 'core-b' = 'lead-a') {
  const storage = memoryStorage()
  const store = createAdminStore({ storage, now: () => NOW })
  const repos = createMockAdminRepositories({ store, session: createSessionStore(storage), now: () => NOW })
  await repos.auth.login({ loginId, password: 'example1234' })
  const applicant = (id: string) => store.get('recruit').applicants.find((a) => a.id === id)!
  const historyOf = (id: string) => store.get('recruit').history.filter((h) => h.applicantId === id)
  return { store, repos, recruit: repos.recruit, applicant, historyOf }
}
const rejects = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error('실패해야 합니다')
    },
    (e: AdminRepoError) => e,
  )

const seed = createRecruitSeed({ now: NOW })
const byNo = (n: number) => seed.applicants[n - 1]

describe('모집 예시 데이터 (seed)', () => {
  it('지원자 25명: 이름 · 학번 · 이메일이 누가 봐도 예시, 답변에 (예시 답변)', () => {
    expect(seed.applicants).toHaveLength(25)
    for (const a of seed.applicants) {
      expect(a.name).toMatch(/^예시 지원자 \d{2}$/)
      expect(a.email).toMatch(/@example\.com$/)
      expect(a.studentId).toMatch(/^\d{10}$/)
      expect(a.answers['q-motivation']).toContain('(예시 답변)')
    }
    expect(createRecruitSeed({ now: NOW })).toEqual(seed)
  })

  it('게시본 · 평가 기준(합계 100) · 결과별 인원 · 채점 상태가 서로 맞다', () => {
    expect(seed.form.published?.generation).toBe(5)
    expect(seed.form.published!.endDate! < seed.form.published!.startDate!).toBe(false)
    expect(criteriaTotal(seed.criteria.items)).toBe(100)
    const count = (r: string) => seed.applicants.filter((a) => a.result === r).length
    expect([count('미정'), count('서류 합격'), count('서류 불합격'), count('면접 불합격'), count('최종 합격')]).toEqual([7, 6, 5, 2, 5])
    const states = seed.applicants.map((a) => a.score.state)
    expect(states.filter((s) => s === 'analyzing')).toHaveLength(2)
    expect(states.filter((s) => s === 'waiting')).toHaveLength(1)
    expect(states.filter((s) => s === 'failed')).toHaveLength(2)
    for (const a of seed.applicants.filter((x) => x.score.state === 'done')) {
      expect(a.score.total).toBe(sumScore(a.score.items))
      expect(a.score.model && a.score.promptVersion && a.score.scoredAt && a.score.criteriaVersion).toBeTruthy()
    }
    // 서류 합격 메일을 받은 사람은 면접 일정이 있다 (F-ARC-018 5)
    for (const a of seed.applicants) if (a.mail.document?.result === '서류 합격') expect(a.interview, a.id).not.toBeNull()
  })

  it('프롬프트 인젝션 예: 근거에 지시문 무시가 표시된다', () => {
    const items = byNo(13).score.items
    expect(items.some((i) => i.instructionIgnored && i.reason.includes('따르지 않'))).toBe(true)
    expect(seed.applicants.filter((a) => a.score.items.some((i) => i.instructionIgnored))).toHaveLength(1)
  })

  it('메일 실패 2건 (주소 오류 · 일시 오류), 실패는 잠기지 않는다', () => {
    const failed = seed.applicants.filter((a) => currentMail(a)?.state === 'failed')
    expect(failed.map((a) => a.email).sort()).toEqual(['bounce07@example.com', 'busy10@example.com'])
    for (const a of failed) expect(currentLocked(a)).toBe(false)
    expect(currentLocked(byNo(1))).toBe(true)
  })

  it('담당자 면접 시간이 겹치지 않는다', () => {
    const board = seed.applicants.flatMap((a) =>
      a.interview ? [{ applicantId: a.id, applicantName: a.name, startAt: a.interview.startAt, endAt: '', interviewerIds: a.interview.interviewerIds }] : [],
    )
    for (const i of board) expect(conflictingInterviewers(board, i.startAt, i.interviewerIds, i.applicantId), i.applicantId).toEqual([])
  })
})

describe('평가 기준 (F-ARC-031~034)', () => {
  const questions = seed.form.published!.questions
  const item = <P extends number | string>(points: P, extra: Partial<{ name: string; guide: string; questionIds: string[] }> = {}) => ({
    name: '지원 동기',
    points,
    questionIds: ['q-motivation'],
    guide: '높은 점수 / 낮은 점수',
    ...extra,
  })

  it('배점 합계가 100점일 때만 저장 가능, 항목명 · 가이드 필수, 고정 질문은 평가할 수 없다', () => {
    expect(validateCriteria([item(60), item(40)], questions)).toEqual({})
    expect(validateCriteria([item(60), item(30)], questions).total).toBe('배점 합계가 100점이어야 저장할 수 있습니다 (지금 90점).')
    expect(validateCriteria([], questions).items).toBeTruthy()
    const bad = validateCriteria([item(50, { name: ' ', guide: '' }), item('5.5', { questionIds: ['q-name'] })], questions)
    expect(Object.keys(bad).sort()).toEqual(['items.0.guide', 'items.0.name', 'items.1.points', 'items.1.questionIds', 'total'])
    expect(criteriaTotal([item('30'), item('abc'), item(20)])).toBe(50)
  })

  it('저장하면 버전이 오르고, 다시 산정을 고르면 전체 재산정 (결과 · 잠김은 그대로, 이력에 이전 → 새 점수)', async () => {
    vi.useFakeTimers()
    const { recruit, applicant, historyOf } = await signedIn()
    expect((await rejects(recruit.saveCriteria({ items: [item(60), item(30)], rescore: false }))).code).toBe('VALIDATION')
    const before = applicant('ap-01')
    const r = await recruit.saveCriteria({ items: [item(60), item(40, { name: '협업 경험', questionIds: ['q-experience'] })], rescore: true })
    expect(r.criteria.version).toBe(3)
    expect(r.rescoring).toBe(25)
    expect(applicant('ap-01').score.state).toBe('waiting')
    await vi.advanceTimersByTimeAsync(RECRUIT_SIM.scoreTick * 12)
    const after = applicant('ap-01')
    expect(after.score.state).toBe('done')
    expect(after.score.criteriaVersion).toBe(3)
    expect(after.result).toBe(before.result)
    expect(after.locked).toEqual(before.locked)
    expect(historyOf('ap-01').at(-1)!.content).toBe(`점수 재산정 (${before.score.total}점 → ${after.score.total}점) · 평가 기준 v3`)
    // 멈춰 있던 예시(분석 중 · 산정 실패)도 새 기준으로 끝난다
    expect(applicant('ap-06').score.state).toBe('done')
    expect(historyOf('ap-06').at(-1)!.content).toMatch(/^점수 재산정 \(산정 실패 → \d+점\)/)
  })

  it('다시 산정하지 않으면 기존 점수 유지 · 개별 재산정은 같은 응답이면 같은 점수 (temperature 0)', async () => {
    vi.useFakeTimers()
    const { recruit, applicant } = await signedIn()
    const before = applicant('ap-02').score
    await recruit.saveCriteria({ items: [item(100)], rescore: false })
    expect(applicant('ap-02').score).toEqual(before)
    await recruit.rescore('ap-02')
    expect((await rejects(recruit.rescore('ap-02'))).code).toBe('CONFLICT')
    await vi.advanceTimersByTimeAsync(RECRUIT_SIM.scoreTick * 3)
    const s = applicant('ap-02').score
    expect(s.criteriaVersion).toBe(3)
    expect(s.items).toEqual(simulateScoreItems(applicant('ap-02').answers, [{ id: s.items[0].itemId, name: '지원 동기', points: 100, questionIds: ['q-motivation'], guide: 'x' }]))
  })

  it('예시 채점은 이름 · 학번 · 학과 · 이메일을 보지 않는다', () => {
    const crit: CriteriaItem[] = [{ id: 'c', name: '동기', points: 50, questionIds: ['q-motivation'], guide: 'g' }]
    const a = byNo(3).answers
    expect(simulateScoreItems({ ...a, 'q-name': '다른 이름', 'q-email': 'x@example.com' }, crit)).toEqual(simulateScoreItems(a, crit))
  })
})

describe('전형 결과 · 잠금 (F-ARC-010 · 014 · 017)', () => {
  it('면접 불합격 · 최종 합격은 서류 합격자에게만, 잠긴 결과는 제외', () => {
    const plan = planBulkResult([byNo(17), byNo(18), byNo(2), byNo(8)], '최종 합격')
    expect(plan.apply.map((a) => a.id)).toEqual(['ap-17'])
    expect(plan.excluded.map((x) => x.reason)).toEqual(['서류 합격자가 아님', '서류 합격자가 아님', '서류 합격자가 아님'])
    // 서류 합격 메일을 받아 서류 단계가 잠겨도 면접 결과는 고를 수 있다 (F-ARC-014 4)
    expect(resultChangeBlock(byNo(4), '최종 합격')).toBeNull()
    expect(resultChangeBlock(byNo(4), '서류 불합격')).toBe(LOCKED_MESSAGE)
    expect(planBulkResult([byNo(2)], '미정').excluded[0].reason).toBe('결과 잠김 (메일 발송 완료)')
  })

  it('잠기기 전에 결과를 바꾸면 메일 상태 초기화, 서류 합격이 아니게 되면 면접 일정 해제', () => {
    const a7 = byNo(7)
    const r = applyResult(a7, '서류 불합격')
    expect(r.mailCleared).toBe(true)
    expect(currentMail(r.next)).toBeNull()
    expect(r.interviewCleared).toBe(true)
    expect(r.next.interview).toBeNull()
    // 서류 합격 → 최종 합격: 서류 메일 기록 · 면접 일정은 남는다
    const r4 = applyResult(byNo(4), '최종 합격')
    expect(r4.next.mail.document?.state).toBe('sent')
    expect(r4.next.interview).not.toBeNull()
  })

  it('일괄 변경: 적용 인원 · 제외 사유, 처리자 · 이력', async () => {
    const { recruit, applicant, historyOf } = await signedIn('core-b')
    const r = await recruit.setResults(['ap-17', 'ap-18', 'ap-02'], '최종 합격')
    expect(r.applied).toBe(1)
    expect(r.excluded.map((x) => [x.name, x.reason])).toEqual([
      ['예시 지원자 18', '서류 합격자가 아님'],
      ['예시 지원자 02', '서류 합격자가 아님'],
    ])
    expect(applicant('ap-17').result).toBe('최종 합격')
    expect(applicant('ap-17').processed?.by).toMatchObject({ name: '운영진B', role: 'Core' })
    expect(historyOf('ap-17').at(-1)!.content).toBe('결과 일괄 변경: 서류 합격 → 최종 합격')
  })

  it('단계별 처리: 잠긴 단계는 423, 면접은 서류 합격자만, 메모는 이력에', async () => {
    const { recruit, historyOf } = await signedIn()
    expect((await rejects(recruit.setResult('ap-02', { stage: 'document', result: '서류 합격', memo: '' }))).code).toBe('LOCKED')
    expect((await rejects(recruit.setResult('ap-18', { stage: 'interview', result: '최종 합격', memo: '' }))).code).toBe('CONFLICT')
    const d = await recruit.setResult('ap-18', { stage: 'document', result: '서류 합격', memo: '예시 메모' })
    expect(d.result).toBe('서류 합격')
    expect(historyOf('ap-18').at(-1)).toMatchObject({ content: '서류 전형 결과: 미정 → 서류 합격', note: '예시 메모' })
    const back = await recruit.setResult('ap-04', { stage: 'interview', result: '최종 합격', memo: '' })
    expect(back.result).toBe('최종 합격')
    expect((await recruit.setResult('ap-04', { stage: 'interview', result: '미정', memo: '' })).result).toBe('서류 합격')
  })

  it('잠금 해제는 Lead 만 · 잠긴 단계만 · 사유 필수, 이력에 사유', async () => {
    const core = await signedIn('core-b')
    expect((await rejects(core.recruit.unlockResult('ap-02', { stage: 'document', reason: '예시 사유' }))).code).toBe('FORBIDDEN')
    const { recruit, applicant, historyOf } = await signedIn()
    expect((await rejects(recruit.unlockResult('ap-02', { stage: 'interview', reason: '예시 사유' }))).code).toBe('CONFLICT')
    expect((await rejects(recruit.unlockResult('ap-02', { stage: 'document', reason: '  ' }))).code).toBe('VALIDATION')
    await recruit.unlockResult('ap-02', { stage: 'document', reason: '예시 사유: 결과를 잘못 골랐음' })
    expect(applicant('ap-02').locked.document).toBe(false)
    expect(historyOf('ap-02').at(-1)).toMatchObject({ content: '결과 잠금 해제 (서류 전형) · 이미 보낸 메일은 취소되지 않음', note: '예시 사유: 결과를 잘못 골랐음' })
    await recruit.setResult('ap-02', { stage: 'document', result: '서류 합격', memo: '' })
    expect(currentMail(applicant('ap-02'))).toBeNull()
  })

  it('삭제는 삭제 상태로 (이력 보존), 목록에서 빠진다', async () => {
    const { recruit, applicant, historyOf } = await signedIn()
    expect(await recruit.removeApplicants(['ap-25', 'ap-99'])).toEqual({ deleted: 1 })
    expect(applicant('ap-25').deleted?.by).toMatchObject({ name: '운영진A' })
    expect(historyOf('ap-25').length).toBeGreaterThan(1)
    const list = await recruit.listApplicants({})
    expect(list.total).toBe(24)
    expect((await rejects(recruit.getApplicant('ap-25'))).code).toBe('NOT_FOUND')
  })
})

describe('지원자 목록 (F-ARC-006~009)', () => {
  it('지원일 최신순 10명, 결과 탭 인원, 탭 안에서 검색, 점수순이면 분석 중은 맨 뒤', async () => {
    const { recruit } = await signedIn()
    const first = await recruit.listApplicants({})
    expect(first.items).toHaveLength(10)
    expect(first.items[0].name).toBe('예시 지원자 25')
    expect(first.counts).toMatchObject({ 전체: 25, 미정: 7, '최종 합격': 5 })
    expect(first.failedMailCount).toBe(2)
    expect(first.items[0].maskedStudentId).toMatch(/^\d{4}\*{4}\d{2}$/)
    expect('answers' in first.items[0]).toBe(false)
    const found = await recruit.listApplicants({ result: '서류 합격', q: 'bounce' })
    expect(found.items.map((a) => a.name)).toEqual(['예시 지원자 07'])
    expect((await recruit.listApplicants({ result: '최종 합격', q: 'bounce' })).total).toBe(0)
    const byScore = await recruit.listApplicants({ sort: 'score', pageSize: 25 })
    const totals = byScore.items.map((a) => (a.score.state === 'done' ? a.score.total : null))
    const firstNull = totals.indexOf(null)
    expect(totals.slice(firstNull).every((t) => t === null)).toBe(true)
    const done = totals.slice(0, firstNull) as number[]
    expect([...done].sort((a, b) => b - a)).toEqual(done)
  })
})

describe('메일 (F-ARC-012 · 018~023 · 028)', () => {
  it('변수 치환 · 지원하지 않는 변수 · 커서 위치 넣기', () => {
    const a = { ...byNo(11) }
    const vars = applicantVariables(a)
    expect(renderTemplate('{{이름}}님 {{기수}} {{ 학과 }} / {{학번}}', vars)).toBe(`예시 지원자 11님 5기 ${a.department} / {{학번}}`)
    expect(vars.면접일시).toMatch(/^\d{4}\.\d{2}\.\d{2} \([일월화수목금토]\) \d{2}:\d{2}$/)
    expect(applicantVariables({ ...a, interview: null }).면접일시).toBe('면접 일정 미정')
    expect(renderTemplate('{{면접일시}}', EXAMPLE_VARIABLES)).toBe('2026.10.23 (금) 14:00')
    expect(unsupportedVariables('{{이름}} {{학번}} {{학번}} {{ 주소 }}')).toEqual(['{{학번}}', '{{ 주소 }}'])
    expect(insertAt('안녕하세요 님', '{{이름}}', 6)).toEqual({ text: '안녕하세요 {{이름}}님', caret: 12 })
  })

  it('발송 대상: 미정 제외, 이미 발송 완료 제외(기본), 실패 건 포함, 면접 일정 미지정 서류 합격 제외', async () => {
    const { recruit } = await signedIn()
    const t = await recruit.mailTargets(true)
    expect(t.map((x) => x.result)).toEqual(['서류 합격', '서류 불합격', '면접 불합격', '최종 합격'])
    const doc = t[0]
    expect(doc.applicantIds).toEqual(['ap-07', 'ap-15'])
    expect(doc.excludedNoInterview).toBe(2)
    expect(doc.defaultTemplateId).toBe('tpl-doc-pass')
    expect(t[1].applicantIds).toEqual(['ap-10', 'ap-13'])
    expect(t[3].count).toBe(3)
    expect((await recruit.mailTargets(false))[0].count).toBe(4)
  })

  it('일괄 발송: 팝업과 상관없이 끝까지, 성공은 잠김 · 실패는 사유, 같은 발송 기록에서 실패 건 재발송', async () => {
    vi.useFakeTimers()
    const { recruit, applicant, historyOf } = await signedIn()
    const batch = await recruit.sendBatch({
      targets: [
        { result: '서류 합격', templateId: 'tpl-doc-pass' },
        { result: '서류 불합격', templateId: 'tpl-doc-fail' },
      ],
      excludeSent: true,
    })
    expect(batch.status).toBe('sending')
    expect((await rejects(recruit.sendBatch({ targets: [{ result: '최종 합격', templateId: 'tpl-final-pass' }], excludeSent: true }))).code).toBe('CONFLICT')
    expect((await recruit.listApplicants({})).sending).toMatchObject({ batchId: batch.id, requested: 4 })
    await vi.advanceTimersByTimeAsync(RECRUIT_SIM.mailTick * 3)
    const done = await recruit.getBatch(batch.id)
    expect(done.status).toBe('done')
    expect(done.items.map((i) => [i.applicantId, i.state])).toEqual([
      ['ap-07', 'failed'],
      ['ap-15', 'sent'],
      ['ap-10', 'sent'],
      ['ap-13', 'sent'],
    ])
    expect(applicant('ap-15').locked.document).toBe(true)
    expect(applicant('ap-07').locked.document).toBe(false)
    expect(applicant('ap-10').mail.document?.attempts).toBe(2)
    expect(historyOf('ap-10').at(-1)!.content).toBe('서류 불합격 메일 재발송 완료 · 템플릿 「서류 불합격 안내」')
    expect(applicant('ap-15').mail.document?.subject).toBe('[예시] GDGoC DGU 5기 서류 전형 결과 안내')
    // 주소를 고친 뒤 같은 기록에서 실패 건 재발송 → 결과 갱신
    await recruit.updateEmail('ap-07', 'applicant07@example.com')
    const again = await recruit.resend({ batchId: batch.id, failedOnly: true })
    expect(again.items.find((i) => i.applicantId === 'ap-07')?.state).toBe('queued')
    await vi.advanceTimersByTimeAsync(RECRUIT_SIM.mailTick * 2)
    const final = await recruit.getBatch(batch.id)
    expect(final.items.every((i) => i.state === 'sent')).toBe(true)
    expect(applicant('ap-07').locked.document).toBe(true)
    expect(historyOf('ap-07').some((h) => h.content === '이메일 수정: bounce07@example.com → applicant07@example.com')).toBe(true)
  })

  it('실패 건 재발송 (목록): 지금도 발송 실패인 지원자만 새 발송 기록으로', async () => {
    vi.useFakeTimers()
    const { recruit } = await signedIn()
    const b = await recruit.resend({ applicantIds: ['ap-07', 'ap-10', 'ap-01'] })
    expect(b.kind).toBe('resend')
    expect(b.items.map((i) => [i.applicantId, i.templateId])).toEqual([
      ['ap-07', 'tpl-doc-pass'],
      ['ap-10', 'tpl-doc-fail'],
    ])
    await vi.advanceTimersByTimeAsync(RECRUIT_SIM.mailTick * 2)
    const r = await recruit.getBatch(b.id)
    expect(r.items.map((i) => i.state)).toEqual(['failed', 'sent'])
    expect(r.items[0].reason).toContain('주소 오류')
    expect((await recruit.listApplicants({})).failedMailCount).toBe(1)
  })

  it('템플릿: 기본은 결과별 1개, 지원하지 않는 변수는 저장하지 않는다, 테스트 메일은 로그인한 운영진 주소로', async () => {
    const { recruit, store } = await signedIn()
    const input = { name: '예시 템플릿', result: '서류 합격' as const, subject: '{{기수}} 안내', body: '{{이름}}님 {{학번}}', isDefault: true }
    const e = await rejects(recruit.createTemplate(input))
    expect(e.fields?.body).toBe('지원하지 않는 변수가 있습니다: {{학번}}')
    const t = await recruit.createTemplate({ ...input, body: '{{이름}}님, 예시 본문' })
    const defaults = store.get('recruit').templates.filter((x) => x.result === '서류 합격' && x.isDefault)
    expect(defaults.map((x) => x.id)).toEqual([t.id])
    expect((await rejects(recruit.saveTemplate(t.id, { ...input, body: 'x', isDefault: false }))).code).toBe('CONFLICT')
    expect(await recruit.sendTestMail(t.id)).toEqual({ to: 'admin-a@example.com', subject: '5기 안내' })
    expect(store.get('recruit').history.length).toBe(createRecruitSeed({ now: NOW }).history.length)
  })
})

describe('면접 일정 (F-ARC-039)', () => {
  it('10분 단위 · 30분 겹침 · 자기 면접은 빼고 본다', () => {
    expect(timeSlots()[0]).toBe('09:00')
    expect(timeSlots().at(-1)).toBe('21:30')
    expect(isOnStep(kstToIso('2026-11-03', '14:10'))).toBe(true)
    expect(isOnStep('2026-11-03T05:05:00.000Z')).toBe(false)
    const board = [{ applicantId: 'x', applicantName: 'x', startAt: kstToIso('2026-11-03', '14:00'), endAt: '', interviewerIds: ['b'] }]
    expect([...busyAt(board, kstToIso('2026-11-03', '14:20'), 'y')]).toEqual(['b'])
    expect([...busyAt(board, kstToIso('2026-11-03', '14:30'), 'y')]).toEqual([])
    expect([...busyAt(board, kstToIso('2026-11-03', '13:40'), 'y')]).toEqual(['b'])
    expect([...busyAt(board, kstToIso('2026-11-03', '13:30'), 'y')]).toEqual([])
    expect([...busyAt(board, kstToIso('2026-11-03', '14:00'), 'x')]).toEqual([])
    expect(conflictingInterviewers(board, kstToIso('2026-11-03', '13:50'), ['b', 'c'], 'y')).toEqual(['b'])
  })

  it('저장: 서류 합격 · 서류 단계 안 잠김일 때만, 겹치면 409 (겹치는 담당자), 이력에 이전 → 새', async () => {
    const { recruit, historyOf, applicant } = await signedIn()
    const busy = applicant('ap-04').interview!.startAt
    const e = await rejects(recruit.saveInterview('ap-17', { startAt: new Date(Date.parse(busy) + 10 * 60_000).toISOString(), interviewerIds: ['user-admin-b'] }))
    expect(e.code).toBe('CONFLICT')
    expect(e.detail).toEqual({ interviewerIds: ['user-admin-b'] })
    expect((await rejects(recruit.saveInterview('ap-17', { startAt: '2026-11-03T05:05:00.000Z', interviewerIds: ['user-admin-b'] }))).code).toBe('VALIDATION')
    expect((await rejects(recruit.saveInterview('ap-17', { startAt: busy, interviewerIds: ['user-admin-a'] }))).code).toBe('VALIDATION')
    expect((await rejects(recruit.saveInterview('ap-04', { startAt: busy, interviewerIds: ['user-admin-c'] }))).message).toContain('잠겼습니다')
    expect((await rejects(recruit.saveInterview('ap-18', { startAt: busy, interviewerIds: ['user-admin-c'] }))).code).toBe('CONFLICT')
    const saved = await recruit.saveInterview('ap-17', { startAt: busy, interviewerIds: ['user-admin-c'] })
    expect(saved.interview?.interviewerIds).toEqual(['user-admin-c'])
    expect(historyOf('ap-17').at(-1)!.content).toMatch(/^면접 일정 지정: 없음 → .+ · 운영진C$/)
    const board = await recruit.interviews({ from: '2000-01-01', to: '2100-01-01' })
    expect(board.interviewers.map((i) => i.name)).toEqual(['운영진B', '운영진C'])
    expect(board.interviews.find((i) => i.applicantId === 'ap-17')?.endAt).toBe(new Date(Date.parse(busy) + 30 * 60_000).toISOString())
  })
})

describe('최종 합격자 사용자 등록 (F-ARC-036~038)', () => {
  it('같은 학번의 사용자가 있으면 이미 등록됨 · 제외, 나머지는 General · PIN 대기 · 이력', async () => {
    const { recruit, store, historyOf } = await signedIn()
    const rows = await recruit.finalPassed()
    expect(rows.map((r) => [r.name, r.registrable])).toEqual([
      ['예시 지원자 01', true],
      ['예시 지원자 03', true],
      ['예시 지원자 09', false],
      ['예시 지원자 14', true],
      ['예시 지원자 19', true],
    ])
    expect(rows[0].maskedStudentId).toBe('2026****01')
    expect((await rejects(recruit.registerFinalPassed({ applicantIds: ['ap-01'], generation: 0 }))).code).toBe('VALIDATION')
    const r = await recruit.registerFinalPassed({ applicantIds: rows.map((x) => x.applicantId), generation: 5 })
    expect(r.registered).toHaveLength(4)
    expect(r.skipped).toEqual([{ applicantId: 'ap-09', name: '예시 지원자 09', reason: '같은 학번의 사용자가 이미 있어 제외했습니다.' }])
    const u = store.get('users').users.find((x) => x.studentId === '2026100001')!
    expect(u).toMatchObject({ name: '예시 지원자 01', type: 'General', generation: 5, pinStatus: 'pending', department: '컴퓨터공학전공' })
    expect(store.get('users').history.at(-1)!.action).toBe('bulk-register')
    expect(historyOf('ap-01').at(-1)!.content).toBe('사용자 등록 (General · 5기) · PIN 설정 링크 발송 완료')
    expect((await recruit.finalPassed()).every((x) => !x.registrable)).toBe(true)
  })
})

describe('지원폼 (F-ARC-001~005)', () => {
  const pub = seed.form.published!
  const locked = pub.questions.filter((q) => !q.fixed).map((q) => q.id)
  const edit = (fn: (b: RecruitFormBody) => RecruitFormBody) => fn(structuredClone(pub))

  it('게시: 기수 · 지원 기간 필수, 종료일은 시작일 뒤, 객관식 선택지 2개 이상', () => {
    const empty = {
      generation: 5,
      startDate: null,
      endDate: null,
      questions: [...FIXED_QUESTIONS, { id: 'n', title: '', type: 'choice' as const, required: false, options: ['하나', ''], fixed: false }],
    }
    expect(Object.keys(validateForm(empty, { publish: true })).sort()).toEqual(['endDate', 'q.n.options', 'q.n.title', 'startDate'])
    expect(validateForm(empty, { publish: false })).toEqual({})
    expect(validateForm({ ...pub, startDate: '2026-11-10', endDate: '2026-11-01' }, { publish: true }).endDate).toBe('종료일은 시작일과 같거나 뒤여야 합니다.')
  })

  it('접수 뒤 수정 제한 (임시 규칙): 문구 · 순서 · 지원 기간 · 선택 질문 추가는 되고, 삭제 · 유형 · 필수 · 선택지 · 기수 · 필수 새 질문은 막는다', () => {
    const ok = edit((b) => ({
      ...b,
      endDate: '2026-12-31',
      questions: [
        ...b.questions.slice(0, 4),
        ...b.questions
          .slice(4)
          .reverse()
          .map((q) => ({ ...q, title: `${q.title} (고침)` })),
        { id: 'new', title: '새 질문', type: 'short', required: false, options: [], fixed: false },
      ],
    }))
    expect(formLockViolation(ok, pub, locked)).toBeNull()
    expect(
      formLockViolation(
        edit((b) => ({ ...b, questions: b.questions.filter((q) => q.id !== 'q-link') })),
        pub,
        locked,
      ),
    ).toContain('삭제할 수 없습니다')
    expect(
      formLockViolation(
        edit((b) => ({ ...b, questions: b.questions.map((q) => (q.id === 'q-plan' ? { ...q, type: 'short' } : q)) })),
        pub,
        locked,
      ),
    ).toContain('유형')
    expect(
      formLockViolation(
        edit((b) => ({ ...b, questions: b.questions.map((q) => (q.id === 'q-track' ? { ...q, options: [...q.options, '기타'] } : q)) })),
        pub,
        locked,
      ),
    ).toContain('선택지')
    expect(
      formLockViolation(
        edit((b) => ({ ...b, generation: 6 })),
        pub,
        locked,
      ),
    ).toContain('기수')
    expect(
      formLockViolation(
        edit((b) => ({ ...b, questions: [...b.questions, { id: 'new', title: '새 질문', type: 'short', required: true, options: [], fixed: false }] })),
        pub,
        locked,
      ),
    ).toContain("'선택' 항목")
    expect(
      formLockViolation(
        edit((b) => ({ ...b, generation: 6 })),
        pub,
        [],
      ),
    ).toBeNull()
  })

  it('예시 저장소: 처음엔 고정 질문만, 평가 기준이 있어야 게시, 임시 저장 시각 기록', async () => {
    const { recruit, store } = await signedIn()
    const view = await recruit.getForm()
    expect(view.received).toBe(25)
    expect(view.lockedQuestionIds).toHaveLength(6)
    expect((await rejects(recruit.publish({ ...pub, generation: 6 }))).code).toBe('CONFLICT')
    const saved = await recruit.saveDraft({ ...pub, endDate: '2026-12-31' })
    expect(saved.draft?.endDate).toBe('2026-12-31')
    expect(saved.draftSaved?.by).toMatchObject({ name: '운영진A' })
    store.set('recruit', (s) => ({ ...s, form: { draft: null, draftSaved: null, published: null, publishedStamp: null }, criteria: { items: [], version: 0, updated: null }, applicants: [] }))
    const fresh = await recruit.getForm()
    expect(fresh.draft?.questions.map((q) => q.title)).toEqual(['이름', '학번', '학과', '이메일'])
    expect(fresh.lockedQuestionIds).toEqual([])
    const e = await rejects(recruit.publish({ ...fresh.draft!, startDate: '2026-11-10', endDate: '2026-11-20' }))
    expect(e.message).toBe('평가 기준을 먼저 저장해 주세요. 평가 기준이 있어야 게시할 수 있습니다.')
  })
})

describe('예시 지원자 타입 확인', () => {
  it('목록 행에는 전체 학번 · 응답이 없다', async () => {
    const { recruit } = await signedIn()
    const d = await recruit.getApplicant('ap-01')
    expect('studentId' in d).toBe(false)
    expect(d.answers['q-student-id']).toBe('2026****01')
    const keys: (keyof Applicant)[] = ['answers']
    expect(keys.every((k) => k in d)).toBe(true)
  })
})
