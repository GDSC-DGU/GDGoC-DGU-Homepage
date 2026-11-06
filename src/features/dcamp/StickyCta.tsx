import type { ReactNode } from 'react'
import s from './stickyCta.module.css'

/** 화면 아래에 붙은 띠 (dcamp batch: 왼쪽 'dcamp batch' · 오른쪽 신청 단추). 페이지 끝 꼬리말 위에서 멈춘다 */
export function StickyCta({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className={s.bar}>
      <div className={`container ${s.inner}`}>
        <p className={s.label} lang="en">
          {label}
        </p>
        <div className={s.action}>{children}</div>
      </div>
    </div>
  )
}
