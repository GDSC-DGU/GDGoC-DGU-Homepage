import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PLACE_BY_ID } from '@/config/places'
import { useToday } from '@/hooks/useToday'
import { shortDate, weekday } from '@/lib/date'
import { BOARD_LABEL } from '../data/boards/types'
import { errorMessage } from '../data/common/errors'
import type { DashboardData, DashboardScheduleItem } from '../data/dashboard/dashboard'
import { adminKeys } from '../data/queryKeys'
import { useAdminRepos } from '../data/useAdminData'
import { adminPath } from '../screens'
import { Button, PageHeader, Panel, StatusBadge, formatDay, formatNumber, formatPeriod, relativeTime } from '../ui'
import { useNow } from './useNow'
import s from './dashboard.module.css'

/** 불러오는 중 · 실패 · 비어 있음을 나눠 그린다 (빈 목록과 실패를 헷갈리지 않게) */
function QueryState<T>({
  query,
  empty,
  emptyText,
  children,
}: {
  query: { data?: T; isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown }
  empty: (data: T) => boolean
  emptyText: string
  children: (data: T) => ReactNode
}) {
  if (query.isPending)
    return (
      <div className={s.skeleton} aria-hidden="true">
        <span style={{ width: '82%' }} />
        <span style={{ width: '64%' }} />
        <span style={{ width: '74%' }} />
      </div>
    )
  if (query.isError || query.data === undefined)
    return (
      <div className={`${s.state} ${s.stateError}`} role="alert">
        {errorMessage(query.error)}
        <Button variant="secondary" size="xs" onClick={() => void query.refetch()}>
          다시 불러오기
        </Button>
      </div>
    )
  if (empty(query.data)) return <p className={s.state}>{emptyText}</p>
  return <>{children(query.data)}</>
}

function Metrics({ data }: { data: DashboardData | undefined }) {
  const v = (n: number | undefined, unit: string) =>
    n === undefined ? (
      <span className={s.value}>–</span>
    ) : (
      <span className={s.value}>
        {formatNumber(n)}
        <span className={s.unit}>{unit}</span>
      </span>
    )
  const example = data?.visitors.isExample ? <span className={s.exampleTag}>예시 값</span> : null
  return (
    <section aria-labelledby="metrics-title">
      <h2 id="metrics-title" className="visually-hidden">
        운영 지표
      </h2>
      <dl className={s.metrics} aria-busy={!data || undefined}>
        <div className={s.metric}>
          <dt>오늘 접속자{example}</dt>
          <dd>{v(data?.visitors.today, '명')}</dd>
        </div>
        <div className={s.metric}>
          <dt>이번 주 접속자{example}</dt>
          <dd>{v(data?.visitors.week, '명')}</dd>
        </div>
        <div className={s.metric}>
          <dt>새로운 게시글</dt>
          <dd>
            {v(data ? data.newPosts.teams + data.newPosts.community : undefined, '개')}
            <span className={s.sub}>{data ? `Teams ${data.newPosts.teams} · Community ${data.newPosts.community}` : ' '}</span>
          </dd>
        </div>
        <div className={s.metric}>
          <dt>새로운 댓글</dt>
          <dd>
            {v(data ? data.newComments.teams + data.newComments.community : undefined, '개')}
            <span className={s.sub}>{data ? `Teams ${data.newComments.teams} · Community ${data.newComments.community}` : ' '}</span>
          </dd>
        </div>
      </dl>
      <p className={s.note}>
        새로운 게시글 · 댓글은 최근 {data?.windowHours ?? 24}시간 기준입니다. 접속자 수는 집계 방식이 정해지지 않아(F-COM-002) 예시 값을 보여 줍니다.
      </p>
    </section>
  )
}

function ScheduleRow({ item, today }: { item: DashboardScheduleItem; today: string }) {
  return (
    <li className={s.event}>
      <p className={s.date}>
        <span className={s.day}>{shortDate(item.date, today)}</span>
        <span className={s.weekday}>{weekday(item.date)}요일</span>
      </p>
      <div className={s.eventBody}>
        <StatusBadge tone={item.kind === '마감' ? 'warning' : 'neutral'}>{item.kind}</StatusBadge>
        <p className={s.eventTitle}>{item.title}</p>
        {item.endDate && <p className={s.period}>기간 {formatPeriod(item.date, item.endDate)}</p>}
      </div>
    </li>
  )
}

