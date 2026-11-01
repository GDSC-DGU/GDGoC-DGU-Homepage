import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from './Button'
import { formatNumber } from './format'
import { IconSearch } from './icons'
import s from './layout.module.css'

/**
 * 목록 위 툴바: 왼쪽(거르기 · 검색 · 전체 개수) | 오른쪽(정렬 · 선택한 것에 할 일).
 *   <Toolbar start={<><FilterTabs …/><SearchBox …/></>} end={<SelectField hideLabel label="정렬" …/>} />
 */
export function Toolbar({ start, end, label }: { start?: ReactNode; end?: ReactNode; label?: string }) {
  return (
    <div className={s.toolbar} role={label ? 'group' : undefined} aria-label={label}>
      {start && <div className={s.toolbarStart}>{start}</div>}
      {end && <div className={s.toolbarEnd}>{end}</div>}
    </div>
  )
}

/** '전체 24개' (F-ABD-001 1: 전체 게시글 수 표시). 검색 중이면 '검색 결과 3개' */
export function TotalCount({ total, unit = '개', searching }: { total: number; unit?: string; searching?: boolean }) {
  return (
    <p className={s.total} aria-live="polite">
      {searching ? '검색 결과' : '전체'}{' '}
      <strong className="num">{formatNumber(total)}</strong>
      {unit}
    </p>
  )
}

/**
 * 검색 칸 (명세: 검색어를 입력하고 '검색'하면). 입력하는 동안에는 거르지 않고, Enter · [검색]에서 onSearch.
 * 비우고 검색하면 전체. role="search" 랜드마크.
 *   <SearchBox label="게시글 검색" placeholder="제목 · 내용 · 작성자" value={q} onSearch={setQ} />
 */
export function SearchBox({ label, placeholder, value, onSearch, width }: { label: string; placeholder?: string; value: string; onSearch: (q: string) => void; width?: number }) {
  const id = useId()
  const [draft, setDraft] = useState(value)
  // 바깥에서 검색어가 바뀌면(탭 이동 · 초기화) 칸도 맞춘다 (렌더 중에 맞추기: effect 로 한 번 더 그리지 않게)
  const [seen, setSeen] = useState(value)
  if (seen !== value) {
    setSeen(value)
    setDraft(value)
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSearch(draft.trim())
  }
  return (
    <form role="search" aria-label={label} className={s.search} onSubmit={submit}>
      <div className={s.searchBox}>
        <label htmlFor={id} className="visually-hidden">
          {label}
        </label>
        <IconSearch className={s.searchIcon} />
        <input id={id} type="search" className={s.searchInput} style={width ? { width } : undefined} placeholder={placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} />
      </div>
      <Button type="submit" variant="secondary">
        검색
      </Button>
    </form>
  )
}

export interface FilterOption<V extends string> {
  value: V
  label: string
  /** 탭마다 인원 · 개수 (F-AMB-002 1) */
  count?: number
}

/**
 * 거르기 탭 (분류 · 관리 유형 · 전형 결과): 하나만 눌린 버튼 묶음 (aria-pressed).
 * 화면 안 내용을 바꾸는 '탭'(Tabs)과 달리 같은 목록을 거른다.
 *   <FilterTabs label="분류" options={[{ value: 'all', label: '전체', count: 24 }, …]} value={cat} onChange={setCat} />
 */
export function FilterTabs<V extends string>({ label, options, value, onChange }: { label: string; options: readonly FilterOption<V>[]; value: V; onChange: (v: V) => void }) {
  return (
    <div role="group" aria-label={label} className={s.filters}>
      {options.map((o) => (
        <button key={o.value} type="button" className={s.filter} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined && <span className={s.filterCount}>{formatNumber(o.count)}</span>}
        </button>
      ))}
    </div>
  )
}

/**
 * 선택 줄: 표에서 체크하면 나타나 'N개 선택됨' + 할 일(선택 삭제 · 결과 일괄 변경 …) + 선택 해제.
 * 바뀌면 화면 읽기가 개수를 읽는다.
 */
export function BulkBar({ count, unit = '개', onClear, children }: { count: number; unit?: string; onClear: () => void; children: ReactNode }) {
  if (count === 0) return null
  return (
    <div className={s.bulk} role="group" aria-label="선택한 항목에 할 일">
      <span className={s.bulkCount} aria-live="polite">
        <span className="num">{formatNumber(count)}</span>
        {unit} 선택됨
      </span>
      {children}
      <Button variant="ghost" size="xs" onClick={onClear}>
        선택 해제
      </Button>
    </div>
  )
}
