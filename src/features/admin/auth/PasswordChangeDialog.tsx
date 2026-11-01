import { useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { validatePasswordChange, type PasswordChangeForm } from '../data/auth/loginPolicy'
import { errorMessage, isAdminRepoError } from '../data/common/errors'
import { Button, Dialog, TextField, focusFirstInvalid, hasErrors, useToast } from '../ui'
import { useAdminAuth } from './authContext'
import s from './login.module.css'

/**
 * 비밀번호 변경 팝업 (P-ACM-04, F-ACM-002). 임시 비밀번호로 로그인하면 자동으로 열리고 닫을 수 없다 ([로그아웃]만).
 * 바꾸기 전에는 다른 관리자 메뉴를 쓸 수 없다: 팝업이 화면 전체를 막고(showModal), 틀은 본문을 그리지 않는다.
 * 예시 화면이라 새 비밀번호는 저장하지 않는다 (형식만 확인하고 '바꿨다'는 표시만 남김).
 */
export function PasswordChangeDialog({ open }: { open: boolean }) {
  const auth = useAdminAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const formRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState<PasswordChangeForm>({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof PasswordChangeForm, string>>>({})
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const set = (k: keyof PasswordChangeForm) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    const found = validatePasswordChange(form)
    setErrors(found)
    setFailure(null)
    if (hasErrors(found)) {
      requestAnimationFrame(() => focusFirstInvalid(formRef.current))
      return
    }
    setBusy(true)
    try {
      await auth.changePassword({ currentPassword: form.current, newPassword: form.next })
      setForm({ current: '', next: '', confirm: '' })
      toast.success('비밀번호를 바꿨습니다. 관리자 화면을 쓸 수 있습니다.')
      navigate('/admin', { replace: true })
    } catch (e) {
      if (isAdminRepoError(e) && e.fields) {
        setErrors(e.fields)
        requestAnimationFrame(() => focusFirstInvalid(formRef.current))
      } else setFailure(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    setLeaving(true)
    try {
      await auth.logout()
      navigate('/admin/login', { replace: true })
    } finally {
      setLeaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      dismissible={false}
      onClose={() => {}}
      size="sm"
      title="비밀번호 변경"
      description="임시 비밀번호로 로그인했습니다. 본인만 아는 비밀번호로 바꾼 뒤 관리자 화면을 쓸 수 있습니다."
      onSubmit={() => void submit()}
      footerStart={
        <Button variant="ghost" onClick={() => void logout()} busy={leaving} disabled={busy}>
          로그아웃
        </Button>
      }
      footer={
        <Button type="submit" busy={busy} disabled={leaving}>
          변경하고 시작하기
        </Button>
      }
    >
      <div ref={formRef} className={s.pwForm}>
        {failure && (
          <p className={s.alert} role="alert">
            {failure}
          </p>
        )}
        <TextField label="현재 비밀번호" type="password" autoComplete="off" required value={form.current} onChange={set('current')} error={errors.current} help="로그인할 때 쓴 임시 비밀번호" />
        <TextField label="새 비밀번호" type="password" autoComplete="off" required value={form.next} onChange={set('next')} error={errors.next} help="8자 이상, 영문과 숫자를 함께. 임시 비밀번호와 달라야 합니다." />
        <TextField label="새 비밀번호 확인" type="password" autoComplete="off" required value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <p className={s.pwNote}>예시 화면이라 새 비밀번호는 저장하지 않고 형식만 확인합니다. 다음에도 예시 비밀번호로 로그인합니다.</p>
      </div>
    </Dialog>
  )
}
