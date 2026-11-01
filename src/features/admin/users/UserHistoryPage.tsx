import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useNow } from '../dashboard/useNow'
import { adminKeys, errorMessage, useAdminRepos } from '../data'
import { actorLabel } from '../data/common/accounts'
import { HISTORY_ACTION_LABEL, HISTORY_KIND_LABEL, HISTORY_KINDS } from '../data/users/history'
import { kstYmd, recentRange } from '../data/users/rules'
import type { UserHistoryEntry, UserHistoryKind, UserHistoryQuery } from '../data/users/types'
import { adminPath } from '../screens'
import { Button, DataTable, DateTimeField, EmptyState, FilterTabs, PageHeader, Pagination, SearchBox, SelectField, StatusBadge, Toolbar, TotalCount, formatDateTime, formatPeriod, type Column } from '../ui'
import s from './users.module.css'

type KindFilter = 'all' | UserHistoryKind
type Period = '7' | '30' | '90' | '365' | 'custom'

const PERIODS: { value: Period; label: string }[] = [
  { value: '7', label: '최근 7일' },
  { value: '30', label: '최근 30일' },
  { value: '90', label: '최근 90일' },
  { value: '365', label: '최근 1년' },
  { value: 'custom', label: '직접 지정' },
]

/** 내용 끝의 메일 결과는 글자 대신 배지로 (발송 완료 · 발송 실패, F-AMB-013 3) */
function Detail({ entry }: { entry: UserHistoryEntry }) {
  if (!entry.mail) return <>{entry.detail}</>
  const text = entry.detail.replace(/\s*(·\s*)?발송 (완료|실패)$/, '')
  return (
    <span className={s.detail}>
      {text}
      {entry.mail === 'sent' ? <StatusBadge tone="success">발송 완료</StatusBadge> : <StatusBadge tone="danger">발송 실패</StatusBadge>}
    </span>
  )
}

const columns: Column<UserHistoryEntry>[] = [
  { key: 'at', header: '일시', cell: (h) => <span className="num">{formatDateTime(h.at)}</span>, nowrap: true, width: '152px' },
  { key: 'actor', header: '처리자', cell: (h) => <span className={h.actor.kind === 'admin' ? undefined : s.quiet}>{actorLabel(h.actor)}</span>, nowrap: true, width: '140px' },
  {
    key: 'target',
    header: '대상',
    rowHeader: true,
    cell: (h) => (
      <span className={s.nameCell}>
        <span className={s.name}>{h.target.name}</span>
        <span className={`${s.email} num`}>{h.target.maskedStudentId}</span>
      </span>
    ),
    width: '150px',
  },
  { key: 'action', header: '변경 종류', cell: (h) => <span className={s.actionLabel}>{HISTORY_ACTION_LABEL[h.action]}</span>, nowrap: true, width: '128px' },
  { key: 'detail', header: '내용', cell: (h) => <Detail entry={h} /> },
]

/**
 * 사용자 변경 이력 (P-AMB-03, Figma 07-3-5, F-AMB-005 · 014).
 * 누가 · 언제 · 누구에게 · 무엇을, 최신순 20건씩. 변경 종류 탭 · 기간(기본 최근 30일) · 검색(대상 이름 · 학번 · 처리자).
 * 이력은 고칠 수도 지울 수도 없다 (버튼 없음).
 */
export function UserHistoryPage() {
  const repos = useAdminRepos()
  const now = useNow()
  const today = kstYmd(now)
  const [kind, setKind] = useState<KindFilter>('all')
  const [period, setPeriod] = useState<Period>('30')
  const [custom, setCustom] = useState(() => recentRange(now))
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const range = period === 'custom' ? custom : recentRange(now, Number(period))
  const rangeError = period !== 'custom' ? null : !custom.from || !custom.to ? '시작일과 종료일을 모두 골라 주세요.' : custom.from > custom.to ? '시작일이 종료일보다 늦습니다.' : null
  const query: UserHistoryQuery = { kind: kind === 'all' ? undefined : kind, from: range.from, to: range.to, q: q || undefined, page }
  const history = useQuery({ queryKey: adminKeys.section('users', 'history', query), queryFn: () => repos.users.history(query), placeholderData: keepPreviousData, enabled: !rangeError })
  const data = rangeError ? undefined : history.data

  const reset = (fn: () => void) => {
    fn()
    setPage(1)
  }
  const changePage = (p: number) => {
    setPage(p)
    headingRef.current?.focus({ preventScroll: true })
    headingRef.current?.scrollIntoView({ block: 'start' })
  }

  return (
    <>
      <PageHeader
        back={{ to: adminPath.users, label: '사용자 관리' }}
        title="사용자 변경 이력"
        description="누가 언제 어떤 사용자에게 무엇을 바꿨는지 최신순으로 보여 줍니다. 이력은 수정하거나 삭제할 수 없습니다."
      />

      <h2 ref={headingRef} tabIndex={-1} className={s.listHeading}>
        변경 이력 목록
      </h2>
      <Toolbar
        start={
          <FilterTabs<KindFilter>
            label="변경 종류"
            options={[{ value: 'all', label: '전체' }, ...HISTORY_KINDS.map((k) => ({ value: k, label: HISTORY_KIND_LABEL[k] }))]}
            value={kind}
            onChange={(v) => reset(() => setKind(v))}
          />
        }
      />
      <div className={s.historyFilters}>
        <SelectField label="기간" options={PERIODS} value={period} onChange={(e) => reset(() => setPeriod(e.target.value as Period))} className={s.periodField} />
        {period === 'custom' && (
          <>
            <DateTimeField label="시작일" value={custom.from} max={today} onChange={(e) => reset(() => setCustom((c) => ({ ...c, from: e.target.value })))} error={rangeError} className={s.dateField} />
            <DateTimeField label="종료일" value={custom.to} max={today} onChange={(e) => reset(() => setCustom((c) => ({ ...c, to: e.target.value })))} className={s.dateField} />
          </>
        )}
        <div className={s.searchSlot}>
          <SearchBox label="변경 이력 검색" placeholder="대상 이름 · 학번 · 처리자" value={q} onSearch={(v) => reset(() => setQ(v))} width={260} />
        </div>
      </div>
      <div className={s.countRow}>
        <TotalCount total={data?.total ?? 0} unit="건" searching={!!q} />
        {!rangeError && (
          <p className={s.rangeNote}>
            기간 <span className="num">{formatPeriod(range.from, range.to)}</span> · 최신순 · 20건씩
          </p>
        )}
      </div>

      <DataTable
        caption="사용자 변경 이력"
        rows={rangeError ? [] : data?.items}
        rowKey={(h) => h.id}
        loading={history.isFetching}
        error={
          history.isError && !data ? (
            <span className={s.errorRow}>
              {errorMessage(history.error)}
              <Button variant="secondary" size="xs" onClick={() => void history.refetch()}>
                다시 불러오기
              </Button>
            </span>
          ) : undefined
        }
        empty={
          rangeError ? (
            <EmptyState title="기간을 확인해 주세요." description={rangeError} />
          ) : q ? (
            '검색 결과가 없습니다.'
          ) : (
            <EmptyState title="이 기간에 남은 이력이 없습니다." description="기간을 넓히거나 변경 종류를 '전체'로 바꿔 보세요." />
          )
        }
        columns={columns}
        minWidth={880}
      />
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={changePage} label="변경 이력 페이지" />}
    </>
  )
}
