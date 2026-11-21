import { RECRUITING } from '@/content'
import { recruitStatus } from '@/content/recruitingStatus'
import { ApplyError, type ApplyRepository } from './repository'
import { hasErrors, validateDraft } from './rules'
import type { ApplicationForm, ApplyState, CurrentRecruitment, FormQuestion } from './types'

/** 예시 회차 id · 지원 파트 (지원 안내의 네 파트) */
export const SAMPLE_RID = `rct_${RECRUITING.current.generation}`
export const SAMPLE_TRACKS = ['FE', 'BE', 'AI', 'DESIGN'] as const

/**
 * 예시 지원폼 문항 (API-RCT-002 모양 그대로). 운영진이 실제 지원폼을 게시하면 서버 문항으로 바뀐다.
 * 문항 타입 다섯 가지와 trackOnly 를 하나씩 보여 주려고 넣은 예시다.
 */
export const SAMPLE_QUESTIONS: readonly FormQuestion[] = [
  { questionId: 'q-motivation', type: 'LONG_TEXT', title: '지원 동기를 적어 주세요.', description: '500자 이내', required: true, maxLength: 500 },
  { questionId: 'q-experience', type: 'LONG_TEXT', title: '팀으로 무언가를 만들어 본 경험과 그때 맡은 역할을 적어 주세요.', required: true, maxLength: 1000 },
  { questionId: 'q-plan', type: 'LONG_TEXT', title: '이번 기수에서 해 보고 싶은 활동과 그 이유를 적어 주세요.', required: true, maxLength: 1000 },
  {
    questionId: 'q-session',
    type: 'SINGLE_CHOICE',
    title: '정기 세션(매주 화요일 18:00)에 참석할 수 있나요?',
    required: true,
    options: ['모두 참석할 수 있음', '대부분 참석할 수 있음', '참석이 어려운 주가 있음'],
  },
  { questionId: 'q-interest', type: 'MULTI_CHOICE', title: '관심 있는 활동을 모두 골라 주세요.', required: false, options: ['정기 세션', 'G-Sprint', '스터디', '해커톤 · 공모전'] },
  { questionId: 'q-fe-work', type: 'URL', title: '직접 만든 화면을 볼 수 있는 주소', description: 'Frontend 지원자만. 배포 주소나 GitHub', required: false, trackOnly: ['FE'] },
  { questionId: 'q-link', type: 'URL', title: 'GitHub · 포트폴리오 주소', required: false },
]

export interface SampleOptions {
  /** 지금 시각 (테스트용) */
  now?: () => number
  /** 응답 지연 (ms). 화면에서 '불러오는 중' · '제출하는 중'이 보이게 */
  delay?: number
}

/** content/recruiting.json 의 모집 상태 → API applyState */
function sampleState(today: string): ApplyState {
  const st = recruitStatus(today)
  if (st.state === 'open') return 'OPEN'
  if (st.state === 'soon') return 'BEFORE_START'
  if (st.state === 'ended') return 'ENDED'
  return 'NOT_PUBLISHED'
}

/**
 * 예시 구현: 이 탭의 메모리에만 둔다 (어디에도 보내지 않는다. 새로고침하면 처음으로).
 * 모집 상태는 content/recruiting.json 을 따른다. 예시라서 기간 밖이어도 제출을 막지 않는다 (개발 버튼으로 화면 확인용).
 * 서버가 할 일(입력 검사, 학번 · 이메일 중복 막기, 폼 버전 확인)은 같은 규칙으로 흉내 낸다.
 */
export function createSampleApplyRepository({ now = () => Date.now(), delay = 300 }: SampleOptions = {}): ApplyRepository {
  const cur = RECRUITING.current
  const form: ApplicationForm = { rid: SAMPLE_RID, formVersion: 1, questions: SAMPLE_QUESTIONS.map((q) => structuredClone(q)) }
  const studentIds = new Set<string>()
  const emails = new Set<string>()
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
  const kstToday = () => new Date(now() + 9 * 3600_000).toISOString().slice(0, 10)
  const checkRid = (rid: string) => {
    if (rid !== SAMPLE_RID) throw new ApplyError('NOT_FOUND', '모집 정보가 없습니다.', 404)
  }

  return {
    getCurrent: () =>
      respond((): CurrentRecruitment => {
        const applyState = sampleState(kstToday())
        return {
          rid: SAMPLE_RID,
          cohort: cur.generation,
          title: `GDGoC DGU ${cur.generation}기 멤버 모집`,
          status: applyState === 'OPEN' ? 'OPEN' : 'DRAFT',
          applyStartAt: cur.opensAt ? `${cur.opensAt}T00:00:00+09:00` : '',
          applyEndAt: cur.deadline ? `${cur.deadline}T23:59:59+09:00` : '',
          tracks: [...SAMPLE_TRACKS],
          applyState,
          canApply: applyState === 'OPEN',
          formVersion: form.formVersion,
        }
      }),
    getForm: (rid) =>
      respond(() => {
        checkRid(rid)
        return structuredClone(form)
      }),
    checkDuplicate: (rid, studentId) =>
      respond(() => {
        checkRid(rid)
        if (!/^\d{10}$/.test(studentId.trim())) throw new ApplyError('VALIDATION_FAILED', '학번 형식이 올바르지 않습니다.', 400)
        return { duplicated: studentIds.has(studentId.trim()) }
      }),
    submit: (rid, req) =>
      respond(() => {
        checkRid(rid)
        if (req.formVersion !== form.formVersion) throw new ApplyError('FORM_CHANGED', '지원폼이 변경되었습니다. 새로고침 후 다시 작성해주세요.', 409)
        const answers: Record<string, string | string[]> = {}
        for (const a of req.answers) answers[a.questionId] = a.values ?? a.value ?? ''
        const errors = validateDraft(form, SAMPLE_TRACKS, { applicant: req.applicant, track: req.track, answers }, { privacy: req.privacyConsent, ai: true })
        if (hasErrors(errors)) throw new ApplyError('VALIDATION_FAILED', '입력 값을 확인해주세요.', 400)
        const email = req.applicant.email.trim().toLowerCase()
        if (studentIds.has(req.applicant.studentId) || emails.has(email)) throw new ApplyError('APPLICATION_DUPLICATED', '이미 제출된 지원서가 있습니다.', 409)
        studentIds.add(req.applicant.studentId)
        emails.add(email)
        seq += 1
        return { aid: `a_sample_${seq}`, submittedAt: new Date(now()).toISOString() }
      }),
  }
}
