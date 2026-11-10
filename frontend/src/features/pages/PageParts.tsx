import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import s from './pages.module.css'

/**
 * 하위 페이지 공통 조각 (docs/DESIGN.md 5장).
 * 섹션은 두 가지다.
 * - 이야기 섹션: 이름표 → 주장 제목(48) → 한 줄 → 12칸 내용. 면(흰 · 옅은 회색 · 먹색)으로 나눈다 → common/StorySection
 * - 참고 섹션(여기 Section): FAQ · 일정 목록 · 지원 과정 · 기록. 1px 괘선 + 28px 제목, 섹션 사이 96
 * 페이지는 머리말 · 꼬리말 없이 본문만 그리고(AppLayout 이 감싼다), 맨 끝에 common/JoinStrip 을 직접 넣는다 (/recruits 제외).
 */

/** 장소 표식: 8px 네모 */
export function Mark({ color }: { color: string }) {
  return <span className="mark" style={{ '--c': color } as CSSProperties} aria-hidden="true" />
}

/**
 * 페이지 머리 (건물 장면이 없는 페이지: 오류 · 찾을 수 없음 · 관리자): 장소 표식 + 부제 / h1 / 리드 / 기준 줄.
 * 건물이 있는 장소 페이지는 placehero/PlaceHero 를 쓴다.
 * wide: 제목이 긴 페이지(오류 등)는 제목을 넓게 쓰고 리드를 그 아래에 둔다.
 */
export function PageHead({
  mark,
  eyebrow,
  title,
  lead,
  meta,
  wide = false,
}: {
  mark?: string
  eyebrow: ReactNode
  title: ReactNode
  lead?: ReactNode
  meta?: ReactNode
  wide?: boolean
}) {
  return (
    <header className={`${s.head} ${wide ? s.headWide : ''}`}>
      <p className={s.eyebrow}>
        {mark && <Mark color={mark} />}
        {eyebrow}
      </p>
      <h1 className={s.title}>{title}</h1>
      {lead && <p className={s.lead}>{lead}</p>}
      {meta && <p className={s.meta}>{meta}</p>}
    </header>
  )
}

/**
 * 참고 섹션: 1px 괘선 + 제목(28) + 한 줄 설명, 섹션 사이 96 (폰 64).
 * head: top(기본) = 머리를 위에, 내용은 12칸 전체 (일정 줄 · 단계 그림처럼 넓은 내용)
 *       side = 머리는 왼쪽 3칸, 내용은 4~12칸 (FAQ · 짧은 목록). 1023 이하에서는 위아래로 쌓는다
 * aside: 머리 오른쪽 끝(side 면 설명 아래)에 붙는 짧은 것 (거르기 · 작은 숫자).
 * quiet: 마지막 짧은 안내처럼 덜 중요한 섹션 (제목 한 단계 작게).
 * 이야기 섹션(주장 제목 48 · 면)은 common/StorySection 을 쓴다.
 */
export function Section({
  id,
  title,
  desc,
  aside,
  head = 'top',
  quiet = false,
  children,
}: {
  id: string
  title: ReactNode
  desc?: ReactNode
  aside?: ReactNode
  head?: 'top' | 'side'
  /** 마지막 짧은 안내처럼 덜 중요한 섹션 */
  quiet?: boolean
  children: ReactNode
}) {
  const titleId = `${id}-title`
  return (
    <section id={id} className={`${s.section} ${head === 'side' ? s.sectionSide : ''} ${quiet ? s.sectionQuiet : ''}`} aria-labelledby={titleId}>
      <div className={s.sectionHead}>
        <div className={s.sectionTitle}>
          <h2 id={titleId}>{title}</h2>
          {desc && <p>{desc}</p>}
        </div>
        {aside && <div className={s.sectionAside}>{aside}</div>}
      </div>
      <div className={s.sectionBody}>{children}</div>
    </section>
  )
}

/**
 * 사이트 밖으로 나가는 링크: 새 탭, rel=noreferrer.
 * context 는 화면 읽기 프로그램에만 읽힌다 ('자세히' 가 여러 개일 때 무엇의 자세히인지).
 */
