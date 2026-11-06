import { useRef } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { APPLY_PLACE, NAV_ORDER, PLACE_BY_ID, navLabel, placeColor } from '@/config/places'
import { SITE } from '@/config/site'
import { RECRUITING } from '@/content'
import { ApplyLink } from './ApplyLink'
import { Wordmark } from './Wordmark'
import { useModalDialog } from './useModalDialog'
import s from './layout.module.css'

/** 다음 기수 소식 채널 (recruiting.json channel, 없으면 인스타그램) */
const channel = RECRUITING.current.channel || SITE.links.instagram

interface Props {
  open: boolean
  onClose: () => void
  /** 시트를 닫고 검색 창을 연다 */
  onSearch: () => void
}

/**
 * 폰 메뉴: 전체 화면 시트. 지도의 장소를 장소 표식 · 이름 · 한 줄 설명으로 보여준다 (줄 높이 52px).
 * 지원 행동은 목록 아래 폭 가득한 버튼으로 따로 둔다 (머리말 오른쪽 버튼과 같은 규칙: 평소 '지원 안내', 모집 중 '지원서 쓰기').
 * 맨 아래는 꼬리말과 같은 '5기 소식 받기' 하나 (사이트 전체에서 소식 채널로 가는 이름은 이것 하나).
 * <dialog> 의 showModal 이라 초점이 시트 안에만 돌고 Esc 로 닫힌다.
 */
export function MobileMenu({ open, onClose, onSearch }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const { ref, restoreFocus } = useModalDialog(open, closeRef)
  const close = () => ref.current?.close()

  return (
    <dialog
      ref={ref}
      className={s.sheet}
      aria-label="메뉴"
      onClose={() => {
        onClose()
        restoreFocus()
      }}
    >
      <div className={`container ${s.bar}`}>
        <Link className={s.brand} to="/" onClick={close}>
          <Wordmark />
          <span className="visually-hidden"> 홈</span>
        </Link>
        <div className={s.tools}>
          <button type="button" className={s.iconBtn} onClick={onSearch}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            </svg>
            <span className="visually-hidden">검색</span>
          </button>
          <button ref={closeRef} type="button" className={s.iconBtn} onClick={close}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
            <span className="visually-hidden">메뉴 닫기</span>
          </button>
        </div>
      </div>
      <nav className={`container ${s.sheetNav}`} aria-label="주요 메뉴">
        <ul>
          {NAV_ORDER.filter((id) => id !== APPLY_PLACE).map((id) => (
            <li key={id}>
              <NavLink to={PLACE_BY_ID[id].path} end={id === 'about'} className={({ isActive }) => `${s.sheetRow} ${isActive ? s.sheetActive : ''}`} onClick={close}>
                <i className="mark" style={{ ['--c' as string]: placeColor(id) }} aria-hidden="true" />
                {/* 메뉴는 이름만 (머리말과 같은 규칙: '준비 중' 표시는 꼬리말 · 그 페이지 머리에서) */}
                <span className={s.sheetName}>{navLabel(id)}</span>
                <span className={s.sheetSub}>{PLACE_BY_ID[id].sub}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <ApplyLink where="sheet" onClick={close} />
        <p className={s.sheetFoot}>
          {/* 밑줄은 글자에만. 홈 첫 화면 · 꼬리말과 같은 모양 */}
          <a className="link" href={channel} target="_blank" rel="noreferrer">
            {RECRUITING.current.generation}기 소식 받기
            
            <span className="visually-hidden"> (인스타그램, 새 창)</span>
          </a>
          <span className={s.sheetFootMeta}>인스타그램 {SITE.links.instagramHandle}</span>
        </p>
      </nav>
    </dialog>
  )
}
