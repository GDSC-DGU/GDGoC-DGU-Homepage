import { useResetExampleData } from '../data/useAdminData'
import { useConfirm, useToast } from '../ui'
import s from './shell.module.css'

/**
 * '예시 화면 · 예시 데이터' 표시 (공개 사이트에도 보이는 관리자 화면이라 늘 보인다, BRIEF) + '예시 데이터 처음으로'.
 * 처음으로: 이 탭에서 바꾼 모든 예시 데이터를 seed 로 되돌린다. 로그인은 그대로.
 */
export function SampleData() {
  const confirm = useConfirm()
  const toast = useToast()
  const reset = useResetExampleData()
  const onReset = async () => {
    const ok = await confirm({
      title: '예시 데이터를 처음으로 되돌릴까요?',
      body: '이 탭에서 추가 · 수정 · 삭제한 내용이 모두 처음 상태로 돌아갑니다. 로그인은 그대로 유지됩니다.',
      confirmLabel: '처음으로',
    })
    if (!ok) return
    await reset()
    toast.success('예시 데이터를 처음 상태로 되돌렸습니다.')
  }
  return (
    <div className={s.sample}>
      <p className={s.sampleTag}>예시 화면 · 예시 데이터</p>
      <p className={s.sampleText}>서버 없이 이 탭 안에서만 바뀝니다. 탭을 닫으면 처음으로 돌아갑니다.</p>
      <button type="button" className={s.sampleReset} onClick={() => void onReset()}>
        예시 데이터 처음으로
      </button>
    </div>
  )
}
