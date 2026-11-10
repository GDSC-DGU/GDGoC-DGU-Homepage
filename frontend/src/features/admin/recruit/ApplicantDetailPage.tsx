import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { actorLabel, adminKeys, errorMessage, isAdminRepoError, useAdminRepos } from '../data'
import { currentLocked, currentMail, passedDocument } from '../data/recruit/rules'
import type { ApplicantDetail, FormQuestion } from '../data/recruit/types'
import { ButtonLink, EmptyState, PageHeader, Panel, formatDateTimeLong, useToast } from '../ui'
import { InterviewPanel } from './InterviewPanel'
import { MailFlowDialog } from './MailFlowDialog'
import { EmailDialog, ResultPanel } from './ResultPanel'
import { ScorePanel } from './ScorePanel'
import { Button, LockBadge, MailBadge, ResultBadge, TableBox } from './badges'
import { applicantIdFromPath, applicantsHref, useAction, type ApplicantLinkState } from './hooks'
import s from './recruit.module.css'

/**
 * 지원서 상세 (P-ARC-03, Figma 07-5-1 · 07-5-6, F-ARC-013~016 · 035 · 039).
 * 위: 학과 · 학번(가운데 가림) · 이메일 · 지원일 · 지금 결과. 왼쪽: 응답 전체(지원폼 질문 순서). 오른쪽: 자동 평가 점수 · 전형 결과 · 면접 일정. 아래: 처리 이력.
 * [지원자 목록]으로 돌아가면 직전 목록의 탭 · 검색어 · 정렬 · 페이지가 그대로다 (목록 상태를 주소로 넘김).
 */
export function ApplicantDetailPage() {
  const { pathname, state } = useLocation()
  const id = applicantIdFromPath(pathname) ?? ''
  const back = { to: applicantsHref((state as ApplicantLinkState | null)?.listSearch), label: '지원자 목록' }
  const repos = useAdminRepos()
  const detail = useQuery({ queryKey: adminKeys.section('recruit', 'applicant', id), queryFn: () => repos.recruit.getApplicant(id) })
  const form = useQuery({ queryKey: adminKeys.section('recruit', 'form'), queryFn: () => repos.recruit.getForm() })
  const criteria = useQuery({ queryKey: adminKeys.section('recruit', 'criteria'), queryFn: () => repos.recruit.getCriteria() })
  const a = detail.data

  if (detail.isError && !a) {
    return (
      <>
        <PageHeader back={back} title="지원서 상세" />
        <EmptyState
          title={isAdminRepoError(detail.error) && detail.error.code === 'NOT_FOUND' ? '지원서를 찾을 수 없습니다.' : '지원서를 불러오지 못했습니다.'}
          description={isAdminRepoError(detail.error) && detail.error.code === 'NOT_FOUND' ? '삭제되었거나 주소가 잘못되었을 수 있습니다.' : errorMessage(detail.error)}
          action={<ButtonLink to={back.to}>지원자 목록으로</ButtonLink>}
        />
      </>
    )
  }
  if (!a) {
    return (
      <>
        <PageHeader back={back} title="지원서 상세" />
        <p className={s.loading} role="status">
          지원서를 불러오는 중입니다…
        </p>
      </>
    )
  }
  return (
    <Detail
      key={a.id}
      a={a}
      back={back}
      questions={(form.data?.published ?? form.data?.draft)?.questions ?? []}
      criteriaVersion={criteria.data?.version ?? 0}
      criteriaReady={(criteria.data?.items.length ?? 0) > 0}
    />
  )
}

