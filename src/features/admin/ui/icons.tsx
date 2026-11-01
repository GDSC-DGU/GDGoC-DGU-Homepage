/**
 * 관리자 화면 작은 아이콘 (16px, currentColor). 모두 꾸밈이라 aria-hidden: 뜻은 옆 글자가 말한다.
 * 상태 배지는 색만으로 구분하지 않도록 아이콘 모양이 서로 다르다 (체크 · 엑스 · 세모 · 점선 원 · 자물쇠 · 빼기).
 */
import type { ReactNode } from 'react'

type P = { className?: string }
/** 채운 아이콘 안의 표시(체크 · 엑스 · 느낌표) 색: 기본 흰색, 어두운 판(토스트) 위에서는 --icon-on 으로 바꾼다 */
const ON = { stroke: 'var(--icon-on, #fff)' }
const ON_FILL = { fill: 'var(--icon-on, #fff)' }
const svg = (className: string | undefined, children: ReactNode) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
    {children}
  </svg>
)

export const IconCheckCircle = ({ className }: P) =>
  svg(
    className,
    <>
      <circle cx="8" cy="8" r="7" fill="currentColor" />
      <path d="M4.8 8.2l2.1 2.1 4.3-4.6" style={ON} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>,
  )

export const IconXCircle = ({ className }: P) =>
  svg(
    className,
    <>
      <circle cx="8" cy="8" r="7" fill="currentColor" />
      <path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" style={ON} strokeWidth="1.6" strokeLinecap="round" />
    </>,
  )

export const IconAlert = ({ className }: P) =>
  svg(
    className,
    <>
      <path d="M8 1.6l6.8 12H1.2L8 1.6z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      <path d="M8 6v3.4" style={ON} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.9" style={ON_FILL} />
    </>,
  )

export const IconErrorMark = ({ className }: P) =>
  svg(
    className,
    <>
      <circle cx="8" cy="8" r="7" fill="currentColor" />
      <path d="M8 4.4v4.4" style={ON} strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="8" cy="11.4" r="1" style={ON_FILL} />
    </>,
  )

export const IconPending = ({ className }: P) => svg(className, <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.6 2.2" />)

export const IconLock = ({ className }: P) =>
  svg(
    className,
    <>
      <rect x="2.8" y="7" width="10.4" height="7.4" rx="1.6" fill="currentColor" />
      <path d="M5.2 7V5.2a2.8 2.8 0 015.6 0V7" stroke="currentColor" strokeWidth="1.6" />
    </>,
  )

export const IconMinusCircle = ({ className }: P) =>
  svg(
    className,
    <>
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.2 8h5.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>,
  )

export const IconInfo = ({ className }: P) =>
  svg(
    className,
    <>
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="4.9" r="0.95" fill="currentColor" />
    </>,
  )

export const IconSearch = ({ className }: P) =>
  svg(
    className,
    <>
      <circle cx="7" cy="7" r="4.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.4 10.4l3.4 3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>,
  )

export const IconClose = ({ className }: P) => svg(className, <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />)

/** 정렬 표시: dir 이 없으면 위아래 둘 다 옅게 */
export const IconSort = ({ className, dir }: P & { dir?: 'asc' | 'desc' }) =>
  svg(
    className,
    <>
      <path d="M5 6.2L8 3l3 3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity={dir === 'desc' ? 0.25 : dir ? 1 : 0.45} />
      <path d="M5 9.8L8 13l3-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity={dir === 'asc' ? 0.25 : dir ? 1 : 0.45} />
    </>,
  )

export const IconUpload = ({ className }: P) =>
  svg(
    className,
    <>
      <path d="M8 10.5V2.8M4.8 5.8L8 2.6l3.2 3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.6 10.2v2a1.4 1.4 0 001.4 1.4h8a1.4 1.4 0 001.4-1.4v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>,
  )

export const IconFile = ({ className }: P) =>
  svg(
    className,
    <>
      <path d="M4 1.8h5.2L12.4 5v8.6a.6.6 0 01-.6.6H4a.6.6 0 01-.6-.6V2.4a.6.6 0 01.6-.6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9 1.8V5.2h3.4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </>,
  )

export const IconArrowLeft = ({ className }: P) => svg(className, <path d="M13 8H3.4M7.2 4L3.2 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />)

export const IconExternal = ({ className }: P) => svg(className, <path d="M6 3h7v7M13 3L3.5 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />)
