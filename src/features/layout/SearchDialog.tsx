import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { NAV_ORDER, PLACE_BY_ID, placeColor } from '@/config/places'
import { useRepositories } from '@/data/useRepositories'
import type { PlaceId, SearchHit } from '@/domain/types'
import { useCampusActions } from '@/state/useCampus'
import { usePlacePreview } from './placePreview'
import { useModalDialog } from './useModalDialog'
import { countByPlace, groupHits } from './searchGroups'
import s from './search.module.css'

/** 입력이 멈추고 이만큼 뒤에 찾는다 (글자마다 서버를 부르지 않게) */
const DEBOUNCE_MS = 200

interface Option {
  key: string
  place: PlaceId
  title: string
  meta: string
  sample?: boolean
  /** 그 항목이 바로 보이는 주소 (프로젝트 자세히 보기 창 · 세미나 검색). 없으면 장소 페이지 */
  to?: string
}

/**
 * 검색 결과 id → 바로 가는 주소: 'project-<id>' → 아카이브 자세히 보기 창,
 * 'seminar-<id>' → 아카이브 세미나의 그 기수 탭에서 그 제목으로 찾기 (기수는 meta '2025.04.03 · 2기 · 발표자' 에서)
 */
function targetOf(doc: SearchHit['doc']): string | undefined {
  const archive = PLACE_BY_ID.projects.path
  if (doc.id.startsWith('project-')) return `${archive}?p=${encodeURIComponent(doc.id.slice('project-'.length))}`
  if (doc.id.startsWith('seminar-')) {
    const gen = doc.meta?.match(/(?:^| )(\d+)기(?: |$)/)?.[1]
    return `${archive}?view=seminars${gen ? `&gen=${gen}` : ''}&q=${encodeURIComponent(doc.title)}`
  }
  return undefined
}

interface Group {
  place: PlaceId
  label: string
  options: Option[]
  more: number
}

/** 검색어가 없을 때 보이는 바로 가기: 지도의 다섯 장소 */
const QUICK: Group[] = [
  {
    place: 'about',
    label: '바로 가기',
    more: 0,
    options: NAV_ORDER.map((id) => ({ key: `place-${id}`, place: id, title: PLACE_BY_ID[id].label, meta: PLACE_BY_ID[id].sub })),
  },
]

const toGroups = (hits: readonly SearchHit[]): Group[] =>
  groupHits(hits).map((g) => ({
    place: g.place,
    label: PLACE_BY_ID[g.place].label,
    more: g.more,
    options: g.hits.map(({ doc }) => ({ key: doc.id, place: doc.place, title: doc.title, meta: doc.meta, sample: doc.sample, to: targetOf(doc) })),
  }))

interface Props {
  open: boolean
  onClose: () => void
  /** 연 자리가 닫힌 창 안이라 초점을 돌려줄 수 없을 때 대신 받을 곳 (머리말의 메뉴 버튼 등). 앞에서부터, 화면에 보이는 것 */
  returnFallbacks?: readonly RefObject<HTMLElement | null>[]
}

/** 목록이 넘쳐서 안에서 스크롤되는지. 스크롤되면 키보드로도 닿게 목록에 초점을 줄 수 있어야 한다 */
function useOverflows(ref: RefObject<HTMLElement | null>, active: boolean): boolean {
  const [overflows, setOverflows] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !active) return
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    for (const child of Array.from(el.children)) ro.observe(child)
    return () => ro.disconnect()
  })
  return overflows
}

/**
 * 검색 창 (명령 팔레트). 머리말의 돋보기 버튼이나 Ctrl/⌘ + K 로 연다.
 * - <dialog> 의 showModal 이라 초점이 창 안에만 돌고, Esc 로 닫히며, 닫으면 연 버튼으로 초점이 돌아간다
 *   (결과를 골라 닫으면 돌려주지 않는다: 지도 미리보기가 제목으로 초점을 가져간다)
 * - 콤보박스: ↓↑ 로 결과 이동, Enter 로 열기. 결과 건수는 화면 읽기 프로그램에 알린다
 * - 결과가 있는 동안 지도에서 해당 건물이 빛나고 이름표에 건수가 뜬다 (setHits)
 * - 결과를 고르면 홈에서는 지도에서 그 장소를 열고, 다른 페이지에서는 그 장소 페이지로 간다
 */
