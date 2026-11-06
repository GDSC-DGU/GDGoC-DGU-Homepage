import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { PLACE_BY_ID, placeColor } from '@/config/places'
import { ABOUT_FACTS } from '@/config/site'
import { PLACE_PANEL_ID } from '@/config/ui'
import { usePreviews } from '@/data/queries'
import type { PlaceId, PreviewItem } from '@/domain/types'
import { FLAG_PIN, pinAnchor } from '@/features/campus/geometry'
import { usePlacePreview, usePlacePreviewState } from '@/features/layout/placePreview'
import { useToday } from '@/hooks/useToday'
import { iso } from '@/lib/iso'
import { useCampus } from '@/state/useCampus'
import { shortDay } from './homeData'
import { placePhotos } from './placePhotos'
import { assetUrl } from '@/features/pages/projects/exhibit'
import { dockInset, placePopover, type PopoverPlacement, type Rect } from './popoverPosition'
import { revealElement } from './scrollTo'
import s from './popover.module.css'

const LATEST = 3
/** 머리말 아래 끝 (넓은 화면 80, 폰 64): 실제로 잰다 */
const headerBottom = () => document.querySelector('[data-site-header]')?.getBoundingClientRect().bottom ?? 64

/** 지도 위 이름표 자리 (틀 기준 px). 이름표가 없으면 건물 위 이름표가 있을 점 */
function anchorOf(frame: HTMLElement, id: PlaceId): Rect | null {
  const fr = frame.getBoundingClientRect()
  const plate = frame.querySelector(`[data-place-label="${id}"]`)
  const r = plate?.getBoundingClientRect()
  if (r && r.width > 0) return { left: r.left - fr.left, top: r.top - fr.top, right: r.right - fr.left, bottom: r.bottom - fr.top }
  const svg = frame.querySelector('svg')
  const ctm = svg?.getScreenCTM()
  if (!ctm) return null
  const fp = PLACE_BY_ID[id].footprint
  const at = fp ? pinAnchor(fp) : FLAG_PIN
  const [x, y] = iso(at[0], at[1], at[2] ?? 0)
  const p = new DOMPoint(x, y).matrixTransform(ctm)
  return { left: p.x - fr.left - 4, top: p.y - fr.top - 4, right: p.x - fr.left + 4, bottom: p.y - fr.top + 4 }
}

/**
 * 키보드 초점을 돌려줄 건물 (광장 깃발 포함).
 * aria-current 는 미리보기가 닫히는 순간 지워지므로, 바뀌지 않는 data-place 로 찾는다.
 */
const buildingOf = (frame: HTMLElement | null, id: PlaceId) => frame?.querySelector<SVGElement>(`[data-place="${id}"]`) ?? null

/** focus() 를 부를 수 있는 요소: HTML 버튼(검색 결과 등)과 SVG 건물(<g tabindex>) 둘 다 */
const isFocusable = (el: Element | null): el is HTMLElement | SVGElement => el instanceof HTMLElement || el instanceof SVGElement

/** 누르면 미리보기가 열리는 것들(건물 · 광장 깃발 · 이름표). 여기를 누르는 건 '바깥 클릭'이 아니다 */
export const PLACE_TRIGGER = `[aria-controls="${PLACE_PANEL_ID}"], [data-place-label]`

function Row({ item, today }: { item: PreviewItem; today: string }) {
  return (
    <li className={s.row}>
      <span className={`${s.when} ${item.date ? 'num' : ''}`}>{item.date ? shortDay(item.date, today) : item.label}</span>
      <span className={s.what}>
        <span className={s.whatText} title={item.title}>
          {item.title}
        </span>
        {item.date && item.date > today && <span className={s.soon}>예정</span>}
        {item.sample && <span className="sample-badge">예시</span>}
      </span>
    </li>
  )
}

/** 미리보기 맨 위 행사 사진 세 장 (한 줄 띠). 꾸밈이 아니라 실제 행사라 alt 를 단다 */
function Photos({ id }: { id: PlaceId }) {
  const photos = placePhotos(id)
  if (photos.length === 0) return null
  return (
    <ul className={s.photos} aria-label="행사 사진">
      {photos.map((p) => (
        <li key={p.id}>
          <img src={p.src.startsWith('https://') ? p.src : assetUrl(p.src)} alt={`${p.alt} (${p.event})`} width={p.width} height={p.height} decoding="async" />
        </li>
      ))}
    </ul>
  )
}

