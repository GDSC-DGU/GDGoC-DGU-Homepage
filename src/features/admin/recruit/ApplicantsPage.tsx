import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { actorLabel, adminKeys, errorMessage, useAdminRepos } from '../data'
import { batchCounts } from '../data/recruit/rules'
import type { ApplicantListQuery, ApplicantRow } from '../data/recruit/types'
import { adminPath } from '../screens'
import {
  BulkBar,
  DataTable,
  FilterTabs,
  PageHeader,
  Pagination,
  SearchBox,
  SelectField,
  StatusBadge,
  Toolbar,
  TotalCount,
  formatDate,
  formatDateTime,
  formatDateTimeLong,
  formatNumber,
  objectParticle,
  useConfirm,
  useToast,
  type Column,
} from '../ui'
import { BulkResultDialog } from './BulkResultDialog'
import { MailFlowDialog } from './MailFlowDialog'
import { RegisterDialog } from './RegisterDialog'
import { Button, LockBadge, MailBadge, ResultBadge, ScoreCell } from './badges'
import { keepPrevious, kstShort, RESULT_TABS, rowLocked, rowMail, useAction, useApplicantListParams, useOpened, type ApplicantLinkState, type ResultTab } from './hooks'
import s from './recruit.module.css'

/**
 * 지원자 관리 (P-ARC-02, Figma 07-5, F-ARC-006~012).
 * 지원일 최신순 10명씩: 번호 · 학과 · 이름 · 이메일 · 지원일 · 점수 · 전형 결과(서류 합격은 면접 일시) · 처리자 · 메일 상태.
 * 결과 탭(인원 수) · 검색(이름 · 학과 · 이메일, 탭 안에서) · 정렬(지원일 · 점수), 결과 일괄 변경 · 삭제, 실패 건 재발송,
 * [이메일 일괄 발송](P-ARC-04 · 05) · [합격자 사용자 등록](P-ARC-09). 목록 상태는 주소에 둔다 (상세에서 돌아와도 그대로).
 */