export function SearchDialog({ open, onClose, returnFallbacks }: Props) {
  const { search } = useRepositories()
  const { setHits } = useCampusActions()
  const preview = usePlacePreview()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  // 열고 닫기는 부모 상태(open)를 따른다
  const { ref: dialogRef, restoreFocus, forgetFocus } = useModalDialog(open, inputRef, returnFallbacks)
  const [query, setQuery] = useState('')
  const [hits, setLocalHits] = useState<SearchHit[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [active, setActive] = useState(0)
  const uid = useId()
  const listId = `${uid}-list`
  const optionId = (i: number) => `${uid}-opt-${i}`

  const q = query.trim()
  const groups = useMemo(() => (!q ? QUICK : hits ? toGroups(hits) : []), [q, hits])
  const flat = useMemo(() => groups.flatMap((g) => g.options), [groups])
  const total = hits?.length ?? 0
  const scrollable = useOverflows(listRef, open)

  useEffect(() => {
    if (!q) return
    let alive = true
    const timer = window.setTimeout(async () => {
      try {
        const result = await search.search(q)
        if (!alive) return
        setFailed(false)
        setLocalHits(result)
        setHits(result.length ? countByPlace(result) : null)
      } catch {
        if (!alive) return
        setFailed(true)
        setLocalHits([])
        setHits(null)
      }
      setActive(0)
    }, DEBOUNCE_MS)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [q, search, setHits])

  // 키보드로 고른 결과가 목록 밖이면 목록만 움직인다
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const reset = () => {
    setQuery('')
    setLocalHits(null)
    setFailed(false)
    setActive(0)
    setHits(null)
  }

  const handleClose = () => {
    reset()
    onClose()
    restoreFocus()
  }

  const choose = (opt: Option | undefined) => {
    if (!opt) return
    // 고른 곳(지도 미리보기 · 장소 페이지)이 초점을 가져가므로 검색 버튼으로 돌려주지 않는다
    forgetFocus()
    dialogRef.current?.close()
    if (opt.to) navigate(opt.to)
    else if (pathname === '/') preview.show(opt.place, { reveal: true })
    else navigate(PLACE_BY_ID[opt.place].path)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!flat.length) return
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + step + flat.length) % flat.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(flat[active] ?? flat[0])
    } else if (e.key === 'Home' && flat.length && !query) {
      setActive(0)
    }
  }

  // 창 바깥(어두운 배경)을 누르면 닫는다
  const onPointerDown = (e: PointerEvent<HTMLDialogElement>) => {
    if (e.target !== dialogRef.current) return
    const r = dialogRef.current.getBoundingClientRect()
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
    if (!inside) dialogRef.current.close()
  }

  const status = !q ? '' : failed ? '지금은 검색을 할 수 없습니다' : hits === null ? '' : total ? `검색 결과 ${total}건` : '맞는 결과가 없습니다'
  const expanded = flat.length > 0
  // 묶음마다 첫 결과의 번호 (목록 전체에서 몇 번째인지)
  const starts = groups.map((_, gi) => groups.slice(0, gi).reduce((n, g) => n + g.options.length, 0))

  return (
    <dialog ref={dialogRef} className={s.dialog} aria-label="사이트 검색" onClose={handleClose} onPointerDown={onPointerDown}>
      <div className={s.field}>
        <svg className={s.icon} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
        <input
          ref={inputRef}
          className={s.input}
          type="text"
          role="combobox"
          value={query}
          placeholder="세션 · 행사 · 프로젝트 이름"
          aria-label="세션 · 행사 · 프로젝트 검색"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={expanded}
          aria-activedescendant={expanded && flat[active] ? optionId(active) : undefined}
          autoComplete="off"
          enterKeyHint="search"
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            if (!e.target.value.trim()) reset()
          }}
          onKeyDown={onKeyDown}
        />
        <button type="button" className={s.close} onClick={() => dialogRef.current?.close()}>
          <span className="visually-hidden">검색 닫기</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* 결과가 넘쳐 안에서 스크롤될 때만: 키보드로 목록에 닿아 스크롤할 수 있게 초점을 받는다 */}
      <div
        ref={listRef}
        className={s.body}
        tabIndex={scrollable ? 0 : undefined}
        role={scrollable ? 'region' : undefined}
        aria-label={scrollable ? (q ? '검색 결과 목록' : '바로 가기 목록') : undefined}
      >
        {q && failed && <p className={s.note}>지금은 검색을 할 수 없습니다. 잠시 뒤 다시 시도해 주세요.</p>}
        {q && !failed && hits !== null && total === 0 && <p className={s.note}>‘{q}’에 맞는 기록이 없습니다. 행사 이름이나 기술 이름으로 찾아보세요.</p>}
        <div id={listId} role="listbox" aria-label={q ? '검색 결과' : '바로 가기'} hidden={!expanded}>
          {groups.map((g, gi) => {
            // id 에 공백이 들어가면 aria-labelledby 가 여러 id 로 갈라진다: 순번만 쓴다
            const gid = `${uid}-g-${gi}`
            return (
              <div key={`${g.place}-${g.label}`} role="group" aria-labelledby={gid} className={s.group}>
                <div id={gid} className={s.groupHead}>
                  {q && <i className="mark" style={{ ['--c' as string]: placeColor(g.place) }} aria-hidden="true" />}
                  {g.label}
                  {g.more > 0 && <span className={s.more}>외 {g.more}건</span>}
                </div>
                {g.options.map((opt, oi) => {
                  const i = starts[gi] + oi
                  return (
                    <div
                      key={opt.key}
                      id={optionId(i)}
                      role="option"
                      aria-selected={i === active}
                      data-index={i}
                      className={s.option}
                      onPointerMove={() => setActive(i)}
                      onClick={() => choose(opt)}
                    >
                      {!q && <i className="mark" style={{ ['--c' as string]: placeColor(opt.place) }} aria-hidden="true" />}
                      <span className={s.optTitle}>{opt.title}</span>
                      <span className={s.optMeta}>
                        {opt.meta}
                        {opt.sample && <span className="sample-badge">예시</span>}
                      </span>
                      {/* 고른 줄에만 보인다: Enter 로 연다 (아래 키 안내와 같은 내용이라 읽지 않는다) */}
                      <kbd className={s.optEnter} aria-hidden="true">
                        ↵
                      </kbd>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <p className={s.keys} aria-hidden="true">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> 이동
        </span>
        <span>
          <kbd>Enter</kbd> 열기
        </span>
        <span>
          <kbd>Esc</kbd> 닫기
        </span>
      </p>
      <span className="visually-hidden" role="status">
        {status}
      </span>
    </dialog>
  )
}
