import { RECRUITING } from '@/content'
import { ApplyError, type ApplyRepository } from './repository'
import { FIXED_ID, cleanAnswers, hasErrors, validateApplication } from './rules'
import type { ApplyReceipt, FormQuestion, PublicApplyForm } from './types'

/**
 * 예시 지원폼의 질문. 관리자 화면의 예시 지원폼(features/admin/data/recruit/seed.ts 의 FIXED_QUESTIONS + QUESTIONS)과 같다.
 * 관리자 코드를 공개 페이지 파일에 넣지 않으려고 여기 따로 적었다. 둘이 같은지는 apply.test.ts 가 확인한다.
 */
export const SAMPLE_QUESTIONS: readonly FormQuestion[] = [
  { id: 'q-name', title: '이름', type: 'short', required: true, options: [], fixed: true },
  { id: 'q-student-id', title: '학번', type: 'short', required: true, options: [], fixed: true },
  { id: 'q-department', title: '학과', type: 'short', required: true, options: [], fixed: true },
  { id: 'q-email', title: '이메일', type: 'short', required: true, options: [], fixed: true },
  { id: 'q-track', title: '지원 파트를 골라 주세요.', type: 'choice', required: true, options: ['Frontend', 'Backend', 'AI/ML', 'Product Design'], fixed: false },
  { id: 'q-motivation', title: '지원 동기를 적어 주세요. (500자 이내)', type: 'long', required: true, options: [], fixed: false },
  { id: 'q-experience', title: '팀으로 무언가를 만들어 본 경험과 그때 맡은 역할을 적어 주세요.', type: 'long', required: true, options: [], fixed: false },
  { id: 'q-plan', title: '이번 기수에서 해 보고 싶은 활동과 그 이유를 적어 주세요.', type: 'long', required: true, options: [], fixed: false },
  {
    id: 'q-session',
    title: '정기 세션(매주 화요일 18:00)에 참석할 수 있나요?',
    type: 'choice',
    required: true,
    options: ['모두 참석할 수 있음', '대부분 참석할 수 있음', '참석이 어려운 주가 있음'],
    fixed: false,
  },
  { id: 'q-link', title: 'GitHub · 포트폴리오 주소 (선택)', type: 'short', required: false, options: [], fixed: false },
]

export interface SampleOptions {
  now?: () => number
  /** 응답 지연 (ms). 화면에서 '불러오는 중' · '제출하는 중'이 보이게 */
  delay?: number
}

/**
 * 예시 구현: 이 탭의 메모리에만 둔다 (어디에도 보내지 않는다. 새로고침하면 처음으로).
 * 지원 기간은 content/recruiting.json 의 current(opensAt · deadline)를 따른다. 예시라서 기간 밖이어도 제출을 막지 않는다.
 * 서버가 할 일(입력 검사, 같은 학번 중복 막기, 접수 번호)은 같은 규칙으로 흉내 낸다.
 */
export function createSampleApplyRepository({ now = () => Date.now(), delay = 300 }: SampleOptions = {}): ApplyRepository {
  const cur = RECRUITING.current
  const form: PublicApplyForm = {
    generation: cur.generation,
    startDate: cur.opensAt ?? null,
    endDate: cur.deadline ?? null,
    questions: SAMPLE_QUESTIONS.map((q) => ({ ...q, options: [...q.options] })),
  }
  const received = new Set<string>()
  let seq = 0

  const respond = <T>(fn: () => T): Promise<T> =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(fn())
        } catch (e) {
          reject(e)
        }
      }, delay)
    })

  return {
    getForm: () => respond(() => structuredClone(form)),
    submit: (input) =>
      respond((): ApplyReceipt => {
        const answers = cleanAnswers(form, input.answers)
        const errors = validateApplication(form, answers, input.consents)
        if (hasErrors(errors)) throw new ApplyError('INVALID', '입력한 내용을 확인해 주세요.', errors)
        const key = `${input.generation}:${answers[FIXED_ID.studentId]}`
        if (received.has(key)) throw new ApplyError('DUPLICATE', `이 학번으로 낸 ${input.generation}기 지원서가 이미 있습니다. 고칠 내용이 있으면 운영진 메일로 알려 주세요.`)
        received.add(key)
        seq += 1
        return { no: seq, submittedAt: new Date(now()).toISOString(), email: answers[FIXED_ID.email] }
      }),
  }
}
