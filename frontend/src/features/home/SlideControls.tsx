/** 넘기기 버튼 그림 (첫 화면 슬라이드 · 다가오는 일정 · 프로젝트 줄이 같이 쓴다). 꾸밈이라 aria-hidden, 이름은 버튼의 aria-label */

export function Chevron({ dir, size = 18 }: { dir: 'prev' | 'next' | 'up' | 'down'; size?: number }) {
  const d = { prev: 'M10 3L5 8l5 5', next: 'M6 3l5 5-5 5', up: 'M3 10l5-5 5 5', down: 'M3 6l5 5 5-5' }[dir]
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 멈춤(두 줄) · 다시 시작(세모) */
export function PlayPause({ paused }: { paused: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      {paused ? <path d="M5 3.5v9l7-4.5z" fill="currentColor" /> : <path d="M5 3.5v9M11 3.5v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  )
}
