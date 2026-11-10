import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react'
import { deadlineLabel } from '@/features/teams/data/rules'
import { useToday } from '@/hooks/useToday'
import { BOARD_LABEL, type BoardId, type CommentRow, type PostCategory, type PostListQuery, type PostRow } from '../data/boards/types'
import { errorMessage } from '../data/common/errors'
import { adminKeys } from '../data/queryKeys'
import { useAdminRepos } from '../data/useAdminData'
import { ADMIN_SAMPLE } from '../sample'
import { adminPath, screenById } from '../screens'
import {
  BulkBar,
  Button,
  ButtonLink,
  DataTable,
  FilterTabs,
  PageHeader,
  Pagination,
  SearchBox,
  StatusBadge,
  Toolbar,
  TotalCount,
  deleteConfirm,
  doneMessage,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPeriod,
  useConfirm,
  useToast,
  type Column,
} from '../ui'
import { PostPreviewDialog } from './PostPreviewDialog'
import { keepPrevious, selectedDeleteConfirm, useClampPage, useCompactTable, useFocusAfterRefetch, useSelection } from './listHooks'
import { useAction } from './useAction'
import { authorText, boardCategories, partsText } from './display'
import { useListParams } from './useListParams'
import s from './boards.module.css'


function SectionHead({ id, headingRef, title, children }: { id: string; headingRef: Ref<HTMLHeadingElement>; title: string; children?: ReactNode }) {
  return (
    <div className={s.sectionHead}>
      <h2 id={id} ref={headingRef} tabIndex={-1} className={s.sectionTitle}>
        {title}
      </h2>
      {children}
    </div>
  )
}

/* ─────────────────────────── 게시글 ─────────────────────────── */

type CategoryFilter = 'all' | PostCategory

