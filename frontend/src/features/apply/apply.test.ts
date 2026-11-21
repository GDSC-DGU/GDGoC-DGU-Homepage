import { describe, expect, it } from 'vitest'
import { applyTarget, APPLY_PATH, recruitStatus, type RecruitingCurrent } from '@/content/recruitingStatus'
import { joinPrimary } from '@/features/common/joinData'
import { statusView } from '@/features/pages/recruits/status'
import { applyView, readPreview } from '@/features/pages/recruits/view'
import { createHttpApplyRepository } from './data/httpRepository'
import { ApplyError } from './data/repository'
import {
  answerError,
  applicantError,
  draftKey,
  emptyDraft,
  hasErrors,
  kstDateTime,
  loadDraft,
  maxLengthOf,
  presetTrack,
  progress,
  qKey,
  saveDraft,
  toRequest,
  trackLabel,
  validateDraft,
  visibleQuestions,
} from './data/rules'
import { SAMPLE_QUESTIONS, SAMPLE_RID, SAMPLE_TRACKS, createSampleApplyRepository } from './data/sampleRepository'
import type { ApplicationForm, ApplyDraft, FormQuestion } from './data/types'

const q = (over: Partial<FormQuestion>): FormQuestion => ({ questionId: 'qx', type: 'SHORT_TEXT', title: '질문', required: true, ...over })
const form: ApplicationForm = { rid: SAMPLE_RID, formVersion: 1, questions: [...SAMPLE_QUESTIONS] }
const TRACKS = [...SAMPLE_TRACKS]
const AGREE = { privacy: true, ai: true }

/** 모든 필수 칸을 맞게 채운 지원서 (Backend: FE 전용 문항이 안 보임) */
const GOOD: ApplyDraft = {
  applicant: { name: '예시 지원자', studentId: '2026000101', major: '컴퓨터공학전공', email: 'applicant@example.com', phone: '' },
  track: 'BE',
  answers: { 'q-motivation': '지원 동기 예시', 'q-experience': '협업 경험 예시', 'q-plan': '활동 계획 예시', 'q-session': '모두 참석할 수 있음' },
}

describe('기본 정보 (API-RCT-005 applicant)', () => {
  it('필수는 비우면 오류, 연락처는 선택', () => {
    expect(applicantError('name', ' ')).toBe('답을 적어 주세요.')
    expect(applicantError('phone', '')).toBeNull()
    expect(applicantError('phone', '010-1234-5678')).toBeNull()
    expect(applicantError('phone', '12-34')).toMatch('연락처')
  })
  it('학번은 숫자 10자리, 이메일은 주소 모양', () => {
    expect(applicantError('studentId', '20260001')).toMatch('10자리')
    expect(applicantError('studentId', '2026000101')).toBeNull()
    expect(applicantError('email', 'abc')).toMatch('이메일')
  })
})

describe('문항 (API-RCT-002 타입별)', () => {
  it('SHORT_TEXT · LONG_TEXT: maxLength 가 없으면 100 · 1000자', () => {
    expect(maxLengthOf({ type: 'SHORT_TEXT' })).toBe(100)
    expect(maxLengthOf({ type: 'LONG_TEXT' })).toBe(1000)
    expect(maxLengthOf({ type: 'URL' })).toBe(2048)
    expect(maxLengthOf({ type: 'LONG_TEXT', maxLength: 500 })).toBe(500)
    expect(answerError(q({ type: 'LONG_TEXT', maxLength: 5 }), '여섯글자예요')).toMatch('5자 이내')
  })
  it('URL 은 http · https 만', () => {
    expect(answerError(q({ type: 'URL' }), 'github.com/hong')).toMatch('http')
    expect(answerError(q({ type: 'URL' }), 'ftp://x.com')).toMatch('http')
    expect(answerError(q({ type: 'URL' }), 'https://github.com/hong')).toBeNull()
  })
  it('SINGLE_CHOICE 는 선택지 안에서 하나, MULTI_CHOICE 는 하나 이상', () => {
    expect(answerError(q({ type: 'SINGLE_CHOICE', options: ['가', '나'] }), '')).toBe('하나를 골라 주세요.')
    expect(answerError(q({ type: 'SINGLE_CHOICE', options: ['가', '나'] }), '다')).toMatch('선택지')
    expect(answerError(q({ type: 'MULTI_CHOICE', options: ['가', '나'] }), [])).toBe('하나 이상 골라 주세요.')
    expect(answerError(q({ type: 'MULTI_CHOICE', options: ['가', '나'] }), ['가', '나'])).toBeNull()
    expect(answerError(q({ type: 'MULTI_CHOICE', required: false, options: ['가'] }), [])).toBeNull()
  })
  it('trackOnly 문항은 그 파트에게만 보인다', () => {
    expect(visibleQuestions(form, 'FE').some((x) => x.questionId === 'q-fe-work')).toBe(true)
    expect(visibleQuestions(form, 'BE').some((x) => x.questionId === 'q-fe-work')).toBe(false)
  })
})

