import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { actorLabel, adminKeys, errorMessage, useAdminRepos } from '../data'
import { batchCounts } from '../data/recruit/rules'
import { MAIL_RESULTS, type MailBatch, type MailResult, type MailTarget } from '../data/recruit/types'
import { adminPath } from '../screens'
import { Checkbox, Dialog, StatusBadge, formatDateTimeLong, formatNumber, useConfirm } from '../ui'
import { Button, DialogError, ResultBadge, TableBox } from './badges'
import { keepPrevious, useAction } from './hooks'
import s from './recruit.module.css'

export interface MailFlowProps {
  open: boolean
  onClose: () => void
  /** 보고 있는 발송 작업. 없으면 새 일괄 발송을 고르는 화면 (P-ARC-04) */
  batchId: string | null
  /** 발송 · 재발송을 시작하면 그 작업 id */
  onStarted: (batchId: string) => void
}

/**
 * 이메일 일괄 발송 (P-ARC-04, F-ARC-018~020) → 보내는 중 → 발송 결과 (P-ARC-05, F-ARC-021~023) 를 한 팝업에서.
 * 발송은 예시 저장소 안에서 이어서 처리되므로 보내는 중에 팝업을 닫아도 계속된다 (F-ARC-020 6). 실제로 메일을 보내지 않는다.
 */
export function MailFlowDialog({ open, onClose, batchId, onStarted }: MailFlowProps) {
  const repos = useAdminRepos()
  const batch = useQuery({ queryKey: adminKeys.section('recruit', 'batch', batchId), queryFn: () => repos.recruit.getBatch(batchId!), enabled: open && !!batchId })
  const phase = !batchId ? 'compose' : !batch.data ? 'loading' : batch.data.status === 'sending' ? 'sending' : 'result'
  const title = phase === 'compose' ? '이메일 일괄 발송' : phase === 'result' ? '발송 결과' : '메일 보내는 중'
  const closeRef = useRef<HTMLButtonElement>(null)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={title}
      description={
        phase === 'compose'
          ? '전형 결과별 발송 대상과 템플릿을 확인하고 보냅니다. 예시 화면이라 실제로 메일을 보내지 않습니다.'
          : phase === 'sending'
            ? '팝업을 닫아도 발송은 계속됩니다. 끝나면 지원자 관리에 결과가 보입니다.'
            : undefined
      }
      footer={
        phase === 'compose' ? undefined : (
          <Button ref={closeRef} variant={phase === 'result' ? 'primary' : 'secondary'} onClick={onClose}>
            닫기
          </Button>
        )
      }
    >
      {phase === 'compose' && <Compose onCancel={onClose} onStarted={onStarted} />}
      {phase === 'loading' && (batch.isError ? <DialogError message={errorMessage(batch.error)} /> : <p role="status">발송 기록을 불러오는 중입니다…</p>)}
      {(phase === 'sending' || phase === 'result') && batch.data && <BatchView batch={batch.data} onStarted={onStarted} />}
    </Dialog>
  )
}

// ── P-ARC-04 고르기 ──

