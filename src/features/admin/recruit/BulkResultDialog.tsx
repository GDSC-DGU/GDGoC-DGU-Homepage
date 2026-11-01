import { useState } from 'react'
import { errorMessage, useAdminRepos } from '../data'
import { planBulkResult } from '../data/recruit/rules'
import { APPLICANT_RESULTS, type ApplicantResult, type ApplicantRow, type BulkResultResponse } from '../data/recruit/types'
import { Dialog, RadioGroup } from '../ui'
import { Button, DialogError } from './badges'
import { useAction } from './hooks'
import s from './recruit.module.css'

/**
 * 결과 일괄 변경 (F-ARC-010): 결과를 고르면 적용될 인원과 제외될 인원 · 사유를 먼저 보여 주고 [변경]으로 확인한다.
 * 면접 불합격 · 최종 합격은 서류 합격자에게만, 잠긴 결과는 바꾸지 않고 제외 (서버가 다시 확인).
 */
export function BulkResultDialog({ open, rows, onClose, onDone }: { open: boolean; rows: ApplicantRow[]; onClose: () => void; onDone: (r: BulkResultResponse, result: ApplicantResult) => void }) {
  const repos = useAdminRepos()
  const [result, setResult] = useState<ApplicantResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const apply = useAction((r: ApplicantResult) =>
    repos.recruit.setResults(
      rows.map((x) => x.id),
      r,
    ),
  )
  const plan = result ? planBulkResult(rows, result) : null

  const submit = async () => {
    if (!result) return setError('바꿀 결과를 골라 주세요.')
    setError(null)
    try {
      onDone(await apply.run(result), result)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="md"
      title="결과 일괄 변경"
      description={`선택한 지원자 ${rows.length}명의 전형 결과를 한 번에 바꿉니다. 처리자와 처리 시각이 기록됩니다.`}
      onSubmit={() => void submit()}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={apply.pending}>
            취소
          </Button>
          <Button type="submit" busy={apply.pending} disabledReason={!result ? '바꿀 결과를 골라 주세요.' : plan && plan.apply.length === 0 ? '바꿀 수 있는 지원자가 없습니다.' : undefined}>
            {plan ? `${plan.apply.length}명 변경` : '변경'}
          </Button>
        </>
      }
    >
      <RadioGroup<ApplicantResult>
        legend="바꿀 결과"
        name="bulk-result"
        direction="column"
        options={APPLICANT_RESULTS.map((r) => ({ value: r, label: r, description: r === '면접 불합격' || r === '최종 합격' ? '서류 합격자에게만 적용됩니다.' : undefined }))}
        value={result}
        onChange={(r) => {
          setResult(r)
          setError(null)
        }}
      />
      {plan && (
        <div className={s.planBox} aria-live="polite">
          <p className={s.planLine}>
            적용 <strong className="num">{plan.apply.length}</strong>명 · 적용되지 않음 <strong className="num">{plan.excluded.length}</strong>명
          </p>
          {plan.excluded.length > 0 && (
            <ul className={s.planList}>
              {plan.excluded.map((x) => (
                <li key={x.applicant.id}>
                  {x.applicant.name} <span className={s.muted}>· {x.reason}</span>
                </li>
              ))}
            </ul>
          )}
          {plan.apply.some((a) => a.interview) && result !== '서류 합격' && result !== '최종 합격' && result !== '면접 불합격' && (
            <p className={s.muted}>서류 합격이 아닌 결과로 바뀌면 지정한 면접 일정은 해제됩니다.</p>
          )}
          <p className={s.muted}>메일 발송 전(발송 실패 포함)에 결과를 바꾸면 메일 상태가 '-'로 돌아갑니다.</p>
        </div>
      )}
      <DialogError message={error} />
    </Dialog>
  )
}
