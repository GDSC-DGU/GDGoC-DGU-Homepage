import type { ReactNode } from 'react'
import s from './story.module.css'

export type StoryTone = 'paper' | 'field' | 'dark'

export interface StoryHeadProps {
  /** h2 의 id. 섹션의 aria-labelledby 가 이것을 가리킨다 */
  titleId: string
  /** 주장 제목: 실제 숫자나 사실을 담은 한 문장. 질문형 금지. 숫자는 <span className="num"> */
  title: ReactNode
  /** 제목 아래 한두 줄 (기준 · 풀이) */
  sub?: ReactNode
  /** 제목 줄 오른쪽 끝 행동 하나 (.link-go 또는 .btn-secondary). 폰에서는 아래로 내려간다 */
  action?: ReactNode
  /**
   * 제목 크기. 기본: 먹색 면은 display(64), 나머지는 section(48).
   * h2(28): 페이지의 주인공이 아닌 섹션 (큰 제목은 페이지마다 두세 개만: 화면 검토 2026-11-05)
   */
  titleSize?: 'section' | 'display' | 'h2'
  tone?: StoryTone
  /** 머리(header)에 덧붙일 class (머리 → 내용 간격을 바꿀 때) */
  headClassName?: string
}

/**
 * 이야기 섹션 머리: 제목 → 한 줄 | 오른쪽 행동 하나.
 * 제목 위 작은 이름표(eyebrow)는 두지 않는다 (AI 티 점검 2026-11-05: 섹션마다 '프로젝트' · '연혁' 같은 이름표가 붙으면 틀로 찍은 화면처럼 읽힌다).
 * 보통은 StorySection 이 그린다. 섹션 틀을 직접 짜야 할 때만 따로 쓴다 (그때도 section 에 aria-labelledby={titleId}).
 */
export function StoryHead({ titleId, title, sub, action, titleSize, tone = 'paper', headClassName = '' }: StoryHeadProps) {
  const size = titleSize ?? (tone === 'dark' ? 'display' : 'section')
  return (
    <header className={`${s.head} ${size === 'h2' ? s.headSmall : ''} ${headClassName}`}>
      <div className={s.headText}>
        <h2 id={titleId} className={`${s.headline} ${size === 'display' ? s.display : size === 'h2' ? s.small : ''}`}>
          {title}
        </h2>
        {sub && <p className={s.sub}>{sub}</p>}
      </div>
      {action && <div className={s.action}>{action}</div>}
    </header>
  )
}

export interface StorySectionProps extends Omit<StoryHeadProps, 'titleId'> {
  /** 섹션 id (주소 #id). 제목 id 는 `${id}-title` */
  id: string
  /** paper(흰) · field(옅은 회색) · dark(먹색). 같은 면 두 번 연속 금지, 먹색은 한 페이지에 하나(꼬리말 제외) */
  tone?: StoryTone
  className?: string
  children?: ReactNode
}

/**
 * 이야기 섹션 (DESIGN 5장): 머리(StoryHead) → 내용 12칸 전체.
 * 위아래 안쪽 여백 --story-pad, 머리 → 내용 --head-gap. 섹션 사이는 괘선 대신 면 바뀜 · 여백.
 * 페이지 틀(.container) 안에 넣어도, 밖(main 바로 아래)에 넣어도 같은 폭 · 같은 바탕으로 그린다.
 */
export function StorySection({ id, tone = 'paper', className = '', children, ...head }: StorySectionProps) {
  const titleId = `${id}-title`
  const toneClass = tone === 'dark' ? 'dark on-dark' : tone
  return (
    <section id={id} className={`story ${toneClass} ${className}`} aria-labelledby={titleId}>
      <div className={`container ${s.inner}`}>
        <StoryHead titleId={titleId} tone={tone} {...head} />
        {children}
      </div>
    </section>
  )
}