describe('지원서 전체 검사 · 요청 본문 (API-RCT-005)', () => {
  it('모두 맞고 둘 다 동의하면 오류 없음', () => {
    expect(hasErrors(validateDraft(form, TRACKS, GOOD, AGREE))).toBe(false)
  })
  it('파트를 안 고르거나 동의가 빠지면 오류', () => {
    expect(validateDraft(form, TRACKS, { ...GOOD, track: '' }, AGREE).track).toBeTruthy()
    expect(validateDraft(form, TRACKS, GOOD, { privacy: true, ai: false }).consents).toBeTruthy()
    expect(validateDraft(form, TRACKS, { ...GOOD, answers: {} }, AGREE)[qKey('q-motivation')]).toBeTruthy()
  })
  it('요청 본문: 명세 필드 이름 그대로, 단일 · 주관식은 value, 복수는 values, 안 보이는 문항 · 빈 답은 뺀다', () => {
    const draft: ApplyDraft = { ...GOOD, answers: { ...GOOD.answers, 'q-interest': ['스터디', 'G-Sprint'], 'q-fe-work': 'https://x.dev', 'q-link': '  ' } }
    const req = toRequest(form, draft, AGREE)
    expect(Object.keys(req).sort()).toEqual(['answers', 'applicant', 'formVersion', 'privacyConsent', 'track'])
    expect(Object.keys(req.applicant).sort()).toEqual(['email', 'major', 'name', 'phone', 'studentId'])
    expect(req.track).toBe('BE')
    expect(req.privacyConsent).toBe(true)
    expect(req.formVersion).toBe(1)
    expect(req.answers).toContainEqual({ questionId: 'q-motivation', value: '지원 동기 예시' })
    expect(req.answers).toContainEqual({ questionId: 'q-interest', values: ['스터디', 'G-Sprint'] })
    expect(req.answers.some((a) => a.questionId === 'q-fe-work')).toBe(false)
    expect(req.answers.some((a) => a.questionId === 'q-link')).toBe(false)
  })
  it('진행: 기본 정보 필수 4 + 파트 1 + 보이는 필수 문항', () => {
    expect(progress(form, TRACKS, emptyDraft())).toEqual({ done: 0, total: 9 })
    expect(progress(form, TRACKS, GOOD)).toEqual({ done: 9, total: 9 })
  })
})

describe('지원 파트 · 시각', () => {
  it('파트 코드 이름 · ?part= 미리 고르기', () => {
    expect(trackLabel('FE')).toBe('Frontend')
    expect(trackLabel('Mobile')).toBe('Mobile')
    expect(presetTrack(TRACKS, 'frontend')).toBe('FE')
    expect(presetTrack(['BE', 'Mobile'], 'mobile')).toBe('Mobile')
    expect(presetTrack(TRACKS, 'nope')).toBe('')
  })
  it('ISO 시각을 KST 로', () => {
    expect(kstDateTime('2027-02-20T00:00:00+09:00')).toBe('2027.02.20(토) 00:00')
    expect(kstDateTime('2027-03-05T14:59:59Z')).toBe('2027.03.05(금) 23:59')
  })
})

