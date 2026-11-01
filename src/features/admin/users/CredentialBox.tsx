import { forwardRef, useId, useRef, useState } from 'react'
import { pinMailContent } from '../data/users/mail'
import { Button, formatDateTimeLong } from '../ui'
import { IconAlert } from '../ui/icons'
import s from './users.module.css'

/**
 * 발급한 임시 비밀번호 (F-AMB-008): 아이디 · 임시 비밀번호 · [복사] → '복사되었습니다.'
 * 팝업을 닫으면 다시 볼 수 없다. 예시 화면이라 비밀번호는 어디에도 저장하지 않는다 (화면에 한 번 보여 줄 뿐).
 * 복사 결과는 팝업 안 글로 알린다 (팝업이 열린 동안 바깥 토스트는 화면 읽기가 못 읽는다).
 */
export const CredentialBox = forwardRef<HTMLButtonElement, { loginId: string; password: string; title?: string }>(function CredentialBox({ loginId, password, title = '관리자 페이지 로그인 정보' }, copyRef) {
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('no clipboard')
      await navigator.clipboard.writeText(password)
      setMessage('복사되었습니다.')
    } catch {
      inputRef.current?.select()
      setMessage('복사하지 못했습니다. 선택된 비밀번호를 직접 복사해 주세요.')
    }
  }
  return (
    <section className={s.credential} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className={s.credentialTitle}>
        {title}
      </h3>
      <dl className={s.facts}>
        <div>
          <dt>아이디</dt>
          <dd className={s.mono}>{loginId}</dd>
        </div>
      </dl>
      <label htmlFor={`${id}-pw`} className={s.fieldLabel}>
        임시 비밀번호
      </label>
      <div className={s.copyRow}>
        <input ref={inputRef} id={`${id}-pw`} className={`${s.mono} ${s.readonlyInput}`} readOnly value={password} aria-describedby={`${id}-warn`} onFocus={(e) => e.currentTarget.select()} />
        <Button ref={copyRef} variant="secondary" onClick={() => void copy()} aria-label="임시 비밀번호 복사">
          복사
        </Button>
      </div>
      <p className={s.copyStatus} role="status">
        {message}
      </p>
      <p id={`${id}-warn`} className={s.warn}>
        <IconAlert />
        <span>
          이 팝업을 닫으면 임시 비밀번호를 다시 볼 수 없습니다. 다시 받으려면 Lead가 [비밀번호 초기화]를 해야 합니다. 첫 로그인 때 새 비밀번호로 바꿔야 합니다.
        </span>
      </p>
      <p className={s.note}>예시 화면이라 이 비밀번호는 어디에도 저장하지 않으며, 실제 로그인에는 쓸 수 없습니다.</p>
    </section>
  )
})

/** 보낸 PIN 안내 메일 내용 (F-AMB-011 1). 예시 화면에서 메일 대신 보여 준다 */
export function MailPreview({ to, name, studentId, kind, expiresAt }: { to: string; name: string; studentId: string; kind: 'setup' | 'reset'; expiresAt: string }) {
  const mail = pinMailContent({ name, studentId }, kind, expiresAt)
  return (
    <details className={s.mail}>
      <summary>보낸 안내 메일 보기 (예시)</summary>
      <div className={s.mailBody}>
        <dl className={s.facts}>
          <div>
            <dt>받는 주소</dt>
            <dd>{to}</dd>
          </div>
          <div>
            <dt>제목</dt>
            <dd>{mail.subject}</dd>
          </div>
        </dl>
        {mail.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <p className={s.mailLink}>
          <span className={s.fakeButton}>{mail.linkLabel}</span>
          <span>
            <span className="num">{formatDateTimeLong(mail.expiresAt)}</span>까지 (예시 링크라 누를 수 없습니다)
          </span>
        </p>
      </div>
    </details>
  )
}
