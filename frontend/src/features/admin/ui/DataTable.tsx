import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { EmptyState } from './PageHeader'
import { IconErrorMark, IconSort } from './icons'
import { pageList } from './pagination'
import { useOverflowX } from './useOverflowX'
import s from './table.module.css'

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  /** 행의 이름 칸 (th scope="row"): 제목 · 이름처럼 그 행을 대표하는 칸 하나 */
  rowHeader?: boolean
  sortable?: boolean
  /** 처음 누르면 어느 쪽으로 (날짜 · 점수는 desc) */
  sortFirst?: 'asc' | 'desc'
  align?: 'start' | 'center' | 'end'
  /** CSS 폭 ('96px' · '30%') */
  width?: string
  nowrap?: boolean
  /** 머리 글자를 눈에서만 숨김 ('관리' 열 등). 화면 읽기는 읽는다 */
  hideHeader?: boolean
}

export interface SortState {
  key: string
  dir: 'asc' | 'desc'
}

export interface TableSelection<T> {
  selected: ReadonlySet<string>
  onChange: (next: Set<string>) => void
  /** 체크 칸 이름: '게시글 [예시] 알고리즘 스터디 선택' */
  label: (row: T) => string
  /** 고를 수 없는 행 (잠긴 결과 등) */
  disabled?: (row: T) => boolean
}

export interface DataTableProps<T> {
  /** 표 이름 (caption). 화면에 보이는 제목이 따로 있으면 showCaption 없이 화면 읽기만 */
  caption: string
  showCaption?: boolean
  columns: readonly Column<T>[]
  /** undefined 면 아직 못 받음 (불러오는 중 뼈대) */
  rows: readonly T[] | undefined
  rowKey: (row: T) => string
  /** 다시 불러오는 중 (이전 행을 흐리게 두고 aria-busy) */
  loading?: boolean
  /** 불러오지 못했을 때 문장 (+ 다시 시도 버튼 등) */
  error?: ReactNode
  /** 비었을 때 (기본 '표시할 항목이 없습니다.'). 검색 중이면 '검색 결과가 없습니다.' 를 넘긴다 */
  empty?: ReactNode
  selection?: TableSelection<T>
  sort?: SortState | null
  onSortChange?: (next: SortState) => void
  /** 행 음영: shaded(관리자 게시글) · muted(비활성) */
  rowTone?: (row: T) => 'shaded' | 'muted' | undefined
  /** 이 폭보다 좁으면 표 상자 안에서 가로로 넘긴다 (기본 720) */
  minWidth?: number
  /** 테두리 없이 (Panel 안에 꽉 채울 때) */
  bare?: boolean
}

/**
 * 관리자 표. 진짜 <table>: caption, th scope, 정렬은 머리 버튼 + aria-sort, 선택은 진짜 체크박스.
 * 페이지 나누기는 표 아래 <Pagination> 을 따로 둔다 (서버가 페이지를 나눠 주므로).
 *
 *   <DataTable caption="Teams 게시글" rows={data?.items} rowKey={(r) => r.id} loading={isFetching}
 *     columns={[{ key: 'no', header: '번호', cell: (r) => r.no, width: '72px' },
 *               { key: 'title', header: '제목', cell: (r) => r.title, rowHeader: true }, …]}
 *     selection={{ selected, onChange: setSelected, label: (r) => `${r.title} 선택` }}
 *     empty={q ? '검색 결과가 없습니다.' : '게시글이 없습니다.'} />
 */
