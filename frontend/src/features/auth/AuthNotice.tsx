import { useEffect } from 'react'
import s from './auth.module.css'

export interface Notice {
  id: number
  text: string
  /** info: 몇 초 뒤 사라짐 · warn: 로그인 시간 안내 */
  tone: 'info' | 'warn'
  /** true 면 [닫기]를 누를 때까지 둔다 */
  sticky?: boolean
  /** 안내 옆 링크 하나 (라우터 밖이라 a 태그) */
  action?: { label: string; href: string; newTab?: boolean }
}

const AUTO_HIDE_MS = 6000

/**
 * 화면 아래 가운데 안내 한 줄 (로그인 55분 예고 · 1시간 만료 · '운영진만 쓸 수 있는 페이지예요.').
 * role="status" 라 읽기 프로그램이 하던 일을 끊지 않고 읽는다. 공개 사이트 · 관리자 화면 모두 위에 뜬다.
 */
export function AuthNotice({ notice, onClose }: { notice: Notice | null; onClose: () => void }) {
  useEffect(() => {
    if (!notice || notice.sticky) return
    const id = window.setTimeout(onClose, AUTO_HIDE_MS)
    return () => window.clearTimeout(id)
  }, [notice, onClose])

  return (
    <div className={s.noticeDock} role="status" aria-live="polite">
      {notice && (
        <div key={notice.id} className={s.notice} data-tone={notice.tone}>
          <p className={s.noticeText}>{notice.text}</p>
          {notice.action && (
            <a className={s.noticeAction} href={notice.action.href} {...(notice.action.newTab ? { target: '_blank', rel: 'noopener' } : {})}>
              {notice.action.label}
              {notice.action.newTab && <span className="visually-hidden"> (새 탭)</span>}
            </a>
          )}
          <button type="button" className={s.noticeClose} onClick={onClose}>
            닫기
          </button>
        </div>
      )}
    </div>
  )
}
