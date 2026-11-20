/**
 * 로그인 (F-AUTH-001 Google 로그인, F-AUTH-007 권한). 백엔드 API-AUTH-001 · 002 · 003 의 모양을 따른다.
 * 관리 유형은 운영진(ADMIN) · 일반 회원(GENERAL) 두 가지다 (Lead · Core 는 둘 다 ADMIN).
 */
export type MemberRole = 'ADMIN' | 'GENERAL'

/** 로그인한 사람 (응답의 user) */
export interface AuthUser {
  userId: string
  name: string
  role: MemberRole
}

/**
 * 서버가 준 로그인 정보.
 * access token 은 브라우저 메모리에만 둔다 (저장소 · 쿠키에 쓰지 않음). refresh token 은 서버가 HttpOnly 쿠키로 준다 (자바스크립트로 못 읽음).
 */
export interface AuthSession {
  accessToken: string
  /** access token 이 끝나는 시각 (밀리초). 보통 15분 */
  accessExpiresAt: number
  /** 로그인한 때부터 1시간. 활동해도 늘어나지 않고, 지나면 다시 로그인해야 한다 */
  sessionExpiresAt: number
  user: AuthUser
}

/** 예시 화면(VITE_DATA_SOURCE 가 http 가 아닐 때)에서 Google 대신 고르는 예시 계정 */
export interface ExampleMember extends AuthUser {
  /** 로그인 화면 버튼 글자 */
  button: string
  /** 버튼 아래 한 줄 */
  note: string
}
