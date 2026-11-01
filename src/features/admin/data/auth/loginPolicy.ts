import type { AdminLoginState, UserCore } from '../common/accounts'

/**
 * 관리자 로그인 규칙 (F-ACM-001 · API-ACM-001). 화면 없이 계산만 한다 (테스트: auth.test.ts).
 * 1) Lead · Core 이고 활성인 계정만
 * 2) 틀리면 '아이디 또는 비밀번호가 올바르지 않습니다.'
 * 3) 비활성 계정은 '비활성화된 계정입니다. 관리자에게 문의하세요.'
 * 4) 5회 연속 틀리면 15분 동안 로그인 불가, 15분 뒤 다시 5회 연속 틀리면 잠김 (다른 Lead 가 잠금 해제)
 */
export const LOGIN_MAX_FAILS = 5
export const LOGIN_LIMIT_MINUTES = 15

const hhmm = (ms: number) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(ms)

export const LOGIN_MESSAGES = {
  invalid: '아이디 또는 비밀번호가 올바르지 않습니다.',
  inactive: '비활성화된 계정입니다. 관리자에게 문의하세요.',
  locked: '비밀번호를 여러 번 틀려 계정이 잠겼습니다. 다른 Lead에게 잠금 해제를 요청해 주세요.',
  limited: (untilMs: number) => `비밀번호를 ${LOGIN_MAX_FAILS}회 연속 틀려 ${LOGIN_LIMIT_MINUTES}분 동안 로그인할 수 없습니다. ${hhmm(untilMs)} 이후에 다시 시도해 주세요.`,
} as const

export type LoginOutcome =
  | { kind: 'ok'; login: AdminLoginState }
  | { kind: 'invalid'; message: string; login?: AdminLoginState }
  | { kind: 'inactive'; message: string }
  | { kind: 'limited'; message: string; login?: AdminLoginState }
  | { kind: 'locked'; message: string; login?: AdminLoginState; lockNow?: boolean }

/**
 * 한 번의 로그인 시도 결과와 바뀐 실패 기록.
 * account: 아이디로 찾은 계정 (없거나 General 이면 undefined 로 넘긴다)
 * passwordOk: 비밀번호가 맞았는지
 */
export function evaluateLogin(account: Pick<UserCore, 'status' | 'adminLogin'> | undefined, passwordOk: boolean, now: number): LoginOutcome {
  if (!account || !account.adminLogin) return { kind: 'invalid', message: LOGIN_MESSAGES.invalid }
  const login = account.adminLogin
  if (account.status === 'locked') return { kind: 'locked', message: LOGIN_MESSAGES.locked }
  const until = login.limitedUntil ? Date.parse(login.limitedUntil) : 0
  if (until > now) return { kind: 'limited', message: LOGIN_MESSAGES.limited(until) }

  if (!passwordOk) {
    const failedCount = login.failedCount + 1
    if (failedCount < LOGIN_MAX_FAILS) return { kind: 'invalid', message: LOGIN_MESSAGES.invalid, login: { ...login, failedCount, limitedUntil: null } }
    // 5회째: 처음이면 15분 제한, 제한을 한 번 받은 뒤라면 잠김
    if (login.limitRounds === 0) {
      const limitedUntil = now + LOGIN_LIMIT_MINUTES * 60_000
      return { kind: 'limited', message: LOGIN_MESSAGES.limited(limitedUntil), login: { ...login, failedCount: 0, limitedUntil: new Date(limitedUntil).toISOString(), limitRounds: 1 } }
    }
    return { kind: 'locked', message: LOGIN_MESSAGES.locked, login: { ...login, failedCount: 0, limitedUntil: null }, lockNow: true }
  }

  // 비밀번호가 맞아도 비활성 계정은 들어올 수 없다 (실패 횟수는 그대로)
  if (account.status === 'inactive') return { kind: 'inactive', message: LOGIN_MESSAGES.inactive }
  return { kind: 'ok', login: { ...login, failedCount: 0, limitedUntil: null, limitRounds: 0 } }
}

/** 남은 시도 횟수 (안내용) */
export const attemptsLeft = (login: AdminLoginState) => Math.max(0, LOGIN_MAX_FAILS - login.failedCount)

/** F-ACM-002 새 비밀번호 규칙: 8자 이상, 영문과 숫자 포함, 임시 비밀번호와 다름, 확인 값과 같음 */
export interface PasswordChangeForm {
  current: string
  next: string
  confirm: string
}

export function validatePasswordChange(form: PasswordChangeForm): Partial<Record<keyof PasswordChangeForm, string>> {
  const e: Partial<Record<keyof PasswordChangeForm, string>> = {}
  if (!form.current) e.current = '현재 비밀번호를 입력해 주세요.'
  if (!form.next) e.next = '새 비밀번호를 입력해 주세요.'
  else if (form.next.length < 8 || !/[A-Za-z]/.test(form.next) || !/\d/.test(form.next)) e.next = '8자 이상, 영문과 숫자를 함께 써 주세요.'
  else if (form.current && form.next === form.current) e.next = '임시 비밀번호와 다른 비밀번호를 써 주세요.'
  if (!form.confirm) e.confirm = '새 비밀번호를 한 번 더 입력해 주세요.'
  else if (form.next && form.confirm !== form.next) e.confirm = '비밀번호가 일치하지 않습니다.'
  return e
}