describe('임시 보관', () => {
  const mem = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }
  }
  it('회차별로 남기고, 비면 지운다', () => {
    const st = mem()
    saveDraft('rct_5', { ...GOOD, answers: { ...GOOD.answers, 'q-interest': ['스터디'] } }, st)
    expect(loadDraft('rct_5', st).answers['q-interest']).toEqual(['스터디'])
    expect(loadDraft('rct_5', st).applicant.studentId).toBe('2026000101')
    saveDraft('rct_5', emptyDraft(), st)
    expect(st.m.has(draftKey('rct_5'))).toBe(false)
  })
  it('깨진 값 · 저장소 오류는 조용히 넘어간다', () => {
    expect(loadDraft('rct_5', { getItem: () => '{not json' })).toEqual(emptyDraft())
    expect(() =>
      saveDraft('rct_5', GOOD, {
        setItem: () => {
          throw new Error('quota')
        },
        removeItem: () => {},
      }),
    ).not.toThrow()
  })
})

describe('예시 저장소 (명세와 같은 응답 · 오류)', () => {
  it('제출하면 aid · submittedAt, 같은 학번 · 이메일은 APPLICATION_DUPLICATED', async () => {
    const repo = createSampleApplyRepository({ delay: 0, now: () => Date.parse('2027-03-05T03:00:00Z') })
    const cur = await repo.getCurrent()
    expect(cur.rid).toBe(SAMPLE_RID)
    expect(cur.tracks).toEqual(TRACKS)
    const f = await repo.getForm(cur.rid)
    const r = await repo.submit(cur.rid, toRequest(f, GOOD, AGREE))
    expect(r).toEqual({ aid: 'a_sample_1', submittedAt: '2027-03-05T03:00:00.000Z' })
    expect(await repo.checkDuplicate(cur.rid, '2026000101')).toEqual({ duplicated: true })
    await expect(repo.submit(cur.rid, toRequest(f, GOOD, AGREE))).rejects.toMatchObject({ code: 'APPLICATION_DUPLICATED' })
  })
  it('폼 버전이 다르면 FORM_CHANGED, 입력이 틀리면 VALIDATION_FAILED', async () => {
    const repo = createSampleApplyRepository({ delay: 0 })
    await expect(repo.submit(SAMPLE_RID, { ...toRequest(form, GOOD, AGREE), formVersion: 99 })).rejects.toMatchObject({ code: 'FORM_CHANGED' })
    const err = await repo.submit(SAMPLE_RID, toRequest(form, { ...GOOD, applicant: { ...GOOD.applicant, email: 'x' } }, AGREE)).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApplyError)
    expect((err as ApplyError).code).toBe('VALIDATION_FAILED')
  })
})

describe('HTTP 구현 (API 명세 주소 · 응답 감싸기)', () => {
  const fake = (status: number, body: unknown) => {
    const calls: { url: string; init?: RequestInit }[] = []
    const fetcher = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
    }) as unknown as typeof fetch
    return { calls, repo: createHttpApplyRepository('/api', fetcher) }
  }
  it('성공이면 data 만 돌려준다', async () => {
    const { calls, repo } = fake(201, { success: true, data: { aid: 'a_7f3c', submittedAt: '2027-02-25T14:10:00+09:00' } })
    const r = await repo.submit('rct_5', toRequest(form, GOOD, AGREE))
    expect(r.aid).toBe('a_7f3c')
    expect(calls[0].url).toBe('/api/v1/recruitments/rct_5/applications')
    expect(calls[0].init?.method).toBe('POST')
    expect(JSON.parse(String(calls[0].init?.body)).applicant.studentId).toBe('2026000101')
  })
  it('실패면 code · message 를 ApplyError 로', async () => {
    const { repo } = fake(409, { success: false, code: 'APPLICATION_DUPLICATED', message: '이미 제출된 지원서가 있습니다.' })
    await expect(repo.submit('rct_5', toRequest(form, GOOD, AGREE))).rejects.toMatchObject({ code: 'APPLICATION_DUPLICATED', status: 409 })
  })
  it('현재 모집 · 폼 · 중복 확인 주소', async () => {
    const { calls, repo } = fake(200, { success: true, data: { duplicated: false } })
    await repo.checkDuplicate('rct_5', '2026000101')
    await repo.getForm('rct_5')
    await repo.getCurrent()
    expect(calls.map((c) => c.url)).toEqual(['/api/v1/recruitments/rct_5/applications/check', '/api/v1/recruitments/rct_5/form', '/api/v1/recruitments/current'])
  })
})

