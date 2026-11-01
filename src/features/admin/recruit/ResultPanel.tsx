import { useEffect, useRef, useState } from 'react'
import { useAdminActor } from '../auth/authContext'
import { actorLabel, canUnlockApplicantResult, errorMessage, isAdminRepoError, isEmail, useAdminRepos } from '../data'
import { currentMail, documentOf, interviewOf, kstDateTime, LOCKED_MESSAGE, stageOf } from '../data/recruit/rules'
import { STAGE_LABEL, type ApplicantDetail, type ApplicantResult, type MailRecord, type ResultStage } from '../data/recruit/types'
import { Dialog, Panel, RadioGroup, StatusBadge, TextArea, TextField, formatDateTimeLong, useConfirm, useToast } from '../ui'
import { IconLock } from '../ui/icons'
import { Button, DialogError, LockBadge, MailBadge, ResultBadge } from './badges'
import { useAction } from './hooks'
import s from './recruit.module.css'

type DocPick = '미정' | '서류 합격' | '서류 불합격'
type IntPick = '미정' | '최종 합격' | '면접 불합격'

/** 단계의 메일 한 줄 */
function StageMail({ mail, onResend, resendable }: { mail: MailRecord | undefined; onResend: () => void; resendable: boolean }) {
  if (!mail)
    return (
      <p className={s.stageMail}>
        결과 메일 <MailBadge mail={null} />
      </p>
    )
  return (
    <div className={s.stageMail}>
      <p className={s.inline}>
        {mail.result} 메일 <MailBadge mail={mail} />
        <span className={s.sub}>
          {formatDateTimeLong(mail.at)} · 「{mail.templateName}」 · {mail.to}
        </span>
      </p>
      {mail.state === 'failed' && (
        <p className={s.failReason}>
          실패 사유: {mail.failReason}
          {resendable && (
            <Button variant="secondary" size="xs" onClick={onResend}>
              재발송
            </Button>
          )}
        </p>
      )}
    </div>
  )
}

/**
 * 전형 결과 처리 (F-ARC-014): 서류 전형(서류 합격 / 서류 불합격) · 면접 전형(최종 합격 / 면접 불합격, 서류 합격자만) + 메모.
 * 각 단계는 결과 메일이 발송 완료되면 잠긴다 ('결과 메일이 발송되어 결과가 잠겼어요.'), 발송 실패는 잠기지 않는다.
 * 잠금 해제는 Lead 만 (P-ARC-08, Core 에게는 버튼 비활성).
 */
