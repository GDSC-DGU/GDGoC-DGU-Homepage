import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { PLACE_BY_ID } from '@/config/places'
import { CONTENT_UPDATED_AT } from '@/content'
import { DetourLink } from '@/features/pages/community/Signage'
import { dateLabel } from '@/features/pages/format'
import { PageHero } from '@/features/pagehero/PageHero'
import { useToday } from '@/hooks/useToday'
import { daysUntil } from '@/lib/date'
import { authorLabel, isNew, listSearch, parseListParams, periodLabel, timeAgo } from './data/rules'
import { TEAMS_SAMPLE, TEAMS_SAMPLE_DATA, useTeamsList, useTeamsSummary } from './data/teamsRepo'
import { SORTS, TEAMS_CATEGORIES, TEAM_PARTS, type ListQuery, type PostBrief, type TeamPost } from './data/types'
import { Avatar, CATEGORY_TONE, CategoryTag, DeadlineTag, NewTag, Pagination, PartTags, SampleNotice, SearchIcon, StatusTag } from './parts'
import s from './teams.module.css'
import { usePageTitle } from '@/hooks/usePageTitle'

/** 목록으로 돌아올 때 직전 거르기 · 쪽을 그대로 (P-TEM-003 5): 글로 갈 때 지금 주소의 ?… 를 넘긴다 */
export interface FromList {
  from?: string
  flash?: string
}

const LEAD = (
  <>
    멤버끼리 스터디, 프로젝트, 공모전 팀원을 구하는 게시판입니다. 동아리 멤버를 뽑는 곳은 아닙니다.
    <DetourLink to={PLACE_BY_ID.recruits.path} place="recruits">
      동아리 지원은 지원하기 페이지에서
    </DetourLink>
  </>
)

/**
 * 팀원 찾기 목록 (/teams, P-TEM-001). 참고: 인프런 스터디 · 링커리어 · 홀라 같은 모집 게시판.
 * 건물 머리 → [게시판 | 옆 칸] 두 칸.
 * - 글쓰기: 제목 오른쪽 버튼
 * - 게시판: [분류 탭 | 모집 중만] → [파트 | 정렬 · 검색] → 글 수 → 글 줄(두 줄: 표시 · 제목 · 본문 첫 줄 · 모집 정보 | 작성자 · 시각 · 조회 · 댓글) → 쪽 번호
 * - 옆 칸(넓은 화면): 마감 임박 · 이번 주 많이 본 글
 * 거르기 · 검색 · 정렬 · 쪽은 주소(?cat=&status=&part=&sort=&q=&page=)에 둔다: 뒤로 가기 · 목록으로 돌아올 때 그대로다.
 */