function PostsSection({ board }: { board: BoardId }) {
  const repos = useAdminRepos()
  const toast = useToast()
  const confirm = useConfirm()
  const lp = useListParams()
  const headingId = useId()
  const today = useToday()

  const categories = boardCategories(board)
  const rawCategory = lp.get('category') as PostCategory
  const category: CategoryFilter = categories.includes(rawCategory) ? rawCategory : 'all'
  const q = lp.get('q')
  const page = lp.num('page')
  const highlight = lp.get('post')
  const query: PostListQuery = { category: category === 'all' ? undefined : category, q: q || undefined, page }

  const posts = useQuery({
    queryKey: adminKeys.section('boards', 'posts', board, query),
    queryFn: () => repos.boards.listPosts(board, query),
    placeholderData: keepPrevious,
  })
  const items = posts.data?.items
  const selection = useSelection(`${board}|${category}|${q}|${page}`, items?.map((p) => p.id))
  const focus = useFocusAfterRefetch(posts.isFetching)
  useClampPage('page', page, posts.isPlaceholderData ? undefined : posts.data?.page, lp.set)

  const remove = useAction((ids: string[]) => repos.boards.deletePosts(board, ids))
  const compact = useCompactTable()
  const [preview, setPreview] = useState<PostRow | null>(null)

  // 대시보드 · 작성 화면에서 열린 글(?post=): 처음 한 번 그 행으로 스크롤하고 제목에 초점
  const titleRefs = useRef(new Map<string, HTMLButtonElement>())
  const highlighted = useRef('')
  useEffect(() => {
    if (!highlight || highlighted.current === highlight || !items?.some((p) => p.id === highlight)) return
    highlighted.current = highlight
    const el = titleRefs.current.get(highlight)
    el?.scrollIntoView({ block: 'center' })
    el?.focus({ preventScroll: true })
  }, [highlight, items])

  /** 거르기 · 검색 · 쪽을 바꾸면 강조(?post=)는 지운다 */
  const change = (patch: Record<string, string | number | null>) => lp.set({ ...patch, post: null })

  const askDelete = async (rows: PostRow[], selected = false): Promise<boolean> => {
    const comments = rows.reduce((n, r) => n + r.commentCount, 0)
    const subject = rows.length === 1 ? `‘${rows[0].title}’ 글이` : `선택한 글이`
    const body = comments ? `${subject} 홈페이지 목록에서 사라지고, 달린 댓글 ${comments}개도 함께 숨겨집니다.` : `${subject} 홈페이지 목록에서 사라집니다.`
    // 취소하면 확인 팝업이 연 버튼(행의 [삭제] · [선택 삭제] · 내용 보기의 [삭제])으로 초점을 돌려준다
    if (!(await confirm((selected ? selectedDeleteConfirm : deleteConfirm)('게시글', rows.length, body)))) return false
    try {
      const { deleted } = await remove.run(rows.map((r) => r.id))
      if (deleted === 0) toast.info('이미 삭제된 게시글입니다.')
      else toast.success(doneMessage('게시글', deleted, '삭제'))
      selection.clear()
      focus.request()
      return true
    } catch (e) {
      toast.error(errorMessage(e))
      return false
    }
  }

  const selectedRows = items?.filter((p) => selection.selected.has(p.id)) ?? []
  const searching = !!q || category !== 'all'
  const emptyText = q ? '검색 결과가 없습니다.' : category !== 'all' ? '이 분류의 게시글이 없습니다.' : '게시글이 없습니다.'

  const columns: Column<PostRow>[] = [
    { key: 'no', header: '번호', cell: (p) => <span className="num">{p.no}</span>, width: '64px', align: 'end' },
    { key: 'category', header: '분류', cell: (p) => p.category, width: compact ? '88px' : '96px', nowrap: true },
    {
      key: 'title',
      header: '제목',
      rowHeader: true,
      cell: (p) => (
        <span className={`${s.titleLine} ${p.id === highlight ? s.hl : ''}`}>
          {p.pinned && <StatusBadge tone="neutral">고정</StatusBadge>}
          <button
            type="button"
            className={s.titleButton}
            ref={(el) => {
              if (el) titleRefs.current.set(p.id, el)
              else titleRefs.current.delete(p.id)
            }}
            aria-haspopup="dialog"
            onClick={() => setPreview(p)}
          >
            {p.title}
          </button>
          {p.attachments.length > 0 && <span className={s.titleMeta}>첨부 {p.attachments.length}</span>}
          {p.id === highlight && <span className="visually-hidden">(대시보드에서 연 글)</span>}
        </span>
      ),
    },
    ...(compact
      ? [
          // 좁을 때: 작성자 아래 작성일
          {
            key: 'author',
            header: '작성자 · 작성일',
            width: '136px',
            cell: (p: PostRow) => (
              <span className={s.stack}>
                <span className={`${s.author} ${p.byAdmin ? s.adminAuthor : ''}`}>{authorText(p)}</span>
                <span className={s.when}>{formatDate(p.createdAt)}</span>
              </span>
            ),
          },
        ]
      : [
          { key: 'author', header: '작성자', width: '120px', cell: (p: PostRow) => <span className={`${s.author} ${p.byAdmin ? s.adminAuthor : ''}`}>{authorText(p)}</span> },
          { key: 'createdAt', header: '작성일', width: '148px', cell: (p: PostRow) => <span className={s.when}>{formatDateTime(p.createdAt)}</span> },
        ]),
    ...(board === 'teams'
      ? [
          {
            key: 'recruit',
            header: '모집',
            width: '132px',
            cell: (p: PostRow) => (
              <span className={s.stack}>
                <span className={s.recruit}>
                  <StatusBadge tone={p.recruitStatus === '모집중' ? 'success' : 'muted'}>{p.recruitStatus ?? '-'}</StatusBadge>
                  {p.recruitStatus && p.endDate && deadlineLabel(p.endDate, p.recruitStatus, today) && <span className={s.dday}>{deadlineLabel(p.endDate, p.recruitStatus, today)}</span>}
                </span>
                <span className={s.when}>
                  {partsText(p.parts)} · {p.headcount ? `${p.headcount}명` : '인원 미정'}
                </span>
              </span>
            ),
          },
          { key: 'comments', header: '댓글', cell: (p: PostRow) => <span className={s.count}>{formatNumber(p.commentCount)}</span>, width: '64px', align: 'end' as const },
        ]
      : [
          // 공개 사이트에는 Community 글 화면이 없어 조회수 대신 일정(세션 · 행사 기간)을 보여 준다
          { key: 'period', header: '일정', width: '148px', cell: (p: PostRow) => <span className={s.when}>{p.startDate ? formatPeriod(p.startDate, p.endDate) : '-'}</span> },
        ]),
    {
      key: 'actions',
      header: '관리',
      hideHeader: true,
      width: '84px',
      align: 'end',
      cell: (p) => (
        <Button variant="secondary" size="xs" aria-label={`${p.title} 삭제`} onClick={() => void askDelete([p])}>
          삭제
        </Button>
      ),
    },
  ]

  return (
    <section className={s.section} aria-labelledby={headingId}>
      <SectionHead id={headingId} headingRef={focus.ref} title="게시글">
        {board === 'community' && ADMIN_SAMPLE && (
          <span className={s.legend}>
            <span className={s.swatch} aria-hidden="true" />
            음영 줄은 운영진이 쓴 공지 · 세션 · 행사 글입니다.
          </span>
        )}
      </SectionHead>
      <div className={s.filterRow}>
        <FilterTabs<CategoryFilter>
          label="분류"
          options={[{ value: 'all', label: '전체' }, ...categories.map((c) => ({ value: c, label: c }))]}
          value={category}
          onChange={(v) => change({ category: v === 'all' ? null : v, page: null })}
        />
      </div>
      <Toolbar
        start={<SearchBox label={`${BOARD_LABEL[board]} 게시글 검색`} placeholder="제목 · 내용 · 작성자" value={q} onSearch={(v) => change({ q: v || null, page: null })} />}
        end={posts.data && <TotalCount total={posts.data.total} searching={searching} />}
      />
      {selection.selected.size > 0 && (
        <div className={s.bulkRow}>
          <BulkBar count={selection.selected.size} onClear={selection.clear}>
            <Button variant="secondary" size="xs" busy={remove.pending} onClick={() => void askDelete(selectedRows, true)}>
              선택 삭제
            </Button>
          </BulkBar>
        </div>
      )}
      <DataTable
        caption={`${BOARD_LABEL[board]} 게시글 목록${posts.data ? `, ${posts.data.page}쪽` : ''}`}
        columns={columns}
        rows={items}
        rowKey={(p) => p.id}
        loading={posts.isFetching}
        error={
          posts.isError && (
            <>
              {errorMessage(posts.error)}
              <Button variant="secondary" size="xs" onClick={() => void posts.refetch()}>
                다시 불러오기
              </Button>
            </>
          )
        }
        empty={emptyText}
        rowTone={(p) => (ADMIN_SAMPLE && p.byAdmin ? 'shaded' : undefined)}
        selection={{ selected: selection.selected, onChange: selection.set, label: (p) => `${p.title} 선택` }}
        minWidth={compact ? 680 : board === 'teams' ? 940 : 860}
      />
      {posts.data && (
        <Pagination
          page={posts.data.page}
          totalPages={posts.data.totalPages}
          label={`${BOARD_LABEL[board]} 게시글 목록 쪽`}
          onChange={(p) => {
            change({ page: p })
            focus.request()
          }}
        />
      )}
      <PostPreviewDialog
        post={preview}
        deleting={remove.pending}
        onClose={() => setPreview(null)}
        onDelete={async (p) => {
          if (await askDelete([p])) setPreview(null)
        }}
      />
    </section>
  )
}