export function ResultPanel({ a, onResend }: { a: ApplicantDetail; onResend: () => void }) {
  const repos = useAdminRepos()
  const actor = useAdminActor()
  const toast = useToast()
  const confirm = useConfirm()
  const savedDoc: DocPick = documentOf(a.result) ?? '미정'
  const savedInt: IntPick = interviewOf(a.result) ?? '미정'
  const [doc, setDoc] = useState<DocPick>(savedDoc)
  const [int, setInt] = useState<IntPick>(savedInt)
  const [memo, setMemo] = useState('')
  const [unlockOpen, setUnlockOpen] = useState(false)
  // 잠금을 풀면 [잠금 해제] 버튼이 사라지므로 풀린 단계의 첫 선택지로 초점을 옮긴다
  const focusStage = useRef<ResultStage | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const lockedDoc = a.locked.document
  const lockedInt = a.locked.interview
  useEffect(() => {
    const stage = focusStage.current
    if (!stage || (stage === 'document' ? lockedDoc : lockedInt)) return
    focusStage.current = null
    formRef.current?.querySelector<HTMLElement>(`[data-stage="${stage}"] input:not([disabled])`)?.focus()
  }, [lockedDoc, lockedInt])
  // 저장된 결과가 바뀌면(일괄 변경 · 다른 탭) 고른 값도 맞춘다
  const [seen, setSeen] = useState(a.result)
  if (seen !== a.result) {
    setSeen(a.result)
    setDoc(savedDoc)
    setInt(savedInt)
  }
  const save = useAction(async () => {
    const docChange = doc !== savedDoc
    // 서류를 먼저 바꾸면 면접은 '미정'에서 시작한다. 메모는 첫 처리에 남긴다
    if (docChange) await repos.recruit.setResult(a.id, { stage: 'document', result: doc, memo })
    const intBase: IntPick = docChange ? '미정' : savedInt
    if (doc === '서류 합격' && int !== intBase) await repos.recruit.setResult(a.id, { stage: 'interview', result: int, memo: docChange ? '' : memo })
  })

  const unlock = canUnlockApplicantResult(actor)
  const docChanged = doc !== savedDoc
  const intChanged = doc === '서류 합격' && int !== savedInt
  const changed = docChanged || intChanged
  const interviewOpen = doc === '서류 합격'
  const mailStage = stageOf(a.result)
  const failedNow = currentMail(a)?.state === 'failed'
  const anyLocked = a.locked.document || a.locked.interview

  const submit = async () => {
    if (docChanged && a.interview && doc !== '서류 합격') {
      const ok = await confirm({
        title: '면접 일정을 해제할까요?',
        body: `서류 합격이 아닌 결과로 바꾸면 지정한 면접 일정(${kstDateTime(a.interview.startAt)})이 해제됩니다.`,
        confirmLabel: '결과 저장',
      })
      if (!ok) return
    }
    try {
      await save.run()
      setMemo('')
      const next: ApplicantResult = doc === '서류 합격' ? (int === '미정' ? '서류 합격' : int) : doc
      toast.success(`${a.name}의 결과를 ${next}(으)로 저장했습니다.`)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const stageBlock = (stage: ResultStage) => {
    const locked = a.locked[stage]
    const isDoc = stage === 'document'
    const disabledAll = locked || (!isDoc && !interviewOpen)
    return (
      <section className={s.stage} aria-labelledby={`stage-${stage}`} data-stage={stage} data-locked={locked || undefined}>
        <div className={s.stageHead}>
          <h3 id={`stage-${stage}`} className={s.stageTitle}>
            {STAGE_LABEL[stage]}
          </h3>
          {locked && <LockBadge />}
        </div>
        {locked && (
          <p className={s.lockLine}>
            <IconLock className={s.inlineIcon} />
            {LOCKED_MESSAGE}
          </p>
        )}
        {isDoc ? (
          <RadioGroup<DocPick>
            legend="결과"
            name={`doc-${a.id}`}
            options={(['미정', '서류 합격', '서류 불합격'] as const).map((v) => ({ value: v, label: v, disabled: locked }))}
            value={doc}
            onChange={(v) => {
              setDoc(v)
              if (v !== '서류 합격') setInt('미정')
              else if (savedDoc === '서류 합격') setInt(savedInt)
            }}
          />
        ) : (
          <RadioGroup<IntPick>
            legend="결과"
            name={`int-${a.id}`}
            options={(['미정', '최종 합격', '면접 불합격'] as const).map((v) => ({ value: v, label: v, disabled: disabledAll }))}
            value={interviewOpen ? int : null}
            help={!interviewOpen ? '면접 전형은 서류 합격자만 선택할 수 있습니다.' : undefined}
            onChange={setInt}
          />
        )}
        <StageMail mail={a.mail[stage]} resendable={failedNow && mailStage === stage} onResend={onResend} />
      </section>
    )
  }

  return (
    <Panel
      title="전형 결과"
      description={a.processed ? `마지막 처리 ${actorLabel(a.processed.by)} · ${formatDateTimeLong(a.processed.at)}` : '아직 처리하지 않았습니다.'}
      actions={
        anyLocked ? (
          <Button variant="secondary" size="xs" disabledReason={unlock.allowed ? undefined : unlock.reason} onClick={() => setUnlockOpen(true)}>
            잠금 해제
          </Button>
        ) : undefined
      }
    >
      <p className={s.currentResult}>
        지금 결과 <ResultBadge result={a.result} />
        {a.locked[mailStage ?? 'document'] && mailStage && <LockBadge />}
      </p>
      <form
        ref={formRef}
        className={s.resultForm}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        {stageBlock('document')}
        {stageBlock('interview')}
        <TextArea
          label="메모"
          rows={2}
          limit={500}
          value={memo}
          placeholder="예: 면접에서 협업 경험을 더 물어볼 것"
          help="처리 이력에 결과와 함께 남습니다 (선택)."
          onChange={(e) => setMemo(e.target.value)}
        />
        <p className={s.muted}>잠기기 전에 결과를 바꾸면 그 단계의 메일 상태가 '-'로 돌아갑니다. 서류 합격이 아닌 결과로 바꾸면 면접 일정은 해제됩니다.</p>
        <div className={s.formActions}>
          <Button type="submit" busy={save.pending} disabledReason={save.pending ? undefined : !changed ? '바뀐 결과가 없습니다.' : undefined}>
            결과 저장
          </Button>
        </div>
      </form>
      {unlockOpen && (
        <UnlockDialog
          a={a}
          open={unlockOpen}
          onClose={() => setUnlockOpen(false)}
          onUnlocked={(stage) => {
            focusStage.current = stage
            setUnlockOpen(false)
          }}
        />
      )}
    </Panel>
  )
}

/**
 * 결과 잠금 해제 (P-ARC-08, Figma 07-5-4, F-ARC-017): Lead 만. 잠긴 단계만 고를 수 있고 사유는 필수.
 * 이미 보낸 메일은 취소되지 않으며, 정정 메일 발송은 관리자가 판단한다.
 */
export function UnlockDialog({ a, open, onClose, onUnlocked }: { a: ApplicantDetail; open: boolean; onClose: () => void; onUnlocked: (stage: ResultStage) => void }) {
  const repos = useAdminRepos()
  const toast = useToast()
  const lockedStages = (['document', 'interview'] as const).filter((st) => a.locked[st])
  const [stage, setStage] = useState<ResultStage | null>(lockedStages.length === 1 ? lockedStages[0] : null)
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<{ stage?: string; reason?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const run = useAction(() => repos.recruit.unlockResult(a.id, { stage: stage!, reason }))

  const submit = async () => {
    const next = { stage: stage ? undefined : '해제할 단계를 골라 주세요.', reason: reason.trim() ? undefined : '해제 사유를 입력해 주세요.' }
    setErrors(next)
    if (next.stage || next.reason) return
    setError(null)
    try {
      await run.run()
      onUnlocked(stage!)
      toast.success(`${STAGE_LABEL[stage!]} 결과 잠금을 해제했습니다. 이제 결과를 다시 바꿀 수 있습니다. 이미 보낸 메일은 취소되지 않습니다.`)
    } catch (e) {
      if (isAdminRepoError(e) && e.fields?.reason) setErrors({ reason: e.fields.reason })
      setError(errorMessage(e))
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="md"
      title="결과 잠금 해제"
      description={`${a.name}의 잠긴 결과를 다시 바꿀 수 있게 합니다. 해제 · 재변경 내역과 사유는 처리 이력에 남습니다.`}
      onSubmit={() => void submit()}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={run.pending}>
            취소
          </Button>
          <Button type="submit" variant="danger" busy={run.pending}>
            잠금 해제
          </Button>
        </>
      }
    >
      <RadioGroup<ResultStage>
        legend="해제할 단계"
        name="unlock-stage"
        required
        direction="column"
        options={(['document', 'interview'] as const).map((st) => ({
          value: st,
          label: STAGE_LABEL[st],
          description: a.locked[st] ? `${a.mail[st]?.result ?? ''} 메일 발송 완료 · ${a.mail[st] ? formatDateTimeLong(a.mail[st]!.at) : ''}` : '잠기지 않은 단계',
          disabled: !a.locked[st],
        }))}
        value={stage}
        error={errors.stage}
        onChange={setStage}
      />
      <TextArea label="해제 사유" required rows={3} limit={300} value={reason} error={errors.reason} placeholder="예: 서류 결과를 잘못 골라 바로잡음" onChange={(e) => setReason(e.target.value)} />
      <p className={s.warnLine}>
        <StatusBadge tone="warning">알아 두기</StatusBadge>
        이미 보낸 메일은 취소되지 않습니다. 결과를 바꾼 뒤 정정 메일을 보낼지는 관리자가 판단합니다.
      </p>
      <DialogError message={error} />
    </Dialog>
  )
}

/** 지원자 이메일 수정 (F-ARC-016): 형식 검증, 변경 전 · 후 주소는 처리 이력에. 이후 발송 · 재발송에 새 주소를 쓴다 */
export function EmailDialog({ a, open, onClose }: { a: ApplicantDetail; open: boolean; onClose: () => void }) {
  const repos = useAdminRepos()
  const toast = useToast()
  const [email, setEmail] = useState(a.email)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const run = useAction(() => repos.recruit.updateEmail(a.id, email))
  const failed = currentMail(a)?.state === 'failed'

  const submit = async () => {
    if (!isEmail(email)) return setFieldError('이메일 형식이 올바르지 않습니다. 예: name@example.com')
    if (email.trim() === a.email) return setFieldError('지금 주소와 같습니다. 새 주소를 입력해 주세요.')
    setFieldError(null)
    try {
      await run.run()
      onClose()
      toast.success(`이메일을 ${email.trim()}(으)로 고쳤습니다.${failed ? ' 실패한 메일은 [재발송]으로 다시 보낼 수 있습니다.' : ''}`)
    } catch (e) {
      setFieldError(isAdminRepoError(e) && e.fields?.email ? e.fields.email : errorMessage(e))
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="이메일 수정"
      description="이후 결과 메일 발송 · 재발송에 새 주소를 씁니다. 변경 전 · 후 주소는 처리 이력에 남습니다."
      onSubmit={() => void submit()}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={run.pending}>
            취소
          </Button>
          <Button type="submit" busy={run.pending}>
            저장
          </Button>
        </>
      }
    >
      <TextField label="이메일" type="email" required autoComplete="off" value={email} error={fieldError} help={`지금 주소: ${a.email}`} onChange={(e) => setEmail(e.target.value)} />
    </Dialog>
  )
}
