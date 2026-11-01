import { useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PLACE_BY_ID } from '@/config/places'
import { SITE } from '@/config/site'
import { EXAMPLE_ACCOUNTS, type ExampleAccount } from '../data/common/accounts'
import { errorMessage, isAdminRepoError, type AdminErrorCode } from '../data/common/errors'
import { useResetExampleData } from '../data/useAdminData'
import { Button, StatusBadge, TextField, useConfirm, useToast } from '../ui'
import { IconErrorMark } from '../ui/icons'
import { useAdminTitle } from '../ui/useAdminTitle'
import { useAdminAuth } from './authContext'
import { Redirect } from '../shell/Redirect'
import { safeReturnPath } from './returnPath'
import s from './login.module.css'

const RESET_HINT: Partial<Record<AdminErrorCode, string>> = {
  RATE_LIMITED: "예시 화면에서는 아래 '예시 데이터 처음으로'를 누르면 바로 풀립니다.",
  LOCKED: "예시 화면에서는 아래 '예시 데이터 처음으로'를 누르면 바로 풀립니다.",
}

/**
 * 관리자 로그인 (P-ACM-01, F-ACM-001).
 * - 예시 화면임을 맨 위에 밝히고, 예시 계정 버튼으로 바로 들어간다
 * - 아이디 · 비밀번호 입력은 명세 흐름(틀림 · 비활성 · 5회 15분 · 잠김)을 보여 주려고 둔다. 예시 계정과만 비교하고 저장 · 전송하지 않는다
 * - 로그인 상태로 오면 대시보드(또는 원래 가려던 주소)로
 */
export function LoginPage() {
  useAdminTitle('로그인')
  const auth = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const target = safeReturnPath((location.state as { from?: unknown } | null)?.from)
  const confirm = useConfirm()
  const toast = useToast()
  const reset = useResetExampleData()

  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  if (auth.status === 'signedIn') return <Redirect to={target} />

  const enter = async (id: string, pw: string, key: string) => {
    setBusy(key)
    setError(null)
    try {
      await auth.login({ loginId: id, password: pw })
      setPassword('')
      navigate(target, { replace: true })
    } catch (e) {
      setPassword('')
      setError({ message: errorMessage(e), hint: isAdminRepoError(e) ? RESET_HINT[e.code] : undefined })
      if (key === 'form') passwordRef.current?.focus()
    } finally {
      setBusy(null)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!loginId.trim() || !password) {
      setError({ message: '아이디와 비밀번호를 입력해 주세요.' })
      return
    }
    void enter(loginId, password, 'form')
  }

  const onReset = async () => {
    const ok = await confirm({ title: '예시 데이터를 처음으로 되돌릴까요?', body: '이 탭에서 바꾼 내용과 로그인 실패 기록이 모두 처음 상태로 돌아갑니다.', confirmLabel: '처음으로' })
    if (!ok) return
    await reset()
    setError(null)
    toast.success('예시 데이터를 처음 상태로 되돌렸습니다.')
  }

  return (
    <main id="admin-main" tabIndex={-1} className={s.page}>
      <div className={s.card}>
        <p className={s.brand} lang="en">
          {SITE.shortName} <span lang="ko">관리자</span>
        </p>
        <h1 className={s.title}>관리자 로그인</h1>

        <div className={s.notice} role="note">
          <span className={s.noticeTag}>
            <StatusBadge tone="neutral">예시 화면 · 예시 데이터</StatusBadge>
          </span>
          <p>예시 화면입니다. 입력한 값은 서버로 보내지 않고 이 브라우저 안에서만 쓰입니다.</p>
        </div>

        <section aria-labelledby="example-accounts">
          <h2 id="example-accounts" className={s.sectionTitle}>
            예시 계정으로 들어가기
          </h2>
          <div className={s.accounts}>
            {EXAMPLE_ACCOUNTS.map((a: ExampleAccount) => (
              <button
                key={a.loginId}
                type="button"
                className={s.account}
                disabled={busy !== null}
                aria-busy={busy === a.loginId || undefined}
                aria-describedby={`note-${a.loginId}`}
                onClick={() => void enter(a.loginId, a.password, a.loginId)}
              >
                {a.button}
                <span id={`note-${a.loginId}`} className={s.accountNote}>
                  {a.note}
                </span>
              </button>
            ))}
          </div>
        </section>

        <p className={s.divider}>또는 아이디로 로그인</p>

        <form className={s.form} onSubmit={onSubmit} noValidate aria-describedby="login-hint">
          {error && (
            <div className={s.alert} role="alert">
              <p className={s.alertLine}>
                <IconErrorMark />
                {error.message}
              </p>
              {error.hint && <p className={s.alertHint}>{error.hint}</p>}
            </div>
          )}
          <TextField label="아이디" name="example-login-id" autoComplete="off" autoCapitalize="none" spellCheck={false} value={loginId} onChange={(e) => setLoginId(e.target.value)} />
          <TextField ref={passwordRef} label="비밀번호" name="example-login-password" type="password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" size="lg" block busy={busy === 'form'} disabled={busy !== null && busy !== 'form'}>
            로그인
          </Button>
          <p id="login-hint" className={s.hint}>
            예시 아이디 <code>lead-a</code> · <code>core-b</code> · <code>core-c</code>, 비밀번호 <code>example1234</code> (<code>core-c</code>는 임시 비밀번호 <code>temp1234</code>). 비활성 계정 <code>core-d</code>로는 '비활성화된 계정'
            안내를 볼 수 있습니다. 비밀번호를 5회 연속 틀리면 15분 동안 로그인할 수 없고, 그 뒤 다시 5회 틀리면 계정이 잠기는 규칙도 그대로 흉내 냅니다.
          </p>
        </form>

        <div className={s.foot}>
          <Link className="link" to={PLACE_BY_ID.about.path}>
            홈페이지로 돌아가기
          </Link>
          <button type="button" className={s.textButton} onClick={() => void onReset()}>
            예시 데이터 처음으로
          </button>
        </div>
      </div>
    </main>
  )
}