describe("'지원서 쓰기'가 갈 곳 (applyTarget)", () => {
  const src = (cur: Partial<RecruitingCurrent>) => ({ current: { generation: 5, channel: 'https://www.instagram.com/gdg.donggukuniv/', ...cur }, history: [] })
  const open = recruitStatus('2027-03-05', src({ opensAt: '2027-03-01', deadline: '2027-03-10' }))
  const openUrl = recruitStatus('2027-03-05', src({ opensAt: '2027-03-01', deadline: '2027-03-10', applyUrl: 'https://forms.gle/x' }))
  const closed = recruitStatus('2027-03-05', src({}))

  it('applyUrl 이 있으면 그 주소가 먼저 (새 창)', () => {
    expect(applyTarget(openUrl, true)).toEqual({ href: 'https://forms.gle/x', external: true })
  })
  it('사이트 안 지원서가 열려 있으면 /recruits/apply, 예시인 동안은 어디로도 보내지 않는다', () => {
    expect(applyTarget(open, true)).toEqual({ href: APPLY_PATH, external: false })
    expect(applyTarget(open, false)).toBeNull()
  })
  it('모집 중이 아니면 null', () => {
    expect(applyTarget(closed, true)).toBeNull()
  })
  it('페이지 끝 띠 · 지원 안내 머리도 같은 규칙을 따른다', () => {
    expect(joinPrimary(open, true)).toMatchObject({ kind: 'apply', href: APPLY_PATH, external: false })
    expect(joinPrimary(open, false)).toMatchObject({ kind: 'notify' })
    expect(statusView(open, '2027-03-05', '@gdg', true).primary).toBe('apply')
    expect(statusView(open, '2027-03-05', '@gdg', false).primary).toBe('channel')
  })
})

describe('지원하기: 모집 중(지원하기 → 지원서 페이지) 또는 모집 기간 아님(지원하기 꺼짐)', () => {
  const src = (cur: Partial<RecruitingCurrent>) => ({ current: { generation: 5, channel: 'https://www.instagram.com/gdg.donggukuniv/', ...cur }, history: [] })
  const open = recruitStatus('2027-03-05', src({ opensAt: '2027-03-01', deadline: '2027-03-10' }))
  const openUrl = recruitStatus('2027-03-05', src({ opensAt: '2027-03-01', deadline: '2027-03-10', applyUrl: 'https://forms.gle/x' }))
  const closed = recruitStatus('2027-03-05', src({}))
  it('모집 중이고 사이트 지원서가 열려 있을 때만 지원서', () => {
    expect(applyView(open, null, true)).toBe('form')
    expect(applyView(open, null, false)).toBe('closed')
    expect(applyView(openUrl, null, true)).toBe('closed')
    expect(applyView(closed, null, true)).toBe('closed')
  })
  it('개발 화면에서만 ?preview= 로 두 화면을 바꿔 본다', () => {
    expect(readPreview('open', true)).toBe('open')
    expect(readPreview('open', false)).toBeNull()
    expect(readPreview('zz', true)).toBeNull()
    expect(applyView(closed, 'open', false)).toBe('form')
    expect(applyView(open, 'closed', true)).toBe('closed')
  })
})