export function ExternalLink({ href, children, context, className = 'link' }: { href: string; children: ReactNode; context?: string; className?: string }) {
  return (
    <a className={`${className} ${s.ext}`} href={href} target="_blank" rel="noreferrer">
      <span className={s.extText}>{children}</span>
      <span className="visually-hidden">
        {context ? `: ${context}` : ''} (새 창)
      </span>
    </a>
  )
}

/** 불러오는 중 · 실패 · 비어 있음 한 줄 */
export function StateLine({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <p className={s.state} role="status">
      {children}
      {onRetry && (
        <>
          {' '}
          <button type="button" className="link" onClick={onRetry}>
            다시 시도
          </button>
        </>
      )}
    </p>
  )
}

export interface ToggleOption<T extends string> {
  id: T
  label: ReactNode
  /** 화면 읽기 프로그램용 이름 (label 이 숫자만 있을 때 등) */
  count?: number
}

/** 칸 하나의 글자 (진짜 버튼과 먹색 판 위 흰 글자 사본이 같은 모양을 쓴다) */
function SegText({ label, count, spoken }: { label: ReactNode; count?: number; spoken: boolean }) {
  return (
    <>
      {label}
      {count !== undefined && (
        <span className={`${s.count} num`}>
          {spoken && <span className="visually-hidden"> </span>}
          {count}
          {spoken && <span className="visually-hidden">건</span>}
        </span>
      )}
    </>
  )
}

/**
 * 거르기 버튼 묶음 (기수 · 종류 · 연도 모두 같은 모양). 누른 상태는 aria-pressed 로 알린다.
 * 붙어 있는 칸 하나짜리 조작부이고, 칸마다 높이 44 이상. 폰에서 넘치면 가로로 밀어 본다.
 *
 * 누른 칸 표시(먹색 판)는 다른 칸을 누르면 그 칸으로 미끄러진다 (200ms, 머리말 메뉴 밑줄과 같은 '지금 여기' 움직임).
 * 먹색 판 = 흰 글자 사본 한 줄을 누른 칸 크기로 잘라 보이는 것 (clip-path). 그래서 판이 지나가는 동안에도 글자 색이 칸마다 맞다.
 * 칸 위치는 글꼴이 늦게 와도 맞도록 ResizeObserver 로 다시 잰다. '동작 줄이기'면 바로 옮겨 간다 (CSS).
 */
export function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly ToggleOption<T>[]
  value: T
  onChange: (v: T) => void
}) {
  const labelId = useId()
  const groupRef = useRef<HTMLDivElement>(null)
  const [clip, setClip] = useState<{ l: number; r: number } | null>(null)
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    const g = groupRef.current
    if (!g) return
    const measure = () => {
      const b = g.querySelector<HTMLElement>('button[aria-pressed="true"]')
      if (!b) return setClip(null)
      setClip({ l: b.offsetLeft, r: g.clientWidth - b.offsetLeft - b.offsetWidth })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(g)
    return () => ro.disconnect()
  }, [value, options])

  // 처음 자리를 잡은 다음 프레임부터 미끄러짐을 켠다 (페이지가 열릴 때 판이 0에서 날아오지 않게)
  useLayoutEffect(() => {
    if (!clip || ready) return
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [clip, ready])

  return (
    <div className={s.filterRow}>
      <span className={s.filterLabel} id={labelId}>
        {label}
      </span>
      <div className={s.scroller}>
        <div ref={groupRef} role="group" aria-labelledby={labelId} className={s.segmented} data-slide={clip ? '' : undefined}>
          {options.map((o) => (
            <button key={o.id} type="button" aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
              <SegText label={o.label} count={o.count} spoken />
            </button>
          ))}
          {clip && (
            <div
              className={s.segInk}
              aria-hidden="true"
              data-ready={ready || undefined}
              style={{ clipPath: `inset(0 ${clip.r}px 0 ${clip.l}px)` }}
            >
              {options.map((o) => (
                <span key={o.id} className={s.segInkItem}>
                  <SegText label={o.label} count={o.count} spoken={false} />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
