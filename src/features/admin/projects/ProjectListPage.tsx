import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { keepPrevious, selectedDeleteConfirm, useClampPage, useCompactTable, useFocusAfterRefetch, useSelection } from '../boards/listHooks'
import { useAction } from '../boards/useAction'
import { useListParams } from '../boards/useListParams'
import { errorMessage } from '../data/common/errors'
import type { AdminProject } from '../data/projects/types'
import { adminKeys } from '../data/queryKeys'
import { useAdminRepos } from '../data/useAdminData'
import { adminPath, screenById } from '../screens'
import {
  AdminImage,
  BulkBar,
  Button,
  ButtonLink,
  DataTable,
  PageHeader,
  Pagination,
  SearchBox,
  StatusBadge,
  Toolbar,
  TotalCount,
  deleteConfirm,
  doneMessage,
  formatDate,
  useConfirm,
  useToast,
  type Column,
} from '../ui'
import s from './projects.module.css'

/** 수정 화면에서 목록으로 돌아올 때 쓰는 기억 (검색어 · 쪽) */
export interface ProjectListReturn {
  listSearch: string
}

/**
 * P-APJ-01 프로젝트 관리 (F-APJ-001~003).
 * - 공개 · 비공개 모두, 최신 등록순 10개씩, 전체 개수
 * - 검색: 제목 + 설명 ('검색 결과가 없습니다.'), 검색하면 1쪽
 * - 행 [수정] → 등록 · 수정 화면(?id=), 행 [삭제] · 체크 후 [선택 삭제] → 확인 → 삭제 상태(누가 · 언제)
 * - 잠시 숨길 때는 삭제 대신 비공개 권장 (확인 문구에 안내)
 */
