import type { AuthSession } from './types'

/**
 * 여러 탭이 로그인을 함께 쓰는 길 (F-AUTH-001 규칙 4: 한 탭만 갱신, 로그아웃도 함께).
 * - BroadcastChannel: 같은 사이트의 탭끼리만 말이 오간다. access token 도 이 길로만 건넨다 (저장소에 쓰지 않음)
 * - 새 탭이 열리면 'hello' → 이미 로그인한 탭이 로그인 정보를 건넨다 (refresh 를 또 부르지 않는다)
 * - 갱신은 Web Locks 로 한 탭씩: 자물쇠를 잡은 탭이 받은 결과를 다른 탭에 건네고, 다음 탭은 이미 새것이면 건너뛴다
 * 지원하지 않는 브라우저에서는 탭마다 따로 동작한다 (로그인 · 로그아웃은 그대로 된다).
 */
export type TabMessage =
  | { t: 'hello'; from: string }
  | { t: 'session'; session: AuthSession; to?: string }
  | { t: 'logout'; reason: 'user' | 'expired' | 'revoked' }

export interface TabSync {
  /** 이 탭의 이름 ('hello' 에 답할 때 받는 탭을 가린다) */
  readonly id: string
  /** 다른 탭과 말할 수 있는지 (못 하면 기다리지 않고 바로 refresh) */
  readonly supported: boolean
  post(message: TabMessage): void
  listen(fn: (message: TabMessage) => void): () => void
  close(): void
}

export const AUTH_CHANNEL = 'gdgoc-auth'
const REFRESH_LOCK = 'gdgoc-auth-refresh'

const randomId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

export function createTabSync(name = AUTH_CHANNEL): TabSync {
  const id = randomId()
  let channel: BroadcastChannel | null = null
  try {
    channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(name) : null
  } catch {
    channel = null
  }
  return {
    id,
    supported: channel !== null,
    post(message) {
      try {
        channel?.postMessage(message)
      } catch {
        // 닫힌 뒤에 보내면 무시
      }
    },
    listen(fn) {
      if (!channel) return () => {}
      const on = (e: MessageEvent<TabMessage>) => {
        if (e.data && typeof e.data === 'object' && 't' in e.data) fn(e.data)
      }
      channel.addEventListener('message', on)
      return () => channel?.removeEventListener('message', on)
    },
    close() {
      channel?.close()
      channel = null
    },
  }
}

/** 갱신을 한 탭씩 (Web Locks 가 없으면 그냥 한다) */
export function withRefreshLock(fn: () => Promise<void>): Promise<void> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  if (!locks?.request) return fn()
  return locks.request(REFRESH_LOCK, fn).then(() => undefined)
}