export function TeamsListPage() {
  usePageTitle(PLACE_BY_ID.teams.label)
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => parseListParams(params), [params])
  const list = useTeamsList(query)
  const summary = useTeamsSummary()
  const today = useToday()
  const [now] = useState(() => Date.now())
  const location = useLocation()
  const flash = (location.state as FromList | null)?.flash
  const boardRef = useRef<HTMLElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const tabLineRef = useRef<HTMLSpanElement>(null)

  /**
   * 분류 탭 밑줄: 고른 탭 아래로 미끄러져 간다 (translateX + scaleX, 2026-11-28).
   * 처음 자리 잡을 때는 움직이지 않고, 그 뒤부터 data-ready 로 움직임을 켠다. 탭 너비가 바뀌면(글꼴 · 화면 폭) 다시 잰다.
   */
  useLayoutEffect(() => {
    const wrap = tabsRef.current
    const line = tabLineRef.current
    if (!wrap || !line) return
    const place = () => {
      const on = wrap.querySelector<HTMLElement>('[aria-pressed="true"]')
      if (!on) return
      line.style.transform = `translateX(${on.offsetLeft + 8}px) scaleX(${Math.max(on.offsetWidth - 16, 0)})`
      if (!line.dataset.ready) requestAnimationFrame(() => (line.dataset.ready = 'true'))
    }
    place()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(place)
    ro.observe(wrap)
    wrap.querySelectorAll('button').forEach((b) => ro.observe(b))
    return () => ro.disconnect()
  }, [query.category])

  /** 거르기를 바꾸면 1쪽으로 (검색어는 유지, P-TEM-001 3) */
  const update = (patch: Partial<ListQuery>) => {
    const next: ListQuery = { ...query, ...patch, page: patch.page ?? 1 }
    setParams(new URLSearchParams(listSearch(next)), { preventScrollReset: true })
  }
  const toBoard = () => boardRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = String(new FormData(e.currentTarget).get('q') ?? '').trim()
    update({ q: q || undefined })
  }

  const sum = summary.data
  const meta = TEAMS_SAMPLE ? (
    <>
      <span className={s.metaTag}>준비 중</span> <span className="num">{dateLabel(CONTENT_UPDATED_AT, null, today)}</span> 기준
    </>
  ) : (
    <>
      전체 글 <span className="num">{sum?.total ?? '…'}</span>개, 지금 모집 중 <span className="num">{sum?.open ?? '…'}</span>개
    </>
  )

  const filtered = Boolean(query.category || query.status || query.part || query.q)
  const data = list.data
  /** 없는 쪽(?page=99)이면 주소를 실제로 보여 주는 쪽으로 바로잡는다 */
  useEffect(() => {
    if (data && !list.isPlaceholderData && data.page !== query.page) setParams(new URLSearchParams(listSearch({ ...query, page: data.page })), { replace: true, preventScrollReset: true })
  }, [data, list.isPlaceholderData, query, setParams])

  return (
    <div className={`container ${s.page}`}>
      {/* 검정 띠(글쓰기로 가는 카드)는 소개 문장과 겹쳐 뺐고, 글쓰기는 제목 오른쪽 버튼 하나로 (2026-11-28) */}
      <PageHero
        place="teams"
        title={PLACE_BY_ID.teams.label}
        lead={LEAD}
        meta={meta}
        action={
          <Link to="/teams/write" className={`btn-primary ${s.writeBtn}`}>
            <PenIcon />
            글쓰기
          </Link>
        }
      />

      <section id="board" ref={boardRef} className={`story paper ${s.board}`} aria-labelledby="board-title">
        <h2 id="board-title" className="visually-hidden">
          팀원 모집 글
        </h2>
        {TEAMS_SAMPLE ? <SampleNotice /> : TEAMS_SAMPLE_DATA && <SampleNotice compact />}
        {flash && (
          <p className={s.flash} role="status">
            {flash}
          </p>
        )}

        <div className={s.boardGrid}>
          <div className={s.boardMain}>
            {/* 1줄: 분류 탭 | 모집 중만 보기 */}
            <div className={s.tabBar}>
              <div ref={tabsRef} className={s.tabs} role="group" aria-label="분류">
                {[undefined, ...TEAMS_CATEGORIES].map((c) => (
                  <button key={c ?? 'all'} type="button" className={s.tab} aria-pressed={query.category === c} onClick={() => update({ category: c })}>
                    {c ?? '전체'}
                  </button>
                ))}
                <span ref={tabLineRef} className={s.tabLine} aria-hidden="true" />
              </div>
              <label className={s.switch}>
                <input type="checkbox" role="switch" checked={query.status === '모집중'} onChange={(e) => update({ status: e.target.checked ? '모집중' : undefined })} />
                <span className={s.switchTrack} aria-hidden="true" />
                모집 중만 보기
              </label>
            </div>

            {/* 2줄: 파트 | 정렬 · 검색 */}
            <div className={s.controls}>
              <div className={s.partFilter} role="group" aria-label="구하는 파트">
                {[undefined, ...TEAM_PARTS.map((p) => p.id)].map((id) => (
                  <button key={id ?? 'all'} type="button" className={s.partBtn} aria-pressed={query.part === id} onClick={() => update({ part: id })} lang={id ? 'en' : undefined}>
                    {id ? TEAM_PARTS.find((p) => p.id === id)!.short : '모든 파트'}
                  </button>
                ))}
              </div>
              <div className={s.tools}>
                <label className={s.selectWrap}>
                  <span className="visually-hidden">정렬</span>
                  <select className={s.select} value={query.sort ?? 'latest'} onChange={(e) => update({ sort: e.target.value === 'latest' ? undefined : (e.target.value as ListQuery['sort']) })}>
                    {SORTS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <form role="search" className={s.search} onSubmit={onSearch}>
                  <input key={query.q ?? ''} className={s.searchInput} type="search" name="q" defaultValue={query.q ?? ''} placeholder="제목, 내용, 작성자 검색" aria-label="제목, 내용, 작성자 검색" />
                  <button type="submit" className={s.searchBtn} aria-label="검색">
                    <SearchIcon />
                  </button>
                </form>
              </div>
            </div>

            <p className={s.count} aria-live="polite">
              {filtered ? '찾은 글' : '전체'} <RollingNumber value={data?.total ?? 0} />개
              {query.q && (
                <>
                  {' '}
                  ‘{query.q}’ 검색{' '}
                  <button type="button" className={s.clearQ} onClick={() => update({ q: undefined })}>
                    지우기
                  </button>
                </>
              )}
            </p>

            {list.isPending ? (
              <p className={s.state}>글을 불러오는 중입니다.</p>
            ) : list.isError ? (
              <div className={s.state}>
                <p>글을 불러오지 못했습니다.</p>
                <button type="button" className="link" onClick={() => list.refetch()}>
                  다시 불러오기
                </button>
              </div>
            ) : data && data.total === 0 ? (
              filtered ? (
                <div className={s.state}>
                  <p>조건에 맞는 글이 없습니다.</p>
                  <button type="button" className="link" onClick={() => setParams(new URLSearchParams(), { preventScrollReset: true })}>
                    거르기와 검색어 지우기
                  </button>
                </div>
              ) : (
                <div className={s.state}>
                  <p>아직 올라온 모집 글이 없습니다.</p>
                  <Link to="/teams/write" className="link-go">
                    첫 모집 글 쓰기
                  </Link>
                </div>
              )
            ) : data ? (
              // 글 묶음이 바뀌면(처음 · 거르기 · 쪽) ul 을 새로 그려 글이 위에서부터 차례로 떠오르게 한다
              <ul key={`${data.page}:${data.items.map((p) => p.id).join(',')}`} className={s.rows} aria-busy={list.isFetching || undefined}>
                {data.items.map((p, i) => (
                  <PostRow key={p.id} index={i} post={p} from={location.search} today={today} now={now} q={query.q} />
                ))}
              </ul>
            ) : null}

            {data && (
              <Pagination
                page={data.page}
                pageCount={data.pageCount}
                onPage={(n) => {
                  update({ page: n })
                  toBoard()
                }}
              />
            )}
          </div>

          {/* 옆 칸: 마감 임박 · 많이 본 글 */}
          <aside className={s.aside} aria-label="게시판 요약">
            <SideBox
              title="마감 임박"
              items={sum?.closingSoon}
              empty="곧 마감되는 글이 없습니다."
              from={location.search}
              render={(p) => <DeadlineTag endDate={p.endDate} status={p.status} today={today} />}
              below={(p) => <LeftBar days={daysUntil(p.endDate, today)} />}
            />
            <SideBox title="이번 주 많이 본 글" items={sum?.popular} empty="아직 글이 없습니다." from={location.search} ranked render={(p) => <span className={`${s.sideCount} num`}>{p.views}</span>} />
            <div className={s.sideNote}>
              <p className={s.sideNoteTitle}>처음 글을 쓴다면</p>
              <p>글과 댓글은 학번과 PIN 4자리로 씁니다. PIN을 잊었다면 운영진에게 다시 받으면 됩니다.</p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}

/** 미리보기 글: 본문 앞부분 120자 (줄바꿈은 띄어쓰기로) */
const PREVIEW_MAX = 120
function previewText(content: string) {
  const flat = content.replace(/\s+/g, ' ').trim()
  return flat.length > PREVIEW_MAX ? `${flat.slice(0, PREVIEW_MAX).trimEnd()}…` : flat
}

/**
 * 글 한 줄: [표시 · 제목 · 파트 · 인원 · 기간] | [작성자 · 시각 · 조회 · 댓글]. 줄 전체가 링크.
 * 본문 첫 줄은 목록에서 빼고(침하하처럼 촘촘하게, 2026-11-28), 마우스를 올리면 제목 아래에 미리보기 카드로 떠오른다.
 * 검색 중에는 본문에서 찾은 낱말이 보이도록 미리보기를 늘 보여 준다.
 */
function PostRow({ post: p, index, from, today, now, q }: { post: TeamPost; index: number; from: string; today: string; now: number; q?: string }) {
  const preview = previewText(p.content)
  return (
    <li className={s.rowItem} style={{ '--i': index } as CSSProperties}>
      <Link to={`/teams/${p.id}`} state={{ from } satisfies FromList} className={s.row} data-tone={CATEGORY_TONE[p.category]} data-closed={p.status === '마감' || undefined} data-q={q ? true : undefined}>
        <span className={s.rowMain}>
          <span className={s.rowTags}>
            <CategoryTag category={p.category} />
            <StatusTag status={p.status} />
            <DeadlineTag endDate={p.endDate} status={p.status} today={today} />
            {isNew(p.createdAt, now) && <NewTag />}
          </span>
          <span className={s.rowTitle}>
            <span className={s.rowTitleText}>
              <Highlight text={p.title} q={q} />
            </span>
            {p.attachments.length > 0 && <ClipIcon />}
          </span>
          {preview && (
            <span className={s.rowPreview}>
              <Highlight text={preview} q={q} />
            </span>
          )}
          <span className={s.rowInfo}>
            <PartTags parts={p.parts} />
            {p.headcount && (
              <span>
                <span className="num">{p.headcount}</span>명
              </span>
            )}
            <span className="num">{periodLabel(p.startDate, p.endDate)}</span>
          </span>
        </span>
        <span className={s.rowSide}>
          <span className={s.rowAuthor}>
            <Avatar author={p.author} size={28} />
            <span className={s.rowName}>{authorLabel(p.author)}</span>
          </span>
          <span className={s.rowStats}>
            <span>{timeAgo(p.createdAt, now)}</span>
            <span aria-label={`조회 ${p.views}`}>
              <EyeIcon /> <span className="num">{p.views}</span>
            </span>
            <span aria-label={`댓글 ${p.commentCount}`} data-zero={p.commentCount === 0 || undefined}>
              <ChatIcon /> <span className="num">{p.commentCount}</span>
            </span>
          </span>
        </span>
        <ArrowIcon />
      </Link>
    </li>
  )
}

function SideBox({ title, items, empty, from, render, below, ranked = false }: { title: string; items?: PostBrief[]; empty: string; from: string; render: (p: PostBrief) => ReactNode; below?: (p: PostBrief) => ReactNode; ranked?: boolean }) {
  return (
    <section className={s.sideBox} aria-label={title}>
      <h3 className={s.sideTitle}>{title}</h3>
      {!items ? (
        <p className={s.muted}>불러오는 중</p>
      ) : items.length === 0 ? (
        <p className={s.muted}>{empty}</p>
      ) : (
        <ol className={s.sideList}>
          {items.map((p, i) => (
            <li key={p.id}>
              <Link to={`/teams/${p.id}`} state={{ from } satisfies FromList} className={s.sideLink}>
                {ranked && <span className={`${s.rank} num`}>{i + 1}</span>}
                <span className={s.sideText}>{p.title}</span>
                {render(p)}
                {below?.(p)}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/**
 * 마감 임박 막대: 마감 3일 전부터 남은 날만큼 차 있다가 줄어든다 (D-3 가득 → 오늘 마감 한 칸).
 * 목록 요약(PostBrief)에는 시작일이 없어서 '모집 기간 전체'가 아니라 마지막 3일을 기준으로 그린다. 처음 보일 때 왼쪽에서 차오른다.
 */
function LeftBar({ days }: { days: number }) {
  const ratio = Math.min(Math.max((days + 1) / 4, 0), 1)
  return (
    <span className={s.leftBar} aria-hidden="true">
      <span className={s.leftBarFill} style={{ '--ratio': ratio } as CSSProperties} />
    </span>
  )
}

/**
 * 글 수 숫자: 바뀌면 옛 숫자는 밀려나고 새 숫자가 들어온다 (늘면 위로, 줄면 아래로).
 * 직전 값은 그리는 중에 비교해 기억한다 (effect 안 setState 없이, React 문서 '이전 값 저장' 방식).
 */
function RollingNumber({ value }: { value: number }) {
  const [roll, setRoll] = useState({ value, prev: null as number | null, dir: null as 'up' | 'down' | null, n: 0 })
  if (roll.value !== value) setRoll({ value, prev: roll.value, dir: value > roll.value ? 'up' : 'down', n: roll.n + 1 })
  return (
    <span className={`${s.roll} num`} data-dir={roll.dir ?? undefined}>
      {roll.prev !== null && (
        <span key={`o${roll.n}`} className={s.rollOut} aria-hidden="true">
          {roll.prev}
        </span>
      )}
      <span key={`i${roll.n}`} className={s.rollIn}>
        {roll.value}
      </span>
    </span>
  )
}

/** 검색어를 굵게 */
function Highlight({ text, q }: { text: string; q?: string }) {
  if (!q) return <>{text}</>
  const words = q.split(/\s+/).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!words.length) return <>{text}</>
  const parts = text.split(new RegExp(`(${words.join('|')})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className={s.mark}>
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  )
}

function PenIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={s.icon}>
      <path d="M4 20l1-4L16 5a2 2 0 0 1 3 3L8 19l-4 1zM14 7l3 3" />
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={s.statIcon}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  )
}
function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={s.statIcon}>
      <path d="M4 5.5h16v10H9l-5 4v-14z" />
    </svg>
  )
}
function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={s.rowArrow}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}
function ClipIcon() {
  return (
    <svg viewBox="0 0 24 24" className={s.clip} role="img" aria-label="첨부파일 있음">
      <path d="M8 12.5l6.2-6.2a3 3 0 0 1 4.3 4.3l-7.8 7.8a5 5 0 0 1-7.1-7.1L11 3.9" />
    </svg>
  )
}
