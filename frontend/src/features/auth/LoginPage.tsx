import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { usePageTitle } from '@/hooks/usePageTitle'
import { AuthError } from './authApi'
import { useAuth } from './authContext'
import { GOOGLE_CLIENT_ID, loadGoogleIdentity, waitForButtonFrame } from './googleIdentity'
import { isInAppBrowser, safeNextPath, SESSION_EXPIRED, TEMPORARY_ERROR } from './session'
import s from './auth.module.css'

/**
 * 로그인 (P-COM-010, F-AUTH-001). 회원 · 운영진 모두 여기서 Google 로 로그인한다 (관리자 아이디 · 비밀번호 로그인은 없앰).
 * - ?next=/teams/write : 로그인 뒤 보던 페이지로 돌아간다 (사이트 안 주소만)
 * - ?reason=expired : 1시간이 끝나 들어왔다는 안내
 * - ?done=tab : 작성 중이던 탭이 연 새 탭. 로그인하면 '이 탭을 닫고 돌아가세요' (원래 탭도 같이 로그인된다)
 * - 앱 안 브라우저(카카오톡 등)면 Google 버튼 대신 외부 브라우저 안내 (P-COM-011)
 * - 로그인 방식이 example(VITE_AUTH, 없으면 VITE_DATA_SOURCE 를 따름)이면 Google 대신 예시 계정 버튼
 * - 아래 안내에 개인정보 처리방침 링크 (F-COM-005 규칙 3: Google 로그인으로 받는 정보)
 */