function Latest({ id, today }: { id: PlaceId; today: string }) {
  const about = id === 'about'
  const latest = usePreviews(about ? null : id, LATEST)
  if (about) return <>{ABOUT_FACTS.map((f) => <Row key={f.id} item={{ id: f.id, label: f.label, title: f.title }} today={today} />)}</>
  if (latest.isError) return <li className={s.state}>최근 기록을 불러오지 못했습니다</li>
  if (latest.isPending)
    return (
      <>
        {Array.from({ length: LATEST }, (_, i) => (
          <li key={i} className={s.skeleton} aria-hidden="true">
            <i />
            <i />
          </li>
        ))}
      </>
    )
  if (latest.data.length === 0) return <li className={s.state}>아직 올라온 기록이 없습니다</li>
  return <>{latest.data.map((item) => <Row key={item.id} item={item} today={today} />)}</>
}

interface Props {
  /** 지도 틀 (미리보기는 이 안에 놓인다) */
  frameRef: RefObject<HTMLDivElement | null>
  /** 폰: 이름표 옆 대신 아래에서 올라오는 시트 */
  sheet: boolean
}

/**
 * 장소 미리보기. 사람이 건물 · 이름표 · 검색 결과를 눌렀을 때만 열린다 (처음 들어왔을 때는 닫혀 있음).
 * 데스크톱은 이름표 옆에 뜨고(자리가 없으면 왼쪽 · 아래 · 위로), 폰은 아래에서 올라오는 시트다.
 * 열리면 초점이 제목으로, 닫히면 건물로 돌아간다. Esc · 닫기 버튼 · 바깥 클릭으로 닫는다.
 */
