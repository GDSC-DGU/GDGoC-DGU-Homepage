import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useAdminActor } from '../auth/authContext'
import { adminKeys, errorMessage, useAdminRepos } from '../data'
import type { ManagementType } from '../data/common/types'
import { canDeactivateUser, canUnlockUser, type PermissionActor } from '../data/permissions'
import { canOpenEdit, canResendPinMail, canResetPinOf, RESEND_GAP_MS, resendWaitMs, secondsLeft, USERS_PAGE_SIZE } from '../data/users/rules'
import type { UserListQuery, UserListResult, UserRow } from '../data/users/types'
import { adminPath } from '../screens'
import { BulkBar, Button, ButtonLink, DataTable, FilterTabs, PageHeader, Pagination, SearchBox, Toolbar, TotalCount, useToast, type Column } from '../ui'
import { DeactivateDialog, PinResetDialog, UnlockDialog, type ActionDone } from './ActionDialogs'
import { AccountStatusBadge, PinStatusBadges } from './badges'
import { ROLE_GUIDE } from './display'
import { useCountdown, useFocusKeeper } from './hooks'
import { UserFormDialog, type UserFormDone, type UserFormTarget } from './UserFormDialog'
import s from './users.module.css'

type TypeFilter = 'all' | ManagementType

/** 팝업 하나의 상태: 무엇을 열었는지 + 열림. 닫는 동안에도 내용을 그리도록 값은 남긴다. key 는 열 때마다 새로 (안의 입력값을 처음으로) */
type Opened<T> = { value: T; open: boolean; key: number } | null
function useOpened<T>() {
  const [state, setState] = useState<Opened<T>>(null)
  const seq = useRef(0)
  return {
    state,
    open: (value: T) => setState({ value, open: true, key: ++seq.current }),
    close: () => setState((x) => (x ? { ...x, open: false } : x)),
  }
}

/**
 * 사용자 관리 (P-AMB-01, Figma 07-3, F-AMB-001~004 · 013).
 * 목록(이름 · 이메일 · 학번 가림 · 관리 유형 · 기수 · 관리자 아이디 · PIN 설정 상태 · 상태), 관리 유형 탭(인원 수) · 검색,
 * 선택 비활성화, 링크 재발송(1분 간격), 잠금 해제 · PIN 초기화 · 추가 · 수정 팝업, 변경 이력으로 가기.
 * Lead · Core 모두 들어오고, Core 는 General 만 관리한다 (막힌 버튼은 숨기지 않고 이유를 말한다).
 */
