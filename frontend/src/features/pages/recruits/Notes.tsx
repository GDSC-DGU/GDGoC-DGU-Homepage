import type { ReactNode } from 'react'
import k from './recruit.module.css'

/**
 * 지원 안내의 각주. 페이지 전체에 두 개까지만 쓴다 (한 해 일정의 '계획' 안내 · 파트 예를 고른 기준).
 * 출처 주소는 줄마다 달지 않고 페이지 맨 끝 출처 줄(PageSources) 한 곳에 모은다.
 */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p className={k.note}>
      <span aria-hidden="true">* </span>
      {children}
    </p>
  )
}