export function DataTable<T>({ caption, showCaption, columns, rows, rowKey, loading, error, empty, selection, sort, onSortChange, rowTone, minWidth = 720, bare }: DataTableProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const overflow = useOverflowX(scrollRef)
  const colCount = columns.length + (selection ? 1 : 0)
  const pending = rows === undefined && !error

  return (
    <div className={s.wrap}>
      <div
        ref={scrollRef}
        className={`${s.scroll} ${bare ? s.bare : ''}`}
        role={overflow ? 'region' : undefined}
        aria-label={overflow ? `${caption} (가로로 넘겨 보기)` : undefined}
        tabIndex={overflow ? 0 : undefined}
      >
        <table className={`${s.table} ${loading && rows ? s.busy : ''}`} style={{ '--table-min': `${minWidth}px` } as CSSProperties} aria-busy={loading || pending || undefined}>
          <caption className={showCaption ? s.caption : 'visually-hidden'}>{caption}</caption>
          <thead>
            <tr>
              {selection && (
                <th scope="col" className={s.selectCell}>
                  {rows && rows.length > 0 ? <SelectAll rows={rows} rowKey={rowKey} selection={selection} /> : <span className="visually-hidden">선택</span>}
                </th>
              )}
              {columns.map((c) => {
                const active = sort?.key === c.key
                const ariaSort = c.sortable ? (active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined
                return (
                  <th key={c.key} scope="col" data-align={c.align} style={c.width ? { width: c.width } : undefined} aria-sort={ariaSort}>
                    {c.sortable && onSortChange ? (
                      <button
                        type="button"
                        className={s.sortButton}
                        data-active={active}
                        onClick={() => onSortChange({ key: c.key, dir: active ? (sort!.dir === 'asc' ? 'desc' : 'asc') : (c.sortFirst ?? 'asc') })}
                      >
                        {c.header}
                        <IconSort dir={active ? sort!.dir : undefined} />
                      </button>
                    ) : (
                      <span className={c.hideHeader ? 'visually-hidden' : undefined}>{c.header}</span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td colSpan={colCount} className={s.message}>
                  <div className={s.errorRow} role="alert">
                    <IconErrorMark />
                    {error}
                  </div>
                </td>
              </tr>
            ) : pending ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} aria-hidden="true">
                  {Array.from({ length: colCount }, (_, j) => (
                    <td key={j}>
                      <span className={s.skeleton} style={{ width: j === 0 && selection ? 18 : `${40 + ((i * 7 + j * 13) % 50)}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows!.length === 0 ? (
              <tr>
                <td colSpan={colCount} className={s.message}>
                  {typeof empty === 'string' || empty === undefined ? <EmptyState title={empty ?? '표시할 항목이 없습니다.'} /> : empty}
                </td>
              </tr>
            ) : (
              rows!.map((row) => {
                const key = rowKey(row)
                const checked = selection?.selected.has(key) ?? false
                return (
                  <tr key={key} className={s.row} data-tone={rowTone?.(row)} data-selected={checked || undefined}>
                    {selection && (
                      <td className={s.selectCell}>
                        <label className={s.selectLabel}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={selection.disabled?.(row)}
                            aria-label={selection.label(row)}
                            onChange={(e) => {
                              const next = new Set(selection.selected)
                              if (e.target.checked) next.add(key)
                              else next.delete(key)
                              selection.onChange(next)
                            }}
                          />
                        </label>
                      </td>
                    )}
                    {columns.map((c) => {
                      const props = { 'data-align': c.align, className: c.nowrap ? s.nowrap : undefined }
                      return c.rowHeader ? (
                        <th key={c.key} scope="row" {...props}>
                          {c.cell(row)}
                        </th>
                      ) : (
                        <td key={c.key} {...props}>
                          {c.cell(row)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {pending && (
        <p className="visually-hidden" role="status">
          {caption} 불러오는 중입니다
        </p>
      )}
    </div>
  )
}

/** 이 페이지 전체 선택 (일부만 고르면 '-' 표시) */
function SelectAll<T>({ rows, rowKey, selection }: { rows: readonly T[]; rowKey: (r: T) => string; selection: TableSelection<T> }) {
  const ref = useRef<HTMLInputElement>(null)
  const keys = rows.filter((r) => !selection.disabled?.(r)).map(rowKey)
  const count = keys.filter((k) => selection.selected.has(k)).length
  const all = keys.length > 0 && count === keys.length
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = count > 0 && !all
  }, [count, all])
  return (
    <label className={s.selectLabel}>
      <input
        ref={ref}
        type="checkbox"
        checked={all}
        disabled={keys.length === 0}
        aria-label="이 페이지 전체 선택"
        onChange={() => {
          const next = new Set(selection.selected)
          for (const k of keys) {
            if (all) next.delete(k)
            else next.add(k)
          }
          selection.onChange(next)
        }}
      />
    </label>
  )
}

/**
 * 페이지 나누기: [이전] 1 2 3 … 9 [다음]. 지금 쪽은 aria-current="page".
 * 쪽을 바꾸면 표 맨 위로 초점을 옮기는 것은 화면이 정한다 (보통 목록 제목).
 */
export function Pagination({ page, totalPages, onChange, label }: { page: number; totalPages: number; onChange: (page: number) => void; label: string }) {
  if (totalPages <= 1) return null
  return (
    <nav className={s.pagination} aria-label={label}>
      <ul className={s.pages}>
        <li>
          <button type="button" className={`${s.page} ${s.pageText}`} disabled={page <= 1} onClick={() => onChange(page - 1)}>
            이전
          </button>
        </li>
        {pageList(page, totalPages).map((p, i) =>
          p === null ? (
            <li key={`gap-${i}`} className={s.gap} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={p}>
              <button type="button" className={s.page} aria-current={p === page ? 'page' : undefined} onClick={() => onChange(p)}>
                {p}
                <span className="visually-hidden">쪽</span>
              </button>
            </li>
          ),
        )}
        <li>
          <button type="button" className={`${s.page} ${s.pageText}`} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
            다음
          </button>
        </li>
      </ul>
    </nav>
  )
}