export function PlacePopover({ frameRef, sheet }: Props) {
  const { selected } = useCampus()
  const { open, reveal } = usePlacePreviewState()
  const preview = usePlacePreview()
  const today = useToday()
  const panelRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLHeadingElement>(null)
  const returnTo = useRef<Element | null>(null)
  const revealed = useRef(0)
  const [pos, setPos] = useState<PopoverPlacement | null>(null)
  const place = PLACE_BY_ID[selected]

  // 홈을 떠나면 닫는다 (다시 와도 닫힌 채로)
  useEffect(() => () => preview.hide(), [preview])

  // 검색 결과로 열면 지도를 화면 안으로
  useEffect(() => {
    const frame = frameRef.current
    if (!frame || reveal === revealed.current) return
    revealed.current = reveal
    revealElement(frame, sheet ? 'start' : 'center')
  }, [reveal, frameRef, sheet])

  // 폰: 시트가 아래 절반을 덮으므로 지도를 머리말 바로 아래로 올려 고른 건물이 보이게 한다
  useEffect(() => {
    const frame = frameRef.current
    if (!open || !sheet || !frame) return
    const top = frame.getBoundingClientRect().top
    const hb = headerBottom()
    if (top < hb - 8 || top > hb + 80) revealElement(frame, 'start', true)
  }, [open, sheet, selected, frameRef])

  // 자리를 잡은 뒤(보이게 된 뒤)에야 초점을 옮길 수 있다
  const ready = open && (sheet || pos !== null)

  // 열릴 때 · 다른 장소로 바뀔 때: 초점을 제목으로. 닫힐 때: 건물(또는 연 버튼)로
  useEffect(() => {
    if (open) {
      if (!ready) return
      const active = document.activeElement
      if (active && !panelRef.current?.contains(active)) returnTo.current = active
      headRef.current?.focus({ preventScroll: true })
      return
    }
    const back = returnTo.current
    returnTo.current = null
    if (!back) return
    const focusInside = !document.activeElement || document.activeElement === document.body || panelRef.current?.contains(document.activeElement)
    if (!focusInside) return
    // 건물 · 이름표에서 열었으면 그 자리로, 검색 등 다른 곳에서 열었으면 지도의 그 건물로
    const target = isFocusable(back) && back.isConnected && back.closest(PLACE_TRIGGER) ? back : buildingOf(frameRef.current, selected)
    target?.focus({ preventScroll: true })
  }, [open, ready, selected, frameRef])

  // 자리 잡기: 열릴 때, 장소가 바뀔 때, 틀 크기가 바뀔 때 (지도가 다시 맞춰지면 이름표도 움직인다)
  useLayoutEffect(() => {
    const frame = frameRef.current
    const panel = panelRef.current
    if (!open || sheet || !frame || !panel) return
    const place = () => {
      const anchor = anchorOf(frame, selected)
      if (!anchor) return
      const fr = frame.getBoundingClientRect()
      const visible = { top: headerBottom() - fr.top, bottom: window.innerHeight - fr.top }
      // 넓은 화면: 건물 옆이 아니라 지도 오른쪽(본문 오른쪽 끝선)에 붙여 연다 (4기 피드백 2026-11)
      setPos(placePopover({ anchor, panel: { w: panel.offsetWidth, h: panel.offsetHeight }, frame: { w: fr.width, h: fr.height }, visible, dockRight: dockInset(fr.width) }))
    }
    place()
    let raf = 0
    const queue = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(place)
    }
    const ro = new ResizeObserver(queue)
    ro.observe(frame)
    ro.observe(panel)
    const svg = frame.querySelector('svg')
    const mo = svg ? new MutationObserver(queue) : null
    if (svg) mo?.observe(svg, { attributes: true, attributeFilter: ['viewBox'] })
    // 스크롤 이야기(motion/homeStory)가 카메라를 옮기면 다시 잡는다
    window.addEventListener('campus-camera', queue)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      mo?.disconnect()
      window.removeEventListener('campus-camera', queue)
    }
  }, [open, sheet, selected, frameRef])

  // 열린 패널이 화면 아래 · 머리말 밑으로 잘리면 그만큼만 스크롤한다 (열 때 · 장소를 바꿀 때 한 번)
  const fitted = useRef<string | null>(null)
  useEffect(() => {
    const panel = panelRef.current
    if (!open || sheet || !pos || !panel) {
      if (!open) fitted.current = null
      return
    }
    if (fitted.current === selected) return
    fitted.current = selected
    const r = panel.getBoundingClientRect()
    const below = r.bottom - (window.innerHeight - 16)
    const above = headerBottom() + 16 - r.top
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    // 아래로 내리되 패널 위가 머리말 밑으로 들어가지 않을 만큼만
    if (below > 0) window.scrollBy({ top: Math.min(below, -above), behavior })
    else if (above > 0) window.scrollBy({ top: -above, behavior })
  }, [open, sheet, pos, selected])

  // Esc · 바깥 클릭으로 닫기
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('dialog[open]')) return
      preview.hide()
    }
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null
      if (!t || panelRef.current?.contains(t) || t.closest(PLACE_TRIGGER) || t.closest('dialog')) return
      preview.hide()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open, preview])

  const about = selected === 'about'
  const style = !sheet && pos ? { left: pos.left, top: pos.top } : undefined

  const panel = (
    <div
      id={PLACE_PANEL_ID}
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="place-panel-title"
      className={sheet ? s.sheet : s.pop}
      hidden={!open}
      data-placed={sheet || pos ? '' : undefined}
      style={style}
    >
      <div className={s.head}>
        <i className="mark" style={{ ['--c' as string]: placeColor(selected) }} aria-hidden="true" />
        <div className={s.titles}>
          <h2 id="place-panel-title" ref={headRef} tabIndex={-1} className={s.title}>
            {place.label}
          </h2>
          <p className={s.sub}>{place.sub}</p>
        </div>
        <button type="button" className={s.close} onClick={() => preview.hide()}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
          <span className="visually-hidden">미리보기 닫기</span>
        </button>
      </div>
      {open && <Photos id={selected} />}
      <p className={s.desc}>{place.description}</p>
      <ul className={s.list} aria-label={about ? '한눈에' : '최근 기록'}>
        {open && <Latest id={selected} today={today} />}
      </ul>
      <div className={s.foot}>
        {about ? (
          // 동아리 소개는 /about 이 맡는다 (홈 '역량' 섹션은 2026-11-05 에 '멤버 세미나'로 바뀌었다)
          <Link className="link" to="/about" onClick={() => preview.hide()}>
            소개 페이지로
          </Link>
        ) : (
          <Link className="link" to={place.path}>
            {place.label} 페이지로
          </Link>
        )}
      </div>
    </div>
  )
  // 폰 시트는 문서 맨 끝에 붙인다: 첫 화면(isolation: isolate) 안에 두면 아래 섹션 글자가 시트 위로 올라온다
  return sheet ? createPortal(panel, document.body) : panel
}