export function ApplicantsPage() {
  const repos = useAdminRepos()
  const toast = useToast()
  const confirm = useConfirm()
  const compact = useMediaQuery('(max-width: 1279px)')
  const params = useApplicantListParams()
  const query: ApplicantListQuery = { result: params.result === 'all' ? undefined : params.result, q: params.q || undefined, sort: params.sort, page: params.page }
  const list = useQuery({ queryKey: adminKeys.section('recruit', 'applicants', query), queryFn: () => repos.recruit.listApplicants(query), placeholderData: keepPrevious })
  const data = list.data

  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const listKey = JSON.stringify(query)
  const [selectedFor, setSelectedFor] = useState(listKey)
  if (selectedFor !== listKey) {
    // 거르기 · 검색 · 쪽이 바뀌면 고른 것을 비운다 (다른 쪽에서 고른 것을 모르고 바꾸지 않게)
    setSelectedFor(listKey)
    setSelected(new Set())
  }
  const headingRef = useRef<HTMLHeadingElement>(null)
  const focusList = () => requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }))

  // 서류 · 발송
  const bulk = useOpened<ApplicantRow[]>()
  const register = useOpened<null>()
  const mail = useOpened<null>()
  const [trackedBatch, setTrackedBatch] = useState<string | null>(null)
  const [viewBatch, setViewBatch] = useState<string | null>(null)
  const runningId = data?.sending?.batchId ?? null
  const watchId = trackedBatch ?? runningId
  const watched = useQuery({ queryKey: adminKeys.section('recruit', 'batch', watchId), queryFn: () => repos.recruit.getBatch(watchId!), enabled: !!watchId })
  const resend = useAction(repos.recruit.resend)
  const [dismissed, setDismissed] = useState<string | null>(null)

  // 팝업을 닫은 채 발송이 끝나면 토스트로 알린다
  const lastStatus = useRef<string | null>(null)
  useEffect(() => {
    const b = watched.data
    if (!b) return
    const key = `${b.id}:${b.status}`
    if (lastStatus.current && lastStatus.current !== key && lastStatus.current.startsWith(`${b.id}:sending`) && b.status === 'done' && !mail.state?.open) {
      const c = batchCounts(b)
      if (c.failed) toast.info(`메일 발송을 마쳤습니다. 성공 ${c.succeeded}건 · 실패 ${c.failed}건. [발송 결과 보기]에서 실패 건을 다시 보낼 수 있습니다.`)
      else toast.success(`메일 발송을 마쳤습니다. ${c.succeeded}건 모두 보냈습니다.`)
    }
    lastStatus.current = key
  }, [watched.data, mail.state?.open, toast])

  const rows = data?.items
  const selectedRows = (rows ?? []).filter((r) => selected.has(r.id))
  const counts = data?.counts

  const openMail = (batchId: string | null) => {
    setViewBatch(batchId)
    mail.open(null)
  }
  const startResend = async (applicantIds: string[]) => {
    try {
      const b = await resend.run({ applicantIds })
      setTrackedBatch(b.id)
      openMail(b.id)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const remove = async (targets: ApplicantRow[]) => {
    const many = targets.length > 1
    const ok = await confirm({
      title: many ? `선택한 ${targets.length}명의 지원자를 삭제할까요?` : `${targets[0].name}${objectParticle(targets[0].name)} 삭제할까요?`,
      body: '목록에서 빠지지만 실제로 지우지 않고 삭제 상태로 바꿉니다. 처리 이력은 남고, 삭제한 계정과 시각이 기록됩니다.',
      confirmLabel: '삭제',
      tone: 'danger',
    })
    if (!ok) return
    const mailed = targets.filter((t) => t.mail.document || t.mail.interview)
    if (mailed.length) {
      const again = await confirm({
        title: '메일을 받은 지원자도 삭제할까요?',
        body: `${mailed.map((m) => m.name).join(', ')}은 결과 메일 발송 이력이 있습니다. 삭제해도 이미 보낸 메일은 취소되지 않고, 지원자가 결과를 문의하면 목록에서 찾을 수 없습니다.`,
        confirmLabel: '그래도 삭제',
        tone: 'danger',
      })
      if (!again) return
    }
    try {
      const r = await repos.recruit.removeApplicants(targets.map((t) => t.id))
      setSelected(new Set())
      toast.success(`지원자 ${r.deleted}명을 삭제했습니다. 처리 이력은 남아 있습니다.`)
      focusList()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const linkState: ApplicantLinkState = { listSearch: params.search }
  const nameLink = (r: ApplicantRow) => (
    <Link className={s.nameLink} to={adminPath.applicant(r.id)} state={linkState}>
      {r.name}
    </Link>
  )
  const resultCell = (r: ApplicantRow) => (
    <span className={s.stack}>
      <span className={s.inline}>
        <ResultBadge result={r.result} />
        {rowLocked(r) && <LockBadge />}
      </span>
      {r.result === '서류 합격' &&
        (r.interview ? (
          <span className={s.sub}>
            면접 <span className="num">{kstShort(r.interview.startAt)}</span>
          </span>
        ) : (
          <StatusBadge tone="warning">면접 일정 미정</StatusBadge>
        ))}
    </span>
  )
  const processedCell = (r: ApplicantRow) =>
    r.processed ? (
      <span className={s.stack}>
        <span className={s.nowrap}>{actorLabel(r.processed.by)}</span>
        <span className={`${s.sub} num`}>{kstShort(r.processed.at)}</span>
      </span>
    ) : (
      <span className={s.dash} aria-label="처리 전">
        -
      </span>
    )
  const mailCell = (r: ApplicantRow) => {
    const m = rowMail(r)
    return (
      <span className={s.inline}>
        <MailBadge mail={m} />
        {m?.state === 'failed' && (
          <Button variant="secondary" size="xs" aria-label={`${r.name} 메일 재발송`} disabled={resend.pending} title={m.failReason ?? undefined} onClick={() => void startResend([r.id])}>
            재발송
          </Button>
        )}
      </span>
    )
  }
  const deleteButton = (r: ApplicantRow) => (
    <Button variant="secondary" size="xs" aria-label={`${r.name} 삭제`} onClick={() => void remove([r])}>
      삭제
    </Button>
  )
  const version = data?.criteriaVersion ?? 0

  const appliedCell = (r: ApplicantRow) => (
    <span className={s.stack}>
      <span className="num">{formatDate(r.appliedAt)}</span>
      <span className={`${s.sub} num`}>{formatDateTime(r.appliedAt).slice(11)}</span>
    </span>
  )
  const wide: Column<ApplicantRow>[] = [
    { key: 'no', header: '번호', cell: (r) => <span className="num">{r.no}</span>, width: '56px', align: 'end' },
    { key: 'department', header: '학과', cell: (r) => r.department, width: '136px' },
    {
      key: 'name',
      header: '이름 · 이메일',
      rowHeader: true,
      cell: (r) => (
        <span className={`${s.stack} ${s.nameCell}`}>
          {nameLink(r)}
          <span className={`${s.sub} ${s.breakAll}`}>{r.email}</span>
        </span>
      ),
    },
    { key: 'appliedAt', header: '지원일', cell: appliedCell, width: '104px' },
    { key: 'score', header: '점수', cell: (r) => <ScoreCell score={r.score} currentVersion={version} />, nowrap: true, width: '92px' },
    { key: 'result', header: '전형 결과', cell: resultCell, width: '148px' },
    { key: 'processed', header: '처리자', cell: processedCell, width: '132px' },
    { key: 'mail', header: '메일 상태', cell: mailCell, width: '120px' },
    { key: 'actions', header: '관리', hideHeader: true, cell: deleteButton, width: '72px' },
  ]
  const narrow: Column<ApplicantRow>[] = [
    {
      key: 'name',
      header: '지원자',
      rowHeader: true,
      cell: (r) => (
        <span className={s.stack}>
          <span className={s.inline}>
            <span className={`${s.sub} num`} aria-label={`번호 ${r.no}`}>
              {r.no}
            </span>
            {nameLink(r)}
          </span>
          <span className={s.sub}>{r.department}</span>
          <span className={`${s.sub} ${s.breakAll}`}>{r.email}</span>
          <span className={`${s.sub} num`}>지원 {formatDateTime(r.appliedAt)}</span>
        </span>
      ),
    },
    { key: 'score', header: '점수', cell: (r) => <ScoreCell score={r.score} currentVersion={version} />, nowrap: true },
    { key: 'result', header: '전형 결과', cell: resultCell },
    {
      key: 'processed',
      header: '처리자 · 메일',
      cell: (r) => (
        <span className={s.stack}>
          {r.processed ? processedCell(r) : <span className={s.sub}>처리 전</span>}
          <span className={s.inline}>
            <span className={s.sub}>메일</span>
            {mailCell(r)}
          </span>
        </span>
      ),
    },
    { key: 'actions', header: '관리', hideHeader: true, cell: deleteButton },
  ]

  const tabs = RESULT_TABS.map((t) => ({ value: t, label: t === 'all' ? '전체' : t, count: counts ? counts[t === 'all' ? '전체' : t] : undefined }))
  const failedCount = data?.failedMailCount ?? 0
  const sendingNow = data?.sending
  const tracked = watched.data && watched.data.id === watchId ? watched.data : null
  // 목록 응답(sending)과 발송 기록 중 먼저 바뀐 쪽을 따른다: 띠가 잠깐 사라졌다 나타나지 않게
  const stripSending = sendingNow ?? (tracked?.status === 'sending' ? { batchId: tracked.id, ...batchCounts(tracked) } : null)
  const finished = !stripSending && tracked && tracked.status === 'done' && trackedBatch === tracked.id && dismissed !== tracked.id ? tracked : null

  return (
    <>
      <PageHeader
        title="지원자 관리"
        description="접수된 지원서를 결과별로 보고, 결과를 처리하고, 결과 메일을 보냅니다. 점수는 AI 채점 참고 점수이며 합격 여부는 운영진이 정합니다."
        actions={
          <>
            <Button variant="secondary" onClick={() => register.open(null)}>
              합격자 사용자 등록
            </Button>
            <Button onClick={() => openMail(sendingNow ? sendingNow.batchId : null)}>{sendingNow ? '발송 진행 보기' : '이메일 일괄 발송'}</Button>
          </>
        }
      />

      {(stripSending || finished) && (
        // 하나의 띠: 보내는 중 → 끝남으로 바뀌어도 버튼이 그대로 남아 팝업을 닫으면 초점이 돌아온다
        <div className={s.strip} data-tone={!stripSending && finished && batchCounts(finished).failed ? 'danger' : undefined}>
          {stripSending ? <span className={s.spinnerDot} aria-hidden="true" /> : null}
          <span className="visually-hidden" role="status">
            {stripSending ? '메일을 보내는 중입니다.' : '메일 발송을 마쳤습니다.'}
          </span>
          {stripSending ? (
            <span>
              메일 보내는 중 · <span className="num">{stripSending.processed}</span> / <span className="num">{stripSending.requested}</span>명 처리. 다른 화면으로 가도 발송은 계속됩니다.
            </span>
          ) : (
            <span>
              방금 끝난 발송 ({formatDateTimeLong(finished!.finishedAt ?? finished!.at)}) · 요청 <span className="num">{batchCounts(finished!).requested}</span> · 성공{' '}
              <span className="num">{batchCounts(finished!).succeeded}</span> · 실패 <span className="num">{batchCounts(finished!).failed}</span>
            </span>
          )}
          <Button variant="secondary" size="xs" onClick={() => openMail(stripSending ? stripSending.batchId : finished!.id)}>
            {stripSending ? '진행 보기' : '발송 결과 보기'}
          </Button>
          {!stripSending && (
            <Button
              variant="ghost"
              size="xs"
              aria-label="방금 끝난 발송 알림 닫기"
              onClick={() => {
                setDismissed(finished!.id)
                focusList()
              }}
            >
              닫기
            </Button>
          )}
        </div>
      )}

      <h2 ref={headingRef} tabIndex={-1} className={s.listHeading}>
        지원자 목록
      </h2>
      <Toolbar
        start={
          <>
            <FilterTabs<ResultTab> label="전형 결과" options={tabs} value={params.result} onChange={(v) => params.set({ result: v, page: 1 })} />
            <SearchBox label="지원자 검색" placeholder="이름 · 학과 · 이메일" value={params.q} onSearch={(v) => params.set({ q: v, page: 1 })} width={240} />
          </>
        }
        end={
          <>
            <SelectField
              label="정렬"
              hideLabel
              className={s.sortField}
              options={[
                { value: 'appliedAt', label: '지원일 최신순' },
                { value: 'score', label: '점수 높은 순' },
              ]}
              value={params.sort}
              onChange={(e) => params.set({ sort: e.target.value as 'appliedAt' | 'score', page: 1 })}
            />
            <Button
              variant="secondary"
              busy={resend.pending}
              disabledReason={
                resend.pending ? undefined : failedCount === 0 ? "메일 상태가 '발송 실패'인 지원자가 없습니다." : sendingNow ? '메일을 보내는 중입니다. 끝난 뒤 다시 보낼 수 있습니다.' : undefined
              }
              onClick={() => void startResend(data?.failedMailIds ?? [])}
            >
              실패 건 재발송 ({failedCount})
            </Button>
          </>
        }
      />
      <div className={s.countRow}>
        <TotalCount total={data?.total ?? 0} unit="명" searching={!!params.q} />
        {params.sort === 'score' && <p className={s.muted}>점수 높은 순 · 분석 중 · 산정 실패는 맨 뒤</p>}
        <BulkBar count={selected.size} unit="명" onClear={() => setSelected(new Set())}>
          <Button variant="secondary" size="xs" onClick={() => bulk.open(selectedRows)}>
            결과 일괄 변경
          </Button>
          <Button variant="secondary" size="xs" onClick={() => void remove(selectedRows)}>
            선택 삭제
          </Button>
        </BulkBar>
      </div>

      <DataTable
        caption="지원자 목록"
        rows={rows}
        rowKey={(r) => r.id}
        loading={list.isFetching && list.isPlaceholderData}
        error={
          list.isError && !data ? (
            <span className={s.inline}>
              {errorMessage(list.error)}
              <Button variant="secondary" size="xs" onClick={() => void list.refetch()}>
                다시 불러오기
              </Button>
            </span>
          ) : undefined
        }
        empty={params.q ? '검색 결과가 없습니다.' : params.result !== 'all' ? `${params.result} 지원자가 없습니다.` : '접수된 지원서가 없습니다.'}
        selection={{ selected, onChange: setSelected, label: (r) => `${r.name} 선택` }}
        columns={compact ? narrow : wide}
        minWidth={compact ? 660 : 1040}
      />
      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          onChange={(p) => {
            params.set({ page: p })
            focusList()
          }}
          label="지원자 목록 페이지"
        />
      )}
      <p className={s.footNote}>
        {data ? `${formatNumber(data.counts['전체'])}명 중 ${formatNumber(data.total)}명` : ''} · 점수 옆 'v1'은 지금과 다른 평가 기준으로 산정한 점수입니다 (지원서 상세에서 다시 산정).
      </p>

      {bulk.state && (
        <BulkResultDialog
          key={`bulk-${bulk.state.key}`}
          open={bulk.state.open}
          rows={bulk.state.value}
          onClose={bulk.close}
          onDone={(r, result) => {
            bulk.close()
            setSelected(new Set())
            focusList()
            const skipped = r.excluded.length ? ` 적용되지 않은 ${r.excluded.length}명: ${r.excluded.map((x) => `${x.name}(${x.reason})`).join(', ')}.` : ''
            if (r.applied === 0) toast.error(`결과를 바꾼 지원자가 없습니다.${skipped}`)
            else toast.success(`지원자 ${r.applied}명의 결과를 ${result}(으)로 바꿨습니다.${skipped}`)
          }}
        />
      )}
      {register.state && (
        <RegisterDialog
          key={`register-${register.state.key}`}
          open={register.state.open}
          onClose={register.close}
          onDone={(r) => toast.success(`최종 합격자 ${r.registered.length}명을 사용자로 등록했습니다.${r.skipped.length ? ` 같은 학번이 있는 ${r.skipped.length}명은 제외했습니다.` : ''}`)}
        />
      )}
      {mail.state && (
        <MailFlowDialog
          key={`mail-${mail.state.key}`}
          open={mail.state.open}
          batchId={viewBatch}
          onClose={mail.close}
          onStarted={(id) => {
            setTrackedBatch(id)
            setViewBatch(id)
            setDismissed(null)
          }}
        />
      )}
    </>
  )
}