export function LoginPage() {
  usePageTitle('로그인')
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNextPath(params.get('next'))
  const expired = params.get('reason') === 'expired'
  const fromTab = params.get('done') === 'tab'
  const inApp = useMemo(() => typeof navigator !== 'undefined' && isInAppBrowser(navigator.userAgent), [])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  // 이미 로그인한 상태로 오면 보던 페이지로
  useEffect(() => {
    if (auth.status === 'member' && !fromTab) navigate(next, { replace: true })
  }, [auth.status, fromTab, navigate, next])

  const run = async (key: string, login: () => Promise<unknown>) => {
    setBusy(key)
    setError(null)
    try {
      await login()
    } catch (e) {
      setError(e instanceof AuthError ? e.message : TEMPORARY_ERROR)
    } finally {
      setBusy(null)
    }
  }

  let body
  if (fromTab && auth.status === 'member') {
    body = (
      <p className={s.done} role="status">
        로그인했습니다. 이 탭을 닫고 작성하던 화면으로 돌아가면 이어서 저장할 수 있습니다.
      </p>
    )
  } else if (inApp) {
    body = <InAppGuide />
  } else if (auth.mode === 'google') {
    body = <GoogleSignIn busy={busy === 'google'} onCredential={(credential) => void run('google', () => auth.loginWithGoogle(credential))} />
  } else {
    body = (
      <section className={s.examples} aria-labelledby="example-login">
        <h2 id="example-login" className={s.subTitle}>
          예시 계정으로 로그인
        </h2>
        <p className={s.small}>예시 화면입니다. Google 로그인 대신 예시 계정으로 들어갑니다. 서버로 보내는 값은 없습니다.</p>
        <div className={s.exampleList}>
          {auth.examples.map((m) => (
            <button key={m.userId} type="button" className={s.exampleBtn} disabled={busy !== null} aria-busy={busy === m.userId || undefined} onClick={() => void run(m.userId, () => auth.loginAsExample(m.userId))}>
              {m.button}
              <span className={s.exampleNote}>{m.note}</span>
            </button>
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className={`container ${s.page}`}>
      <div className={s.card}>
        <p className={s.eyebrow}>회원 · 운영진</p>
        <h1 className={s.title}>로그인</h1>
        <p className={s.lead}>GDGoC DGU에 등록된 회원과 운영진은 Google 계정으로 로그인합니다.</p>

        {expired && !fromTab && (
          <p className={s.callout} role="note">
            {SESSION_EXPIRED}
          </p>
        )}
        {error && (
          <p className={s.alert} role="alert">
            {error}
          </p>
        )}

        {body}

        <ul className={s.notes}>
          <li>처음이라면 메일로 받은 초대 링크로 Google 계정을 먼저 연결해 주세요.</li>
          <li>로그인은 1시간 동안 유지됩니다. 1시간이 지나면 다시 로그인해야 합니다.</li>
          <li>
            로그인하면 Google 계정 고유 식별자와 로그인 이메일을{' '}
            <Link className="link-text" to="/privacy">
              개인정보 처리방침
            </Link>
            에 따라 처리합니다.
          </li>
        </ul>
        <Link className="link" to="/">
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}

/** Google 이 그려 주는 로그인 버튼. 클라이언트 ID 가 없거나 스크립트를 못 받으면 안내 한 줄 */
function GoogleSignIn({ onCredential, busy }: { onCredential: (credential: string) => void; busy: boolean }) {
  const slot = useRef<HTMLDivElement>(null)
  const callback = useRef(onCredential)
  useEffect(() => {
    callback.current = onCredential
  }, [onCredential])
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    let alive = true
    loadGoogleIdentity()
      .then((id) => {
        const el = slot.current
        if (!alive || !el) return
        id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (r) => callback.current(r.credential), ux_mode: 'popup', auto_select: false, cancel_on_tap_outside: true, context: 'signin', itp_support: true })
        el.replaceChildren()
        id.renderButton(el, { type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', logo_alignment: 'left', width: 320, locale: 'ko' })
        // 버튼 iframe 이 준비되면 보인다 (그 전의 임시 버튼은 CSP 때문에 크게 그려져서 숨김)
        return waitForButtonFrame(el).then(() => {
          if (alive) setState('ready')
        })
      })
      .catch(() => {
        if (alive) setState('failed')
      })
    return () => {
      alive = false
    }
  }, [])

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className={s.alert} role="alert">
        Google 로그인 설정이 아직 없습니다. 운영진에게 알려 주세요.
        {import.meta.env.DEV && <span className={s.small}> (개발: .env.local 에 VITE_GOOGLE_CLIENT_ID)</span>}
      </p>
    )
  }
  return (
    <div className={s.google}>
      <div ref={slot} className={s.googleSlot} data-ready={state === 'ready' || undefined} aria-busy={busy || undefined} />
      {state === 'loading' && (
        <p className={s.small} role="status">
          Google 로그인 버튼을 불러오는 중입니다
        </p>
      )}
      {state === 'failed' && (
        <p className={s.alert} role="alert">
          Google 로그인 버튼을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}
      {busy && (
        <p className={s.small} role="status">
          로그인하는 중입니다
        </p>
      )}
    </div>
  )
}

/**
 * 외부 브라우저 안내 (P-COM-011). 앱 안 브라우저에서는 Google 이 로그인을 막는다.
 * 카카오톡은 외부 브라우저로 여는 주소(kakaotalk://web/openExternal)를 지원해서 버튼을 하나 더 준다.
 */
function InAppGuide() {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' ? window.location.href : ''
  const kakao = typeof navigator !== 'undefined' && /KAKAOTALK/i.test(navigator.userAgent)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <section className={s.inApp} aria-labelledby="in-app-title">
      <h2 id="in-app-title" className={s.subTitle}>
        다른 브라우저에서 열어 주세요
      </h2>
      <p>카카오톡 · 인스타그램 같은 앱 안에서 연 화면에서는 Google이 로그인을 막습니다. 메뉴의 &lsquo;다른 브라우저로 열기&rsquo;를 누르거나, 아래 주소를 복사해 Chrome · Safari에 붙여 넣어 주세요.</p>
      <p className={s.url}>{url}</p>
      <div className="btn-row">
        {kakao && (
          <a className="btn-primary btn-sm" href={`kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`}>
            외부 브라우저로 열기
          </a>
        )}
        <button type="button" className="btn-secondary btn-sm" onClick={() => void copy()}>
          주소 복사
        </button>
      </div>
      {copied && (
        <p className={s.small} role="status">
          주소를 복사했습니다.
        </p>
      )}
    </section>
  )
}
