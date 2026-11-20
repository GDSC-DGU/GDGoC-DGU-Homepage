import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createAuthApi, isSignedOutError, type AuthApi } from './authApi'
import { AuthContext, type AuthValue } from './authContext'
import { AuthNotice, type Notice } from './AuthNotice'
import { loginPath, newerSession, REFRESH_EARLY_MS, SESSION_WARNING, sessionTimers } from './session'
import { createTabSync, withRefreshLock, type TabSync } from './tabSync'
import type { AuthSession } from './types'

/** 새 탭이 다른 탭의 로그인 정보를 기다리는 시간. 답이 없으면 refresh token 으로 되찾는다 */
const HELLO_WAIT_MS = 200

const HOLD_EXPIRED = '로그인 시간(1시간)이 끝났어요. 작성 중인 내용은 그대로 있어요. 새 탭에서 다시 로그인하면 이어서 저장할 수 있어요.'

interface Props {
  children: ReactNode
  /** 테스트 · 미리보기에서 바꿔 끼운다. 없으면 .env 에 맞는 것 (createAuthApi) */
  api?: AuthApi
  /** 라우터 밖에 있으므로 주소 이동 · 지금 주소 · 링크 주소를 받는다 (main.tsx 가 router 로 넘긴다) */
  navigate: (to: string) => void
  currentPath: () => string
  toHref: (to: string) => string
}

/**
 * 로그인 상태 (F-AUTH-001 · F-COM-001). 앱 전체(공개 사이트 · 관리자 화면)를 감싼다.
 * - 새로고침하면 다른 탭에서 받거나, 없으면 refresh token 쿠키로 되찾는다 (access token 은 메모리에만)
 * - access token 은 끝나기 1분 전에 새로 받는다 (한 탭만, tabSync)
 * - 로그인 55분: '5분 뒤 로그아웃돼요.' / 1시간: 로그아웃하고 로그인 화면으로
 *   작성 중(useHoldOnExpiry)이면 화면에 남기고(status 'expired') 안내만. 새 탭에서 로그인하면 이어서 저장할 수 있다
 * - 로그아웃 · 로그인은 다른 탭에도 바로 퍼진다
 */
