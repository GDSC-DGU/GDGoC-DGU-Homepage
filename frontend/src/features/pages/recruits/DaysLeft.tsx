import { useRef } from 'react'
import { useCountUp } from '@/features/home/useReveal'

/**
 * 첫 화면 상태 줄의 '마감까지 5일' (2026-11-28): 처음 보일 때 남은 일수가 from 에서 days 까지 빠르게 줄어들며 멈춘다.
 * from 은 모집 기간 전체 일수(열린 날 → 마감)라서, '기간 중 이만큼 남았다'로 읽힌다. 열리기 전이면 열리는 날까지 센다.
 * 세는 동안의 숫자는 화면 읽기 프로그램에 읽히지 않게 가리고, 끝 숫자를 따로 적어 둔다.
 * 동작 줄이기 · 스크립트 없음이면 처음부터 끝 숫자 (useCountUp).
 */
export function DaysLeft({ days, from, what }: { days: number; from: number; what: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const span = Math.max(from - days, 0)
  const counted = useCountUp(ref, span, 600, 1400)
  if (days <= 0) return <span>{what === '마감까지' ? '오늘 마감' : '오늘 열림'}</span>
  return (
    <span>
      {what}{' '}
      <span ref={ref} className="num" aria-hidden="true">
        {from - counted}
      </span>
      <span aria-hidden="true">일</span>
      <span className="visually-hidden">{days}일</span>
    </span>
  )
}