function Detail({
  a,
  back,
  questions,
  criteriaVersion,
  criteriaReady,
}: {
  a: ApplicantDetail
  back: { to: string; label: string }
  questions: FormQuestion[]
  criteriaVersion: number
  criteriaReady: boolean
}) {
  const repos = useAdminRepos()
  const history = useQuery({ queryKey: adminKeys.section('recruit', 'history', a.id), queryFn: () => repos.recruit.history(a.id) })
  const toast = useToast()
  const [emailOpen, setEmailOpen] = useState(false)
  const [mailBatch, setMailBatch] = useState<string | null>(null)
  const [mailOpen, setMailOpen] = useState(false)
  const resend = useAction(() => repos.recruit.resend({ applicantIds: [a.id] }))
  const mail = currentMail(a)

  const startResend = async () => {
    try {
      const b = await resend.run()
      setMailBatch(b.id)
      setMailOpen(true)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  // 지원폼 질문 순서대로 (F-ARC-013 1). 지금 양식에 없는 응답은 뒤에
  const known = new Set(questions.map((q) => q.id))
  const extra = Object.keys(a.answers).filter((k) => !known.has(k))

  return (
    <>
      <PageHeader back={back} title={a.name} meta={`지원 번호 ${a.no} · ${a.generation}기`} />

      <section className={s.facts} aria-label="지원자 정보">
        <dl className={s.factList}>
          <div>
            <dt>학과</dt>
            <dd>{a.department}</dd>
          </div>
          <div>
            <dt>학번</dt>
            <dd className="num">{a.maskedStudentId}</dd>
          </div>
          <div>
            <dt>이메일</dt>
            <dd className={s.breakAll}>{a.email}</dd>
          </div>
          <div>
            <dt>지원일</dt>
            <dd>{formatDateTimeLong(a.appliedAt)}</dd>
          </div>
          <div>
            <dt>지금 결과</dt>
            <dd className={s.inline}>
              <ResultBadge result={a.result} />
              {currentLocked(a) && <LockBadge />}
            </dd>
          </div>
          <div>
            <dt>처리자</dt>
            <dd>{a.processed ? `${actorLabel(a.processed.by)} · ${formatDateTimeLong(a.processed.at)}` : '-'}</dd>
          </div>
          <div>
            <dt>메일 상태</dt>
            <dd className={s.inline}>
              <MailBadge mail={mail} />
              {mail?.state === 'failed' && (
                <Button variant="secondary" size="xs" busy={resend.pending} onClick={() => void startResend()}>
                  재발송
                </Button>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <div className={s.detailGrid}>
        <div className={s.detailMain}>
          <Panel title="지원서 응답" description="지원폼 질문 순서대로 보여 줍니다. 학번은 가운데를 가립니다.">
            <dl className={s.answers}>
              {questions.map((q, i) => {
                const v = a.answers[q.id]
                return (
                  <div key={q.id} className={s.answer}>
                    <dt>
                      <span className={`num ${s.answerNo}`}>{i + 1}</span>
                      {q.title}
                      {q.required && <span className={s.reqMark}> (필수)</span>}
                    </dt>
                    <dd>
                      {v?.trim() ? <span className={s.answerText}>{v}</span> : <span className={s.muted}>(답하지 않음)</span>}
                      {q.id === 'q-email' && (
                        <Button variant="secondary" size="xs" className={s.answerAction} onClick={() => setEmailOpen(true)}>
                          이메일 수정
                        </Button>
                      )}
                    </dd>
                  </div>
                )
              })}
              {extra.map((k) => (
                <div key={k} className={s.answer}>
                  <dt>지금 양식에 없는 질문</dt>
                  <dd className={s.answerText}>{a.answers[k] || '(답하지 않음)'}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
        <div className={s.detailSide}>
          <ScorePanel a={a} criteriaVersion={criteriaVersion} criteriaReady={criteriaReady} />
          <ResultPanel a={a} onResend={() => void startResend()} />
          {passedDocument(a.result) && <InterviewPanel a={a} />}
        </div>
      </div>

      <Panel
        title="처리 이력"
        description="접수 · 점수 산정 · 결과 처리 · 메일 · 이메일 수정 · 잠금 해제 내역을 최신순으로 보여 줍니다. 이력은 수정 · 삭제할 수 없습니다."
        flush
        className={s.historyPanel}
      >
        {history.isError ? (
          <p className={s.panelMessage} role="alert">
            {errorMessage(history.error)}
          </p>
        ) : !history.data ? (
          <p className={s.panelMessage} role="status">
            처리 이력을 불러오는 중입니다…
          </p>
        ) : history.data.length === 0 ? (
          <EmptyState title="처리 이력이 없습니다." />
        ) : (
          <TableBox label="처리 이력">
            <table className={`${s.simpleTable} ${s.historyTable}`}>
              <caption className="visually-hidden">처리 이력 (최신순)</caption>
              <thead>
                <tr>
                  <th scope="col">시각</th>
                  <th scope="col">처리 주체</th>
                  <th scope="col">내용</th>
                  <th scope="col">메모 · 사유</th>
                </tr>
              </thead>
              <tbody>
                {history.data.map((h) => (
                  <tr key={h.id}>
                    <td className={`num ${s.nowrap}`}>{formatDateTimeLong(h.at)}</td>
                    <td className={s.nowrap}>{actorLabel(h.actor)}</td>
                    <th scope="row" className={s.historyContent}>
                      {h.content}
                    </th>
                    <td className={s.reasonCell}>{h.note ?? <span className={s.dash}>-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableBox>
        )}
      </Panel>

      {emailOpen && <EmailDialog a={a} open={emailOpen} onClose={() => setEmailOpen(false)} />}
      {mailOpen && (
        <MailFlowDialog
          open={mailOpen}
          batchId={mailBatch}
          onClose={() => setMailOpen(false)}
          onStarted={(bid) => {
            setMailBatch(bid)
          }}
        />
      )}
    </>
  )
}