export function AuthProvider({ children, api: given, navigate, currentPath, toHref }: Props) {
  const api = useMemo(() => given ?? createAuthApi(), [given])
  const [session, setSession] = useState<AuthSession | null>(null)
  const [status, setStatusState] = useState<AuthValue['status']>('loading')
  const [notice, setNotice] = useState<Notice | null>(null)
  /** 작성 중에 로그인이 끝났을 때(expired) 화면에 남겨 둘 사람 (토큰은 없음) */
  const [expiredUser, setExpiredUser] = useState<AuthSession['user'] | null>(null)
  const sessionRef = useRef<AuthSession | null>(null)
  // 렌더를 기다리지 않고 바로 읽는 상태 (작성 중 표시를 풀 때 · 타이머 안에서)
  const statusRef = useRef<AuthValue['status']>('loading')
  const setStatus = useCallback((st: AuthValue['status']) => {
    statusRef.current = st
    setStatusState(st)
  }, [])
  const syncRef = useRef<TabSync | null>(null)
  const holds = useRef(0)
  const noticeSeq = useRef(0)
  /** '5분 뒤 로그아웃돼요.'를 이미 띄운 로그인 (갱신해도 한 번만) */
  const warnedFor = useRef<number | null>(null)
  // 라우터 함수는 렌더마다 새로 와도 되게 ref 로
  const nav = useRef({ navigate, currentPath, toHref })
  useEffect(() => {
    nav.current = { navigate, currentPath, toHref }
  }, [navigate, currentPath, toHref])

  const show = useCallback((n: Omit<Notice, 'id'>) => setNotice({ ...n, id: ++noticeSeq.current }), [])
  const closeNotice = useCallback(() => setNotice(null), [])

  const adopt = useCallback((s: AuthSession) => {
    const next = newerSession(sessionRef.current, s)
    // 작성 중에 끝났다가 다른 탭에서 다시 로그인함: 만료 안내를 바꿔 준다
    if (statusRef.current === 'expired') show({ text: '다시 로그인했어요. 이어서 저장할 수 있어요.', tone: 'info' })
    sessionRef.current = next
    setSession(next)
    setExpiredUser(null)
    setStatus('member')
  }, [setStatus, show])

  const clear = useCallback(() => {
    sessionRef.current = null
    setSession(null)
    setExpiredUser(null)
    setStatus('guest')
  }, [setStatus])

  /** 로그인이 끝났을 때 (시간 만료 · 서버가 무효화). broadcast: 다른 탭에도 알릴지 */
  const ended = useCallback(
    (reason: 'expired' | 'revoked', message: string | null, broadcast: boolean) => {
      const was = sessionRef.current
      if (!was) return
      if (broadcast) {
        syncRef.current?.post({ t: 'logout', reason })
        void api.logout(null)
      }
      if (holds.current > 0) {
        // 작성 중: 화면은 그대로 두고 토큰만 버린다. 새 탭에서 로그인하면 이 탭도 다시 member 가 된다
        sessionRef.current = null
        setSession(null)
        setExpiredUser(was.user)
        setStatus('expired')
        show({ text: message && reason === 'revoked' ? message : HOLD_EXPIRED, tone: 'warn', sticky: true, action: { label: '새 탭에서 로그인', href: nav.current.toHref(loginPath('/', { done: 'tab' })), newTab: true } })
        return
      }
      clear()
      if (reason === 'expired') {
        setNotice(null)
        nav.current.navigate(loginPath(nav.current.currentPath(), { reason: 'expired' }))
      } else if (message) show({ text: message, tone: 'warn', sticky: true })
    },
    [api, clear, show, setStatus],
  )

  // 처음: 다른 탭에 묻고, 답이 없으면 refresh token 으로 되찾기. 다른 탭의 로그인 · 로그아웃 받기
  useEffect(() => {
    const sync = createTabSync()
    syncRef.current = sync
    let settled = false
    const off = sync.listen((m) => {
      if (m.t === 'hello') {
        const s = sessionRef.current
        if (s) sync.post({ t: 'session', session: s, to: m.from })
      } else if (m.t === 'session') {
        if (m.to && m.to !== sync.id) return
        if (m.session.sessionExpiresAt <= Date.now()) return
        settled = true
        adopt(m.session)
      } else if (m.t === 'logout') {
        settled = true
        if (m.reason === 'user') {
          if (sessionRef.current) clear()
        } else ended(m.reason, null, false)
        // 아직 되찾는 중이던 탭: 기다리지 않고 로그인 전으로
        if (statusRef.current === 'loading') clear()
      }
    })
    sync.post({ t: 'hello', from: sync.id })
    const timer = window.setTimeout(
      () => {
        if (settled) return
        void withRefreshLock(async () => {
          if (settled || sessionRef.current) return
          try {
            const s = await api.refresh(null)
            adopt(s)
            sync.post({ t: 'session', session: s })
          } catch {
            // 로그인이 없거나(401) 서버에 닿지 못함: 로그인 전으로 둔다
            if (!sessionRef.current) clear()
          }
        })
      },
      sync.supported ? HELLO_WAIT_MS : 0,
    )
    return () => {
      window.clearTimeout(timer)
      off()
      sync.close()
      if (syncRef.current === sync) syncRef.current = null
    }
  }, [api, adopt, clear, ended])

  const refreshNow = useCallback(async () => {
    await withRefreshLock(async () => {
      const cur = sessionRef.current
      // 다른 탭이 방금 새로 받아 건네줬으면 건너뛴다
      if (!cur || cur.accessExpiresAt - Date.now() > REFRESH_EARLY_MS) return
      try {
        const s = await api.refresh(cur.accessToken)
        adopt(s)
        syncRef.current?.post({ t: 'session', session: s })
      } catch (e) {
        // 비활성화 · 관리 유형 변경 등으로 서버가 로그인을 끝냈으면 바로 로그아웃 (F-AUTH-001 규칙 7).
        // 서버에 닿지 못한 것이면 그대로 둔다 (1시간이 되면 어차피 끝난다)
        if (isSignedOutError(e)) ended('revoked', e instanceof Error ? e.message : null, true)
      }
    })
  }, [api, adopt, ended])

  // 로그인 정보가 바뀔 때마다: 갱신 · 55분 예고 · 1시간 만료 시각을 다시 건다
  useEffect(() => {
    if (!session) return
    const { refreshIn, warnIn, endIn } = sessionTimers(session, Date.now())
    const ids: number[] = []
    if (refreshIn !== null && refreshIn < endIn) ids.push(window.setTimeout(() => void refreshNow(), refreshIn))
    if (warnIn < endIn && warnedFor.current !== session.sessionExpiresAt) {
      ids.push(
        window.setTimeout(() => {
          warnedFor.current = session.sessionExpiresAt
          show({ text: SESSION_WARNING, tone: 'warn', sticky: true })
        }, warnIn),
      )
    }
    ids.push(window.setTimeout(() => ended('expired', null, true), endIn))
    // 뒤에 있던 탭은 시계가 늦게 갈 수 있다: 다시 보일 때 한 번 더 확인
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !sessionRef.current) return
      if (sessionRef.current.sessionExpiresAt <= Date.now()) ended('expired', null, true)
      else if (sessionRef.current.accessExpiresAt - Date.now() <= REFRESH_EARLY_MS) void refreshNow()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      ids.forEach((id) => window.clearTimeout(id))
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [session, refreshNow, show, ended])

  const signedIn = useCallback(
    (s: AuthSession) => {
      adopt(s)
      setNotice(null)
      syncRef.current?.post({ t: 'session', session: s })
      return s
    },
    [adopt],
  )

  const logout = useCallback(async () => {
    const cur = sessionRef.current
    clear()
    setNotice(null)
    syncRef.current?.post({ t: 'logout', reason: 'user' })
    await api.logout(cur?.accessToken ?? null)
    nav.current.navigate('/')
  }, [api, clear])
  const notify = useCallback((text: string) => show({ text, tone: 'info' }), [show])
  const getAccessToken = useCallback(() => sessionRef.current?.accessToken ?? null, [])

  /** 작성 중 표시. 상태가 바뀔 때마다 다시 걸리지 않게 늘 같은 함수다 */
  const holdOnExpiry = useCallback(() => {
    holds.current += 1
    let released = false
    return () => {
      if (released) return
      released = true
      holds.current -= 1
      // 작성을 그만두면(저장 · 취소 · 떠남) 그때 로그아웃 상태로
      if (holds.current === 0 && statusRef.current === 'expired') clear()
    }
  }, [clear])

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user: session?.user ?? (status === 'expired' ? expiredUser : null),
      isAdmin: (session?.user ?? (status === 'expired' ? expiredUser : null))?.role === 'ADMIN',
      mode: api.mode,
      examples: api.examples,
      loginWithGoogle: async (idToken) => signedIn(await api.loginWithGoogle(idToken)),
      loginAsExample: async (userId) => signedIn(await api.loginAsExample(userId)),
      logout,
      getAccessToken,
      notify,
      holdOnExpiry,
    }),
    [status, session, expiredUser, api, signedIn, logout, getAccessToken, notify, holdOnExpiry],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthNotice notice={notice} onClose={closeNotice} />
    </AuthContext.Provider>
  )
}