/**
 * 대시보드 (P-ACM-03, F-ACM-005~008): 운영 지표 · 새로운 게시글 5 · 새로운 댓글 5 · 행사 일정 4.
 * 게시글 · 댓글은 게시판 구역의 예시 데이터(store)를 그대로 읽어서, 게시판 관리에서 지우면 여기서도 사라진다.
 */
export function DashboardPage() {
  const repos = useAdminRepos()
  const today = useToday()
  const now = useNow()
  const summary = useQuery({ queryKey: adminKeys.section('dashboard', 'summary'), queryFn: () => repos.dashboard.get() })
  const schedule = useQuery({ queryKey: adminKeys.section('dashboard', 'schedule'), queryFn: () => repos.dashboard.schedule() })

  return (
    <>
      <PageHeader title="대시보드" description="홈페이지 이용 현황과 새 글 · 댓글 · 다가오는 일정을 한눈에 봅니다." meta={`오늘 ${formatDay(today)} 기준`} />
      <Metrics data={summary.data} />

      <div className={s.grid}>
        <div className={s.col}>
          <Panel
            title="새로운 게시글"
            description="Teams · Community 최신 5개"
            flush
            actions={
              <Link className="link-go" to={adminPath.teams}>
                전체 보기
              </Link>
            }
          >
            <QueryState query={summary} empty={(d) => d.recentPosts.length === 0} emptyText="최근 게시글이 없습니다.">
              {(d) => (
                <ul className={s.list}>
                  {d.recentPosts.map((p) => (
                    <li key={p.id}>
                      <Link className={s.item} to={`${adminPath.board(p.board)}?post=${encodeURIComponent(p.id)}`}>
                        <span className={s.itemMain}>
                          <span className={s.itemMeta}>
                            <span className={s.category}>{p.category}</span>
                            <span className={s.dot}>{BOARD_LABEL[p.board]}</span>
                          </span>
                          <span className={s.itemTitle}>{p.title}</span>
                        </span>
                        <span className={s.time}>
                          <time dateTime={p.createdAt}>{relativeTime(p.createdAt, now)}</time>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </QueryState>
          </Panel>

          <Panel title="새로운 댓글" description="Teams · Community 최신 5개" flush>
            <QueryState query={summary} empty={(d) => d.recentComments.length === 0} emptyText="최근 댓글이 없습니다.">
              {(d) => (
                <ul className={s.list}>
                  {d.recentComments.map((c) => (
                    <li key={c.id}>
                      <Link className={s.item} to={`${adminPath.board(c.board)}?comment=${encodeURIComponent(c.id)}`}>
                        <span className={s.itemMain}>
                          <span className={s.itemMeta}>
                            <span className={s.category}>{c.authorName}</span>
                            <span className={s.dot}>{BOARD_LABEL[c.board]}</span>
                          </span>
                          <span className={s.itemText}>{c.excerpt}</span>
                          <span className={s.itemPost}>
                            <span className="visually-hidden">게시글 </span>
                            {c.postTitle}
                          </span>
                        </span>
                        <span className={s.time}>
                          <time dateTime={c.createdAt}>{relativeTime(c.createdAt, now)}</time>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </QueryState>
          </Panel>
        </div>

        <Panel
          title="행사 일정"
          description="오늘 이후 4개 · 행사와 지원 마감"
          flush
          actions={
            <Link className="link-go" to={`${PLACE_BY_ID.about.path}#now`}>
              캘린더 보기
            </Link>
          }
        >
          <QueryState query={schedule} empty={(d) => d.length === 0} emptyText="다가오는 일정이 없습니다.">
            {(d) => (
              <ul className={s.schedule}>
                {d.map((item) => (
                  <ScheduleRow key={item.id} item={item} today={today} />
                ))}
              </ul>
            )}
          </QueryState>
        </Panel>
      </div>
    </>
  )
}
