import type { CSSProperties, ReactNode } from 'react'
import { StorySection } from '@/features/common'
import { PARTS, type Part } from '@/features/pages/recruits/parts'
import s from './capability.module.css'

/**
 * GDGoC DGU 역량 (4기 Figma 시안 2026-11): 네 파트 카드 PD · AI & ML · FE · BE.
 * 카드: 파트가 하는 일(recruits/parts.ts role, PD 는 홈에서만 따로) → 다루는 것 세 줄. 네 카드 높이를 맞추려고 한 일은 두 줄 안팎으로.
 * 다루는 것은 실제 기록에서 고른다: 지난 프로젝트 stack · 2기 회고(Notion Retrospective)에 나온 파트 스터디 · 세미나 주제.
 * Product Design 은 4기에 새로 생긴 파트라 지난 기록이 없어, 파트가 맡는 일의 범위로 적는다 (4기 Organizer 확인 필요).
 * 아이콘 색은 구글 4색 (시안). 아이콘은 꾸밈이라 읽지 않는다.
 */

interface Card {
  part: Part['id']
  /** 카드 제목 (시안의 짧은 이름) */
  short: string
  /** 다루는 것 (세 줄) */
  items: readonly string[]
  /** 하는 일 (비우면 recruits/parts.ts 의 role) */
  role?: string
  /** 아이콘 색 (구글 4색) · 옅은 판 */
  color: string
  icon: ReactNode
}

const CARDS: readonly Card[] = [
  {
    part: 'design',
    short: 'PD',
    role: '기획을 하고 사용자 흐름과 화면을 설계합니다.',
    items: ['문제 정의와 사용자 흐름 설계', '와이어프레임 · 프로토타입으로 화면 설계', '개발 파트와 함께 화면을 서비스로 완성'],
    color: 'var(--g-red)',
    icon: <path d="M5 19l1.2-4.6L15.8 4.8a1.6 1.6 0 0 1 2.3 0l1.1 1.1a1.6 1.6 0 0 1 0 2.3L9.6 17.8 5 19zM14 6.6l3.4 3.4" />,
  },
  {
    part: 'ai',
    short: 'AI & ML',
    items: ['Gemini · Vertex AI로 서비스에 AI 기능 연결', 'CV · NLP 분야 지식과 논문 읽는 법 공유', '모델을 실제 서비스 기능으로 활용'],
    color: 'var(--g-yellow)',
    icon: (
      <>
        <circle cx="6" cy="12" r="2.2" />
        <circle cx="18" cy="6" r="2.2" />
        <circle cx="18" cy="12" r="2.2" />
        <circle cx="18" cy="18" r="2.2" />
        <path d="M8.1 11.1l7.8-4.2M8.2 12h7.6M8.1 12.9l7.8 4.2" />
      </>
    ),
  },
  {
    part: 'frontend',
    short: 'FE',
    items: ['React · Next.js로 실제 서비스 화면 구현', 'TanStack Query 등 파트 스터디', '사용자가 쓰기 편한 화면과 인터랙션'],
    color: 'var(--g-blue)',
    icon: (
      <>
        <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
        <path d="M3 9h18M10 13l-2 1.8 2 1.8M14 13l2 1.8-2 1.8" />
      </>
    ),
  },
  {
    part: 'backend',
    short: 'BE',
    items: ['Spring Boot · FastAPI로 API 서버 구현', 'Docker와 보안을 고려한 프로젝트 구조', '데이터베이스 설계와 서버 배포'],
    color: 'var(--g-green)',
    icon: (
      <>
        <ellipse cx="12" cy="6" rx="7" ry="2.6" />
        <path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" />
      </>
    ),
  },
]

export function CapabilitySection() {
  return (
    <StorySection
      id="capability"
      className={s.section}
      placeColor={null}
      title="GDGoC DGU 역량"
      sub="네 파트로 나뉘어 각자의 분야를 깊게 파고, G‑Sprint에서는 팀을 꾸려 기획부터 배포까지 하나의 서비스를 직접 만듭니다."
    >
      <ul className={s.cards}>
        {CARDS.map((c) => {
          const part = PARTS.find((p) => p.id === c.part)
          if (!part) return null
          return (
            <li key={c.part} className={s.card} style={{ '--c': c.color } as CSSProperties}>
              <span className={s.icon} aria-hidden="true">
                <svg viewBox="0 0 24 24">{c.icon}</svg>
              </span>
              <h3 className={s.name}>
                {c.short}
                <span className={s.full} lang="en">
                  {part.name}
                </span>
              </h3>
              <p className={s.role}>{c.role ?? part.role}</p>
              <ul className={s.items} aria-label={`${c.short} 파트가 다루는 것`}>
                {c.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>
    </StorySection>
  )
}
