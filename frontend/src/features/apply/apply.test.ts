import { describe, expect, it } from 'vitest'
import { applyTarget, APPLY_PATH, recruitStatus, type RecruitingCurrent } from '@/content/recruitingStatus'
import { FIXED_QUESTIONS } from '@/features/admin/data/recruit/seed'
import { joinPrimary } from '@/features/common/joinData'
import { statusView } from '@/features/pages/recruits/status'
import { ApplyError } from './data/repository'
import {
  answerError,
  cleanAnswers,
  draftKey,
  hasErrors,
  loadDraft,
  maxLength,
  periodState,
  presetTrack,
  progress,
  saveDraft,
  validateApplication,
} from './data/rules'
import { SAMPLE_QUESTIONS, createSampleApplyRepository } from './data/sampleRepository'
import type { FormQuestion } from './data/types'

const q = (over: Partial<FormQuestion>): FormQuestion => ({ id: 'q-x', title: '질문', type: 'short', required: true, options: [], fixed: false, ...over })
const form = { questions: [...SAMPLE_QUESTIONS] }

/** 모든 필수 질문에 맞게 답한 지원서 */
const GOOD: Record<string, string> = {
  'q-name': '예시 지원자',
  'q-student-id': '2026000101',
  'q-department': '컴퓨터공학전공',
  'q-email': 'applicant@example.com',
  'q-track': 'Frontend',
  'q-motivation': '지원 동기 예시',
  'q-experience': '협업 경험 예시',
  'q-plan': '활동 계획 예시',
  'q-session': '모두 참석할 수 있음',
}
const AGREE = { privacy: true, ai: true }

describe('예시 지원폼 질문', () => {
  it('고정 질문 넷은 관리자 지원폼과 같다', () => {
    expect(SAMPLE_QUESTIONS.filter((x) => x.fixed)).toEqual(FIXED_QUESTIONS)
  })
  it('지원 파트 선택지는 지원 안내의 네 파트 이름이다', () => {
    expect(SAMPLE_QUESTIONS.find((x) => x.id === 'q-track')?.options).toEqual(['Frontend', 'Backend', 'AI/ML', 'Product Design'])
  })
})

describe('답 검사', () => {
  it('필수는 비우면 오류, 선택은 비워도 된다', () => {
    expect(answerError(q({}), '  ')).toBe('답을 적어 주세요.')
    expect(answerError(q({ type: 'choice', options: ['가', '나'] }), '')).toBe('하나를 골라 주세요.')
    expect(answerError(q({ required: false }), '')).toBeNull()
  })
  it('학번은 숫자 10자리, 이메일은 주소 모양', () => {
    expect(answerError(q({ id: 'q-student-id' }), '20260001')).toMatch('10자리')
    expect(answerError(q({ id: 'q-student-id' }), '2026000101')).toBeNull()
    expect(answerError(q({ id: 'q-email' }), 'abc')).toMatch('이메일')
    expect(answerError(q({ id: 'q-email' }), 'a@b.co')).toBeNull()
  })
  it('객관식은 선택지 안의 답만', () => {
    expect(answerError(q({ type: 'choice', options: ['가', '나'] }), '다')).toMatch('선택지')
  })
  it("글자 수: 질문의 '500자 이내'를 따르고, 없으면 유형별 기본", () => {
    expect(maxLength({ title: '지원 동기 (500자 이내)', type: 'long' })).toBe(500)
    expect(maxLength({ title: '1,500자 이내로', type: 'long' })).toBe(1500)
    expect(maxLength({ title: '자기소개', type: 'long' })).toBe(1000)
    expect(maxLength({ title: '이름', type: 'short' })).toBe(100)
    expect(answerError(q({ type: 'long', title: '(5자 이내)' }), '여섯글자예요')).toMatch('5자 이내')
  })
  it('모두 맞고 둘 다 동의하면 오류 없음, 동의가 하나라도 빠지면 오류', () => {
    expect(hasErrors(validateApplication(form, GOOD, AGREE))).toBe(false)
    expect(validateApplication(form, GOOD, { privacy: true, ai: false }).consents).toBeTruthy()
  })
  it('보낼 답은 앞뒤 공백을 지우고 질문에 없는 칸을 뺀다', () => {
    expect(cleanAnswers({ questions: [q({ id: 'a' })] }, { a: ' 답 ', b: '없는 칸' })).toEqual({ a: '답' })
  })
  it('진행: 맞게 답한 필수 질문 수', () => {
    expect(progress(form, {})).toEqual({ done: 0, total: 9 })
    expect(progress(form, GOOD)).toEqual({ done: 9, total: 9 })
    expect(progress(form, { ...GOOD, 'q-email': 'x' }).done).toBe(8)
  })
})

describe('지원 기간 · 파트 미리 고르기', () => {
  it('종료일 당일까지 열려 있다', () => {
    const f = { startDate: '2027-03-02', endDate: '2027-03-10' }
    expect(periodState(f, '2027-03-01')).toBe('before')
    expect(periodState(f, '2027-03-10')).toBe('open')
    expect(periodState(f, '2027-03-11')).toBe('after')
    expect(periodState({ startDate: null, endDate: null }, '2027-03-05')).toBe('unset')
  })
  it('?part= 를 지원 파트 답으로 (모르는 값은 무시)', () => {
    expect(presetTrack(form, 'ai')).toEqual({ 'q-track': 'AI/ML' })
    expect(presetTrack(form, 'nope')).toEqual({})
    expect(presetTrack(form, null)).toEqual({})
  })
})

describe('임시 보관', () => {
  const mem = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }
  }
  it('빈 칸은 빼고 남기고, 다 비면 지운다', () => {
    const st = mem()
    saveDraft(5, { a: '답', b: ' ' }, st)
    expect(loadDraft(5, st)).toEqual({ a: '답' })
    saveDraft(5, { a: '' }, st)
    expect(st.m.has(draftKey(5))).toBe(false)
  })
  it('깨진 값 · 저장소 오류는 조용히 넘어간다', () => {
    expect(loadDraft(5, { getItem: () => '{not json' })).toEqual({})
    expect(loadDraft(5, { getItem: () => '["x"]' })).toEqual({})
    expect(() =>
      saveDraft(5, { a: '답' }, {
        setItem: () => {
          throw new Error('quota')
        },
        removeItem: () => {},
      }),
    ).not.toThrow()
  })
})

describe('예시 저장소', () => {
  it('제출하면 접수 번호, 같은 학번은 두 번 낼 수 없다', async () => {
    const repo = createSampleApplyRepository({ delay: 0, now: () => Date.parse('2027-03-05T03:00:00Z') })
    const f = await repo.getForm()
    expect(f?.questions.length).toBe(SAMPLE_QUESTIONS.length)
    const r = await repo.submit({ generation: 5, answers: GOOD, consents: AGREE })
    expect(r).toEqual({ no: 1, submittedAt: '2027-03-05T03:00:00.000Z', email: 'applicant@example.com' })
    await expect(repo.submit({ generation: 5, answers: GOOD, consents: AGREE })).rejects.toMatchObject({ code: 'DUPLICATE' })
  })
  it('검사에 걸리면 칸별 오류를 돌려준다', async () => {
    const repo = createSampleApplyRepository({ delay: 0 })
    const err = await repo.submit({ generation: 5, answers: { ...GOOD, 'q-email': 'x' }, consents: AGREE }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApplyError)
    expect((err as ApplyError).fields?.['q-email']).toBeTruthy()
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