export function UsersPage() {
  const repos = useAdminRepos()
  const actor = useAdminActor()
  const toast = useToast()

  const [type, setType] = useState<TypeFilter>('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const query: UserListQuery = { type: type === 'all' ? undefined : type, q: q || undefined, page, pageSize: USERS_PAGE_SIZE }
  const list = useQuery({ queryKey: adminKeys.section('users', 'list', query), queryFn: () => repos.users.list(query), placeholderData: keepPreviousData })
  const data = list.data

  const tableRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const keepFocus = useFocusKeeper(tableRef, headingRef, data)

  const form = useOpened<UserFormTarget>()
  const pinReset = useOpened<UserRow>()
  const unlock = useOpened<UserRow>()
  const deactivate = useOpened<{ allowed: UserRow[]; excluded: { user: UserRow; reason: string }[] }>()
  const [resending, setResending] = useState<string | null>(null)

  const changeFilter = (next: { type?: TypeFilter; q?: string }) => {
    if (next.type !== undefined) setType(next.type)
    if (next.q !== undefined) setQ(next.q)
    setPage(1)
    setSelected(new Set())
  }
  const changePage = (p: number) => {
    setPage(p)
    setSelected(new Set())
    headingRef.current?.focus({ preventScroll: true })
    headingRef.current?.scrollIntoView({ block: 'start' })
  }

  const finish = (d: ActionDone | UserFormDone, close: () => void) => {
    close()
    keepFocus(`edit-${d.userId}`)
    if (d.tone === 'error') toast.error(d.message)
    else if (d.tone === 'info') toast.info(d.message)
    else toast.success(d.message)
  }

  // ── 링크 재발송 (F-AMB-013): 확인 없이 바로, 결과는 토스트 ──
  const resend = async (row: UserRow) => {
    // 보내는 동안 버튼이 잠시 막혀 초점을 잃으므로, 목록이 다시 그려지면 같은 버튼으로 돌려준다
    keepFocus(`resend-${row.id}`)
    setResending(row.id)
    try {
      const r = await repos.users.resendPinMail(row.id)
      if (r.mail === 'sent') toast.success(`${row.name}에게 PIN ${row.pinStatus === 'reset' ? '재설정' : '설정'} 링크를 다시 보냈습니다. 이전 링크는 더 이상 쓸 수 없습니다.`)
      else toast.error(`${row.name}에게 메일을 보내지 못했습니다. 이메일이 잘못됐으면 [수정]에서 고친 뒤 다시 보내 주세요.`)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setResending(null)
    }
  }

  // ── 선택 비활성화 (F-AMB-004) ──
  const rows = data?.items ?? []
  const selectedRows = rows.filter((r) => selected.has(r.id))
  const decisions = selectedRows.map((user) => ({ user, d: canDeactivateUser(actor, user, data?.activeLeads ?? 0) }))
  const deactivatable = decisions.filter((x) => x.d.allowed).map((x) => x.user)
  const excluded = decisions.flatMap((x) => (x.d.allowed ? [] : [{ user: x.user, reason: x.d.reason }]))
  const bulkBlocked = selectedRows.length > 0 && deactivatable.length === 0 ? `선택한 사용자는 비활성화할 수 없습니다. ${excluded[0]?.user.name}: ${excluded[0]?.reason}` : undefined

  const columns: Column<UserRow>[] = [
    {
      key: 'name',
      header: '이름 · 이메일',
      rowHeader: true,
      cell: (r) => (
        <span className={s.nameCell}>
          <span className={s.name}>
            {r.name}
            {r.id === actor.id && <span className={s.meTag}>나</span>}
          </span>
          <span className={s.email}>{r.email}</span>
        </span>
      ),
    },
    { key: 'studentId', header: '학번', cell: (r) => <span className="num">{r.maskedStudentId}</span>, nowrap: true },
    { key: 'type', header: '관리 유형', cell: (r) => <span className={r.type === 'General' ? undefined : s.adminType}>{r.type}</span>, nowrap: true },
    { key: 'generation', header: '기수', cell: (r) => `${r.generation}기`, nowrap: true },
    { key: 'loginId', header: '관리자 아이디', cell: (r) => (r.loginId ? <span className={s.mono}>{r.loginId}</span> : <span aria-label="없음">-</span>), nowrap: true },
    { key: 'pin', header: 'PIN 설정 상태', cell: (r) => <PinStatusBadges row={r} /> },
    {
      key: 'status',
      header: '상태',
      cell: (r) => (
        <span className={s.statusCell}>
          <AccountStatusBadge row={r} />
          {r.status === 'locked' && <UnlockButton row={r} actor={actor} onOpen={() => unlock.open(r)} />}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '관리',
      cell: (r) => {
        const edit = canOpenEdit(actor, r)
        return (
          <span className={s.actions}>
            <Button variant="secondary" size="xs" data-focus-key={`edit-${r.id}`} aria-label={`${r.name} 수정`} disabledReason={edit.allowed ? undefined : edit.reason} onClick={() => form.open({ mode: 'edit', user: r })}>
              수정
            </Button>
            {r.status !== 'inactive' &&
              (r.pinStatus === 'set' ? (
                <PinResetButton row={r} actor={actor} onOpen={() => pinReset.open(r)} />
              ) : (
                <ResendButton row={r} busy={resending === r.id} onResend={() => void resend(r)} />
              ))}
          </span>
        )
      },
    },
  ]

  return (
    <>
      <PageHeader
        title="사용자 관리"
        description="Lead · Core · General 사용자와 관리 권한, PIN 설정 상태를 관리합니다. Core는 General 사용자만 추가 · 수정할 수 있습니다."
        actions={
          <>
            <ButtonLink variant="secondary" to={adminPath.userHistory}>
              변경 이력
            </ButtonLink>
            <Button onClick={() => form.open({ mode: 'add' })}>사용자 추가</Button>
          </>
        }
      />

      <Summary data={data} role={actor.role} />

      <h2 ref={headingRef} tabIndex={-1} className={s.listHeading}>
        사용자 목록
      </h2>
      <Toolbar
        start={
          <>
            <FilterTabs<TypeFilter>
              label="관리 유형"
              options={[
                { value: 'all', label: '전체', count: data?.counts.all },
                { value: 'Lead', label: 'Lead', count: data?.counts.Lead },
                { value: 'Core', label: 'Core', count: data?.counts.Core },
                { value: 'General', label: 'General', count: data?.counts.General },
              ]}
              value={type}
              onChange={(v) => changeFilter({ type: v })}
            />
            <SearchBox label="사용자 검색" placeholder="이름 · 학번 · 이메일 · 관리자 아이디" value={q} onSearch={(v) => changeFilter({ q: v })} width={300} />
          </>
        }
      />
      <div className={s.countRow}>
        <TotalCount total={data?.total ?? 0} unit="명" searching={!!q} />
        <BulkBar count={selected.size} unit="명" onClear={() => setSelected(new Set())}>
          <Button variant="secondary" size="xs" disabledReason={bulkBlocked} onClick={() => deactivate.open({ allowed: deactivatable, excluded })}>
            선택 비활성화
          </Button>
        </BulkBar>
      </div>

      <div ref={tableRef} className={s.tableWrap}>
        <DataTable
          caption="사용자 목록"
          rows={data?.items}
          rowKey={(r) => r.id}
          loading={list.isFetching}
          error={
            list.isError && !data ? (
              <span className={s.errorRow}>
                {errorMessage(list.error)}
                <Button variant="secondary" size="xs" onClick={() => void list.refetch()}>
                  다시 불러오기
                </Button>
              </span>
            ) : undefined
          }
          empty={q ? '검색 결과가 없습니다.' : '사용자가 없습니다.'}
          rowTone={(r) => (r.status === 'inactive' ? 'muted' : undefined)}
          selection={{ selected, onChange: setSelected, label: (r) => `${r.name} 선택`, disabled: (r) => r.status === 'inactive' }}
          columns={columns}
          minWidth={1060}
        />
      </div>
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={changePage} label="사용자 목록 페이지" />}

      {form.state && (
        <UserFormDialog
          key={`form-${form.state.key}`}
          target={form.state.value}
          open={form.state.open}
          activeLeads={data?.activeLeads ?? 0}
          onClose={form.close}
          onDone={(d) => finish(d, form.close)}
        />
      )}
      {pinReset.state && <PinResetDialog key={`pin-${pinReset.state.key}`} user={pinReset.state.value} open={pinReset.state.open} onClose={pinReset.close} onDone={(d) => finish(d, pinReset.close)} />}
      {unlock.state && <UnlockDialog key={`unlock-${unlock.state.key}`} user={unlock.state.value} open={unlock.state.open} onClose={unlock.close} onDone={(d) => finish(d, unlock.close)} />}
      {deactivate.state && (
        <DeactivateDialog
          key={`deactivate-${deactivate.state.key}`}
          allowed={deactivate.state.value.allowed}
          excluded={deactivate.state.value.excluded}
          open={deactivate.state.open}
          onClose={deactivate.close}
          onDone={(r) => {
            deactivate.close()
            setSelected(new Set())
            keepFocus('none')
            const skipped = r.skipped.length ? ` ${r.skipped.length}명은 제외했습니다 (${r.skipped.map((x) => x.name).join(', ')}).` : ''
            toast.success(`사용자 ${r.changed}명을 비활성화했습니다.${skipped}`)
          }}
        />
      )}
    </>
  )
}

/** 상단 안내 (F-AMB-001): 관리 유형별 권한 + PIN 미설정 인원 */
function Summary({ data, role }: { data: UserListResult | undefined; role: PermissionActor['role'] }) {
  return (
    <section className={s.summary} aria-labelledby="users-summary-title">
      <h2 id="users-summary-title" className="visually-hidden">
        관리 유형별 권한과 PIN 설정 현황
      </h2>
      <div className={s.roles}>
        <h3 className={s.summaryTitle}>관리 유형별 권한</h3>
        <dl className={s.roleList}>
          {ROLE_GUIDE.map((r) => (
            <div key={r.type} data-me={r.type === role || undefined}>
              <dt>
                {r.type}
                {r.type === role && <span className={s.meTag}>내 권한</span>}
              </dt>
              <dd>{r.text}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className={s.pinSummary} aria-busy={!data || undefined}>
        <h3 className={s.summaryTitle}>PIN 미설정</h3>
        <p className={s.pinCount}>
          <span className="num">{data ? data.pinNotSet : '–'}</span>명
        </p>
        <p className={s.pinBreakdown}>
          {data ? (
            <>
              대기 <span className="num">{data.pin.pending}</span> · 초기화됨 <span className="num">{data.pin.reset}</span> · 링크 만료 <span className="num">{data.pin.expired}</span> · 발송 실패{' '}
              <span className="num">{data.pin.mailFailed}</span>
            </>
          ) : (
            ' '
          )}
        </p>
        <p className={s.note}>PIN을 설정하기 전에는 게시글 · 댓글을 쓸 수 없습니다. 링크가 만료됐거나 발송에 실패했으면 [링크 재발송]으로 다시 보냅니다.</p>
      </div>
    </section>
  )
}

/** [링크 재발송]: 같은 사용자 1분 간격 (F-AMB-013 2). 남은 초를 글자로 보여 준다 */
function ResendButton({ row, busy, onResend }: { row: UserRow; busy: boolean; onResend: () => void }) {
  const until = row.pinMailSentAt ? Date.parse(row.pinMailSentAt) + RESEND_GAP_MS : null
  const now = useCountdown(until)
  const d = canResendPinMail(row, now)
  const wait = resendWaitMs(row.pinMailSentAt, now)
  const label = wait > 0 ? `${secondsLeft(wait)} 뒤 재발송` : '링크 재발송'
  return (
    <Button variant="secondary" size="xs" busy={busy} data-focus-key={`resend-${row.id}`} aria-label={`${row.name} ${label}`} disabledReason={d.allowed ? undefined : d.reason} onClick={onResend} className={s.resend}>
      {label}
    </Button>
  )
}

function PinResetButton({ row, actor, onOpen }: { row: UserRow; actor: PermissionActor; onOpen: () => void }) {
  const d = canResetPinOf(actor, row)
  return (
    <Button variant="secondary" size="xs" aria-label={`${row.name} PIN 초기화`} disabledReason={d.allowed ? undefined : d.reason} onClick={onOpen}>
      PIN 초기화
    </Button>
  )
}

function UnlockButton({ row, actor, onOpen }: { row: UserRow; actor: PermissionActor; onOpen: () => void }) {
  const d = canUnlockUser(actor, row)
  return (
    <Button variant="secondary" size="xs" aria-label={`${row.name} 잠금 해제`} disabledReason={d.allowed ? undefined : d.reason} onClick={onOpen}>
      잠금 해제
    </Button>
  )
}