export function ProjectListPage() {
  const repos = useAdminRepos()
  const toast = useToast()
  const confirm = useConfirm()
  const location = useLocation()
  const lp = useListParams()
  const screen = screenById('P-APJ-01')
  const q = lp.get('q')
  const page = lp.num('page')
  const query = { q: q || undefined, page }

  const list = useQuery({ queryKey: adminKeys.section('projects', 'list', query), queryFn: () => repos.projects.list(query), placeholderData: keepPrevious })
  const items = list.data?.items
  const selection = useSelection(`${q}|${page}`, items?.map((p) => p.id))
  const { ref: listHeadRef, request: focusListHead } = useFocusAfterRefetch(list.isFetching)
  useClampPage('page', page, list.isPlaceholderData ? undefined : list.data?.page, lp.set)
  const remove = useAction((ids: string[]) => repos.projects.remove(ids))
  const back: ProjectListReturn = { listSearch: location.search }
  const compact = useCompactTable()
  const generationText = (p: AdminProject) =>
    p.generation ? (
      `${p.generation}기`
    ) : (
      <span className={s.none}>
        –<span className="visually-hidden">기록 없음</span>
      </span>
    )

  const askDelete = async (rows: AdminProject[], selected = false) => {
    const subject = rows.length === 1 ? `‘${rows[0].title}’ 프로젝트가` : '선택한 프로젝트가'
    const body = `${subject} Projects 페이지에서 사라집니다. 잠시 숨기려면 삭제 대신 [수정]에서 비공개로 바꿔 주세요.`
    if (!(await confirm((selected ? selectedDeleteConfirm : deleteConfirm)('프로젝트', rows.length, body)))) return
    try {
      const { deleted } = await remove.run(rows.map((r) => r.id))
      if (deleted === 0) toast.info('이미 삭제된 프로젝트입니다.')
      else toast.success(doneMessage('프로젝트', deleted, '삭제'))
      selection.clear()
      focusListHead()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const columns: Column<AdminProject>[] = [
    { key: 'no', header: '번호', cell: (p) => <span className="num">{p.no}</span>, width: compact ? '56px' : '72px', align: 'end' },
    {
      key: 'thumb',
      header: '썸네일',
      width: compact ? '104px' : '128px',
      cell: (p) => (
        <span className={`${s.thumb} ${compact ? s.thumbSmall : ''}`}>
          {p.thumbnailUrl ? (
            <AdminImage src={p.thumbnailUrl} alt="" />
          ) : (
            <span className={s.noThumb}>
              없음<span className="visually-hidden"> (썸네일 없음)</span>
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'title',
      header: '제목',
      rowHeader: true,
      cell: (p) => (
        <span className={s.titleCell}>
          <span className={s.title}>{p.title}</span>
          {p.summary ? <span className={s.summary}>{p.summary}</span> : <span className={`${s.summary} ${s.none}`}>설명 없음</span>}
        </span>
      ),
    },
    ...(compact
      ? [
          // 좁을 때: 기수 아래 등록일
          {
            key: 'generation',
            header: '기수 · 등록일',
            width: '112px',
            cell: (p: AdminProject) => (
              <span className={s.stack}>
                <span>{generationText(p)}</span>
                <span className={s.when}>{formatDate(p.createdAt)}</span>
              </span>
            ),
          },
        ]
      : [
          { key: 'generation', header: '기수', width: '80px', nowrap: true, cell: generationText },
          { key: 'createdAt', header: '등록일', width: '112px', cell: (p: AdminProject) => <span className={s.when}>{formatDate(p.createdAt)}</span> },
        ]),
    {
      key: 'public',
      header: '공개 여부',
      width: compact ? '96px' : '104px',
      cell: (p) => (p.isPublic ? <StatusBadge tone="success">공개</StatusBadge> : <StatusBadge tone="muted">비공개</StatusBadge>),
    },
    {
      key: 'actions',
      header: '관리',
      hideHeader: true,
      width: compact ? '84px' : '148px',
      align: 'end',
      cell: (p) => (
        <span className={`${s.rowActions} ${compact ? s.rowActionsStack : ''}`}>
          <ButtonLink variant="secondary" size="xs" to={adminPath.projectWrite(p.id)} state={back} aria-label={`${p.title} 수정`}>
            수정
          </ButtonLink>
          <Button variant="secondary" size="xs" aria-label={`${p.title} 삭제`} onClick={() => void askDelete([p])}>
            삭제
          </Button>
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title={screen.title}
        description="Projects 페이지에 소개할 프로젝트를 등록하고 고칩니다. 비공개 프로젝트도 여기에는 모두 보입니다."
        actions={
          <ButtonLink to={adminPath.projectWrite()} state={back}>
            프로젝트 등록
          </ButtonLink>
        }
      />
      <h2 ref={listHeadRef} tabIndex={-1} className={`visually-hidden ${s.listHead}`}>
        프로젝트 목록
      </h2>
      <Toolbar
        start={<SearchBox label="프로젝트 검색" placeholder="제목 · 설명" value={q} onSearch={(v) => lp.set({ q: v || null, page: null })} />}
        end={list.data && <TotalCount total={list.data.total} searching={!!q} />}
      />
      {selection.selected.size > 0 && (
        <div className={s.bulkRow}>
          <BulkBar count={selection.selected.size} onClear={selection.clear}>
            <Button variant="secondary" size="xs" busy={remove.pending} onClick={() => void askDelete(items?.filter((p) => selection.selected.has(p.id)) ?? [], true)}>
              선택 삭제
            </Button>
          </BulkBar>
        </div>
      )}
      <DataTable
        caption={`프로젝트 목록${list.data ? `, ${list.data.page}쪽` : ''}`}
        columns={columns}
        rows={items}
        rowKey={(p) => p.id}
        loading={list.isFetching}
        error={
          list.isError && (
            <>
              {errorMessage(list.error)}
              <Button variant="secondary" size="xs" onClick={() => void list.refetch()}>
                다시 불러오기
              </Button>
            </>
          )
        }
        empty={q ? '검색 결과가 없습니다.' : '등록한 프로젝트가 없습니다.'}
        rowTone={(p) => (p.isPublic ? undefined : 'muted')}
        selection={{ selected: selection.selected, onChange: selection.set, label: (p) => `${p.title} 선택` }}
        minWidth={compact ? 680 : 900}
      />
      {list.data && (
        <Pagination
          page={list.data.page}
          totalPages={list.data.totalPages}
          label="프로젝트 목록 쪽"
          onChange={(p) => {
            lp.set({ page: p })
            focusListHead()
          }}
        />
      )}
    </>
  )
}
