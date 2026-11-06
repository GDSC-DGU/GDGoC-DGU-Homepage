/**
 * 글자 대신 쓰는 작은 그림 (hallmark 30a: 유니코드 글자 · 이모지를 아이콘으로 쓰지 않는다).
 * - QuoteMark: 회고 카드 왼쪽 위 큰 따옴표
 * - Chevron: 줄 · 띠 전체가 링크일 때 오른쪽 끝 칸에 두는 꺾쇠 (글자 뒤에 붙이지 않는다, hallmark 63)
 * 색은 글자색(currentColor)을 따르고, 읽기 프로그램은 건너뛴다.
 */
export function QuoteMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 24" width="32" height="24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M0 24V14.4C0 6.6 4.2 1.6 11.6 0l1.6 3.4C9 4.8 6.9 7.6 6.6 11.2H13V24H0Zm19 0V14.4C19 6.6 23.2 1.6 30.6 0l1.4 3.4c-4.2 1.4-6.3 4.2-6.6 7.8H32V24H19Z"
      />
    </svg>
  )
}

export function Chevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