/* ─────────────────────────── 댓글 ─────────────────────────── */

function CommentsSection({ board }: { board: BoardId }) {
  const repos = useAdminRepos()
  const toast = useToast()
  const confirm = useConfirm()
  const lp = useListParams()
  const headingId = useId()
  const page = lp.num('cpage')
  const highlight = lp.get('comment')

  const comments = useQuery({
    queryKey: adminKeys.section('boards', 'comments', board, page),
    queryFn: () => repos.boards.listComments(board, { page }),
    placeholderData: keepPrevious,
  })
  const items = comments.data?.items
  const selection = useSelection(`${board}|${page}`, items?.map((c) => c.id))
  const focus = useFocusAfterRefetch(comments.isFetching)
  useClampPage('cpage', page, comments.isPlaceholderData ? undefined : comments.data?.page, lp.set)
  const remove = useAction((ids: string[]) => repos.boards.deleteComments(ids))
  const compact = useCompactTable()

  // 대시보드에서 연 댓글(?comment=): 처음 한 번 그 행으로
  const deleteRefs = useRef(new Map<string, HTMLButtonElement>())
  const highlighted = useRef('')
  useEffect(() => {
    if (!highlight || highlighted.current === highlight || !items?.some((c) => c.id === highlight)) return
    highlighted.current = highlight
    deleteRefs.current.get(highlight)?.scrollIntoView({ block: 'center' })
  }, [highlight, items])

  const askDelete = async (rows: CommentRow[], selected = false) => {
    const body = rows.length === 1 ? `${rows[0].authorName}의 댓글이 홈페이지에서 보이지 않게 됩니다.` : '선택한 댓글이 홈페이지에서 보이지 않게 됩니다.'
    if (!(await confirm((selected ? selectedDeleteConfirm : deleteConfirm)('댓글', rows.length, body)))) return
    try {
      const { deleted } = await remove.run(rows.map((r) => r.id))
      if (deleted === 0) toast.info('이미 삭제된 댓글입니다.')
      else toast.success(doneMessage('댓글', deleted, '삭제'))
      selection.clear()
      focus.request()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const columns: Column<CommentRow>[] = [
    {
      key: 'author',
      header: compact ? '작성자 · 작성일' : '작성자',
      rowHeader: true,
      width: compact ? '136px' : '128px',
      cell: (c) => (
        <span className={`${s.stack} ${c.id === highlight ? s.hl : ''}`}>
          <span className={s.author}>{authorText(c)}</span>
          {compact && <span className={s.when}>{formatDate(c.createdAt)}</span>}
        </span>
      ),
    },
    {
      key: 'content',
      header: compact ? '댓글 내용 · 게시글' : '댓글 내용',
      cell: (c) => (
        <span className={s.stack}>
          <span className={s.clamp}>
            {c.content}
            {c.id === highlight && <span className="visually-hidden"> (대시보드에서 연 댓글)</span>}
          </span>
          {compact && (
            <span className={s.postRef}>
              <span className="visually-hidden">게시글: </span>
              {c.postTitle}
            </span>
          )}
        </span>
      ),
    },
    ...(compact
      ? []
      : [
          { key: 'post', header: '게시글', width: '30%', cell: (c: CommentRow) => <span className={s.postRef}>{c.postTitle}</span> },
          { key: 'createdAt', header: '작성일', width: '148px', cell: (c: CommentRow) => <span className={s.when}>{formatDateTime(c.createdAt)}</span> },
        ]),
    {
      key: 'actions',
      header: '관리',
      hideHeader: true,
      width: '84px',
      align: 'end',
      cell: (c) => (
        <Button
          ref={(el) => {
            if (el) deleteRefs.current.set(c.id, el)
            else deleteRefs.current.delete(c.id)
          }}
          variant="secondary"
          size="xs"
          aria-label={`${c.authorName}의 댓글 삭제`}
          onClick={() => void askDelete([c])}
        >
          삭제
        </Button>
      ),
    },
  ]

  return (
    <section className={s.section} aria-labelledby={headingId}>
      <SectionHead id={headingId} headingRef={focus.ref} title="댓글">
        {comments.data && <TotalCount total={comments.data.total} />}
      </SectionHead>
      {selection.selected.size > 0 && (
        <div className={s.bulkRow}>
          <BulkBar count={selection.selected.size} onClear={selection.clear}>
            <Button variant="secondary" size="xs" busy={remove.pending} onClick={() => void askDelete(items?.filter((c) => selection.selected.has(c.id)) ?? [], true)}>
              선택 삭제
            </Button>
          </BulkBar>
        </div>
      )}
      <DataTable
        caption={`${BOARD_LABEL[board]} 댓글 목록${comments.data ? `, ${comments.data.page}쪽` : ''}`}
        columns={columns}
        rows={items}
        rowKey={(c) => c.id}
        loading={comments.isFetching}
        error={
          comments.isError && (
            <>
              {errorMessage(comments.error)}
              <Button variant="secondary" size="xs" onClick={() => void comments.refetch()}>
                다시 불러오기
              </Button>
            </>
          )
        }
        empty="댓글이 없습니다."
        selection={{ selected: selection.selected, onChange: selection.set, label: (c) => `${c.authorName}의 댓글 선택` }}
        minWidth={compact ? 680 : 860}
      />
      {comments.data && (
        <Pagination
          page={comments.data.page}
          totalPages={comments.data.totalPages}
          label={`${BOARD_LABEL[board]} 댓글 목록 쪽`}
          onChange={(p) => {
            lp.set({ cpage: p, comment: null })
            focus.request()
          }}
        />
      )}
    </section>
  )
}

/**
 * 게시판 관리 (P-ABD-01 Teams · P-ABD-02 Community): 위 게시글, 아래 댓글.
 * - 게시글: 최신순 10개씩 · 전체 개수 · 검색(제목 · 내용 · 작성자) · Community 분류 탭과 공지 고정 · 관리자 글 음영 · 행 [삭제] · 체크 후 [선택 삭제]
 * - 댓글: 최신순 10개씩 · 행 [삭제] · 체크 후 [선택 삭제]
 * - 삭제는 실제로 지우지 않고 삭제 상태(누가 · 언제)로. 글을 지우면 달린 댓글도 숨김
 * - ?post= · ?comment= (대시보드 링크) 로 들어오면 그 행을 강조
 */
export function BoardManagePage({ board }: { board: BoardId }) {
  const screen = screenById(board === 'teams' ? 'P-ABD-01' : 'P-ABD-02')
  return (
    <>
      <PageHeader
        title={screen.title}
        description={
          board === 'teams'
            ? '홈페이지 팀원 찾기 게시글과 댓글을 찾아보고, 부적절한 글은 삭제합니다. 삭제한 글은 홈페이지 목록에서 사라집니다.'
            : ADMIN_SAMPLE
              ? 'Community 게시글과 댓글을 분류별로 찾아보고 삭제합니다. 공지 · 세션 · 행사는 [글쓰기]에서 운영진 이름으로 올립니다.'
              : '운영진이 올린 공지 · 세션 · 행사 글을 분류별로 찾아보고 삭제합니다. 새 글은 [글쓰기]에서 운영진 이름으로 올립니다.'
        }
        actions={board === 'community' ? <ButtonLink to={adminPath.communityWrite}>글쓰기</ButtonLink> : undefined}
      />
      <PostsSection board={board} />
      {/* 공개 사이트의 Community 에는 댓글이 없다: 댓글 관리는 Teams 와 예시 화면에서만 */}
      {(board === 'teams' || ADMIN_SAMPLE) && <CommentsSection board={board} />}
    </>
  )
}
