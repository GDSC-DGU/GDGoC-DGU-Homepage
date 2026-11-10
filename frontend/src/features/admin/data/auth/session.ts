import type { StorageLike } from '../store'

/**
 * 로그인 상태 흉내: sessionStorage 에 '누가 로그인했는지(사용자 id)'만 둔다.
 * 비밀번호 · 입력값은 어디에도 저장하지 않는다. 탭을 닫으면 로그아웃.
 * (실제 서비스의 로그인 유지 방식 — 쿠키 · 토큰, 만료 시간 — 은 명세상 미정, F-ACM-001 8)
 */
export const ADMIN_SESSION_KEY = 'gdgoc-admin-example-session'

export interface AdminSession {
  userId: string
  /** 로그인한 시각 (밀리초) */
  since: number
}

export interface SessionStore {
  read(): AdminSession | null
  write(session: AdminSession): void
  clear(): void
}

export function createSessionStore(storage: StorageLike | null, key = ADMIN_SESSION_KEY): SessionStore {
  let memory: AdminSession | null = null
  return {
    read() {
      if (!storage) return memory
      try {
        const raw = storage.getItem(key)
        if (!raw) return null
        const s = JSON.parse(raw) as Partial<AdminSession>
        return typeof s.userId === 'string' && typeof s.since === 'number' ? { userId: s.userId, since: s.since } : null
      } catch {
        return null
      }
    },
    write(session) {
      memory = session
      try {
        storage?.setItem(key, JSON.stringify(session))
      } catch {
        // 저장소를 못 쓰면 메모리에만 (새로고침하면 다시 로그인)
      }
    },
    clear() {
      memory = null
      try {
        storage?.removeItem(key)
      } catch {
        // 무시
      }
    },
  }
}