function Compose({ onCancel, onStarted }: { onCancel: () => void; onStarted: (id: string) => void }) {
  const repos = useAdminRepos()
  const confirm = useConfirm()
  const base = useId()
  const [excludeSent, setExcludeSent] = useState(true)
  const targets = useQuery({ queryKey: adminKeys.section('recruit', 'mailTargets', excludeSent), queryFn: () => repos.recruit.mailTargets(excludeSent), placeholderData: keepPrevious })
  const templates = useQuery({ queryKey: adminKeys.section('recruit', 'templates'), queryFn: () => repos.recruit.listTemplates() })
  const [pick, setPick] = useState<Partial<Record<MailResult, string>>>({})
  const [include, setInclude] = useState<Partial<Record<MailResult, boolean>>>({})
  const [preview, setPreview] = useState<{ result: MailResult; index: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const send = useAction(repos.recruit.sendBatch)

  const list = targets.data ?? []
  const byResult = (r: MailResult) => list.find((t) => t.result === r)
  const templateOf = (t: MailTarget) => pick[t.result] ?? t.defaultTemplateId ?? ''
  const included = (t: MailTarget) => t.count > 0 && (include[t.result] ?? true)
  const chosen = list.filter(included)
  const total = chosen.reduce((sum, t) => sum + t.count, 0)
  const missingTemplate = chosen.find((t) => !templateOf(t))

  const previewTarget = preview ? byResult(preview.result) : undefined
  const previewApplicant = previewTarget?.applicantIds[preview!.index]
  const previewTpl = previewTarget ? templateOf(previewTarget) : ''
  const mail = useQuery({
    queryKey: adminKeys.section('recruit', 'mailPreview', previewTpl, previewApplicant),
    queryFn: () => repos.recruit.mailPreview(previewTpl, previewApplicant),
    enabled: !!previewTpl && !!previewApplicant,
  })

  const start = async () => {
    setError(null)
    const summary = chosen.map((t) => `${t.result} ${t.count}명`).join(' · ')
    const ok = await confirm({
      title: `선택한 ${total}명에게 발송할까요?`,
      body: `${summary}. 발송에 성공한 지원자는 그 단계 결과가 잠기고, 실패한 지원자는 잠기지 않습니다. 발송 중에 팝업을 닫아도 발송은 계속됩니다.`,
      confirmLabel: '발송',
    })
    if (!ok) return
    try {
      const b = await send.run({ targets: chosen.map((t) => ({ result: t.result, templateId: templateOf(t) })), excludeSent })
      onStarted(b.id)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const noInterview = byResult('서류 합격')?.excludedNoInterview ?? 0
  const blocked = total === 0 ? '보낼 대상이 없습니다.' : missingTemplate ? `${missingTemplate.result} 템플릿을 골라 주세요.` : undefined

  return (
    <>
      <Checkbox
        label="이미 발송 완료된 지원자 제외"
        description="같은 결과 메일을 이미 받은 지원자는 빼고 보냅니다. 발송 실패 건은 대상에 포함합니다."
        checked={excludeSent}
        onChange={(e) => {
          setExcludeSent(e.target.checked)
          setPreview(null)
        }}
      />
      <TableBox label="결과별 발송 대상">
        <table className={s.simpleTable} aria-busy={targets.isFetching || undefined}>
          <caption className="visually-hidden">전형 결과별 발송 대상과 템플릿</caption>
          <thead>
            <tr>
              <th scope="col">보내기</th>
              <th scope="col">전형 결과</th>
              <th scope="col" className={s.numCol}>
                대상
              </th>
              <th scope="col">템플릿</th>
              <th scope="col">
                <span className="visually-hidden">미리보기</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {!targets.data
              ? MAIL_RESULTS.map((r) => (
                  <tr key={r}>
                    <td colSpan={5}>
                      <span className={s.skeletonLine} aria-hidden="true" />
                    </td>
                  </tr>
                ))
              : list.map((t) => {
                  const options = (templates.data ?? []).filter((x) => x.result === t.result)
                  const selectId = `${base}-${t.result}`
                  const on = included(t)
                  return (
                    <tr key={t.result}>
                      <td>
                        <label className={s.cellCheck}>
                          <input type="checkbox" checked={on} disabled={t.count === 0} aria-label={`${t.result} 보내기`} onChange={(e) => setInclude({ ...include, [t.result]: e.target.checked })} />
                        </label>
                      </td>
                      <th scope="row">
                        <ResultBadge result={t.result} />
                      </th>
                      <td className={s.numCol}>
                        <span className="num">{formatNumber(t.count)}</span>명{t.result === '서류 합격' && noInterview > 0 && <span className={s.cellNote}>면접 일정 미지정 {noInterview}명 제외</span>}
                      </td>
                      <td>
                        <label htmlFor={selectId} className="visually-hidden">
                          {t.result} 템플릿
                        </label>
                        <select
                          id={selectId}
                          className={s.cellSelect}
                          value={templateOf(t)}
                          disabled={!on}
                          onChange={(e) => {
                            setPick({ ...pick, [t.result]: e.target.value })
                            if (preview?.result === t.result) setPreview({ ...preview, index: 0 })
                          }}
                        >
                          {!templateOf(t) && <option value="">템플릿 선택</option>}
                          {options.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                              {o.isDefault ? ' (기본)' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <Button
                          variant="secondary"
                          size="xs"
                          aria-label={`${t.result} 메일 미리보기`}
                          aria-pressed={preview?.result === t.result}
                          disabledReason={t.count === 0 ? '발송 대상이 없습니다.' : !templateOf(t) ? '템플릿을 먼저 골라 주세요.' : undefined}
                          onClick={() => setPreview(preview?.result === t.result ? null : { result: t.result, index: 0 })}
                        >
                          미리보기
                        </Button>
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </TableBox>
      <p className={s.muted}>미정은 발송에서 제외합니다. 서류 합격은 면접 일정(일시 · 담당자)이 정해진 지원자에게만 보냅니다.</p>

      {preview && previewTarget && (
        <section className={s.mailPreview} aria-labelledby={`${base}-pv`}>
          <div className={s.mailPreviewHead}>
            <h3 id={`${base}-pv`} className={s.mailPreviewTitle}>
              미리보기 · {preview.result}
            </h3>
            <div className={s.pager} role="group" aria-label="미리볼 지원자">
              <Button variant="secondary" size="xs" disabledReason={preview.index === 0 ? '첫 번째 대상입니다.' : undefined} onClick={() => setPreview({ ...preview, index: preview.index - 1 })}>
                이전
              </Button>
              <span className="num" aria-live="polite">
                {preview.index + 1} / {previewTarget.count}
              </span>
              <Button
                variant="secondary"
                size="xs"
                disabledReason={preview.index >= previewTarget.count - 1 ? '마지막 대상입니다.' : undefined}
                onClick={() => setPreview({ ...preview, index: preview.index + 1 })}
              >
                다음
              </Button>
            </div>
          </div>
          {mail.data ? (
            <div className={s.mailBox}>
              <p className={s.mailTo}>받는 사람: {mail.data.to}</p>
              <p className={s.mailSubject}>{mail.data.subject}</p>
              <div className={s.mailBody}>{mail.data.body}</div>
            </div>
          ) : (
            <p role="status">미리보기를 만드는 중입니다…</p>
          )}
        </section>
      )}

      <DialogError message={error} />
      <div className={s.composeFoot}>
        <p className={s.composeTotal}>
          전체 <strong className="num">{formatNumber(total)}</strong>명
        </p>
        <div className={s.composeActions}>
          <Button variant="secondary" onClick={onCancel} disabled={send.pending}>
            취소
          </Button>
          <Button busy={send.pending} disabledReason={send.pending ? undefined : blocked} onClick={() => void start()}>
            {formatNumber(total)}명에게 발송
          </Button>
        </div>
      </div>
    </>
  )
}

// ── 보내는 중 · P-ARC-05 발송 결과 ──

function BatchView({ batch, onStarted }: { batch: MailBatch; onStarted: (id: string) => void }) {
  const repos = useAdminRepos()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const c = batchCounts(batch)
  const sending = batch.status === 'sending'
  const failures = batch.items.filter((i) => i.state === 'failed')
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const resend = useAction(repos.recruit.resend)

  // 보내는 중 ↔ 결과로 바뀌면 그 화면 제목으로 초점 (누른 버튼이 사라져 초점을 잃지 않게)
  useEffect(() => {
    headingRef.current?.focus()
  }, [sending])

  const again = async (applicantIds?: string[]) => {
    setError(null)
    setBusyId(applicantIds?.[0] ?? 'all')
    try {
      const b = await resend.run(applicantIds ? { batchId: batch.id, applicantIds } : { batchId: batch.id, failedOnly: true })
      onStarted(b.id)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  if (sending) {
    return (
      <div className={s.progressBox}>
        <h3 ref={headingRef} tabIndex={-1} className={s.batchHeading}>
          {batch.kind === 'resend' ? '실패 건 재발송' : '일괄 발송'} 중 · {formatNumber(c.processed)} / {formatNumber(c.requested)}명 처리
        </h3>
        <div
          className={s.progress}
          role="progressbar"
          aria-label="메일 발송 진행"
          aria-valuemin={0}
          aria-valuemax={c.requested}
          aria-valuenow={c.processed}
          aria-valuetext={`${c.requested}명 중 ${c.processed}명 처리`}
        >
          <span style={{ width: `${c.requested ? (c.processed / c.requested) * 100 : 0}%` }} />
        </div>
        <p className={s.muted}>
          성공 <span className="num">{c.succeeded}</span> · 실패 <span className="num">{c.failed}</span> · 팝업을 닫아도 발송은 계속됩니다.
        </p>
      </div>
    )
  }

  return (
    <div className={s.resultBox}>
      <h3 ref={headingRef} tabIndex={-1} className={s.batchHeading}>
        {batch.kind === 'resend' ? '실패 건 재발송' : '일괄 발송'}을 마쳤습니다
      </h3>
      <p className="visually-hidden" role="status">
        발송을 마쳤습니다. 요청 {c.requested}건, 성공 {c.succeeded}건, 실패 {c.failed}건.
      </p>
      <dl className={s.batchFacts}>
        <div>
          <dt>발송 시각</dt>
          <dd>{formatDateTimeLong(batch.finishedAt ?? batch.at)}</dd>
        </div>
        <div>
          <dt>발송 계정</dt>
          <dd>{actorLabel(batch.by)}</dd>
        </div>
      </dl>
      <ul className={s.statTiles} aria-label="발송 건수">
        <li>
          <span className={s.statLabel}>요청</span>
          <span className={`num ${s.statValue}`}>{formatNumber(c.requested)}</span>
        </li>
        <li>
          <span className={s.statLabel}>성공</span>
          <span className={`num ${s.statValue}`}>{formatNumber(c.succeeded)}</span>
        </li>
        <li data-tone={c.failed ? 'danger' : undefined}>
          <span className={s.statLabel}>실패</span>
          <span className={`num ${s.statValue}`}>{formatNumber(c.failed)}</span>
        </li>
      </ul>

      {failures.length === 0 ? (
        <p className={s.allSent}>
          <StatusBadge tone="success">모두 보냄</StatusBadge> 실패한 메일이 없습니다. 보낸 지원자의 결과는 잠겼습니다.
        </p>
      ) : (
        <>
          <div className={s.failHead}>
            <h4 className={s.failTitle}>발송 실패 {failures.length}건</h4>
            <Button variant="secondary" size="xs" busy={busyId === 'all'} disabled={!!busyId && busyId !== 'all'} onClick={() => void again()}>
              실패 건 모두 재발송 ({failures.length})
            </Button>
          </div>
          <TableBox label="발송 실패 목록">
            <table className={s.simpleTable}>
              <caption className="visually-hidden">발송 실패 목록</caption>
              <thead>
                <tr>
                  <th scope="col">이름</th>
                  <th scope="col">이메일</th>
                  <th scope="col">적용 결과</th>
                  <th scope="col">실패 사유</th>
                  <th scope="col">
                    <span className="visually-hidden">재발송</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {failures.map((f) => (
                  <tr key={f.applicantId}>
                    <th scope="row" className={s.nowrap}>
                      <Link className={s.nameLink} to={adminPath.applicant(f.applicantId)}>
                        {f.name}
                      </Link>
                    </th>
                    <td className={s.breakAll}>{f.email}</td>
                    <td>
                      <ResultBadge result={f.result} />
                    </td>
                    <td className={s.reasonCell}>{f.reason}</td>
                    <td>
                      <Button
                        variant="secondary"
                        size="xs"
                        aria-label={`${f.name} 재발송`}
                        busy={busyId === f.applicantId}
                        disabled={!!busyId && busyId !== f.applicantId}
                        onClick={() => void again([f.applicantId])}
                      >
                        재발송
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableBox>
          <p className={s.muted}>주소 오류는 이름을 눌러 지원서 상세에서 이메일을 고친 뒤 다시 보내 주세요. 같은 템플릿으로 다시 보냅니다.</p>
        </>
      )}
      <DialogError message={error} />
    </div>
  )
}
