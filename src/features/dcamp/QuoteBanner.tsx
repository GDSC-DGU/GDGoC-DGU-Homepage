import type { ReactNode } from 'react'
import s from './quoteBanner.module.css'

/** 회색 띠 한 문장 (dcamp 'How We Work' 아래 띠): 가운데 흰 글자, 모서리에 옅은 곡선 장식 */
export function QuoteBanner({ children }: { children: ReactNode }) {
  return (
    <div className="container">
      <div className={s.banner}>
        <svg className={s.deco} viewBox="0 0 1216 120" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 18h48a24 24 0 0 1 24 24v78" />
          <path d="M1216 70h-64a24 24 0 0 0-24 24v26" />
          <path d="M640 120v-16a24 24 0 0 1 24-24h176" />
        </svg>
        <p className={s.text}>{children}</p>
      </div>
    </div>
  )
}
