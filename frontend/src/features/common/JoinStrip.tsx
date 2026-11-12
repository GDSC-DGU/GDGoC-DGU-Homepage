import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PLACE_BY_ID } from '@/config/places'
import { SITE } from '@/config/site'
import { FAQS } from '@/content'
import { recruitStatus } from '@/content/recruitingStatus'
import { CLOSING } from '@/content/story'
import { closingStatusLine, fill, pickFaqs } from '@/features/home/homeData'
import { useToday } from '@/hooks/useToday'
import { StoryHead } from './StorySection'
import { TEAMS_JOIN, TEAMS_WILL_HAVE, joinPrimary } from './joinData'
import j from './join.module.css'
import s from './story.module.css'

const FAQ_SHOWN = 3

export interface JoinStripProps {
  /** default: 자주 묻는 질문 세 개 · teams: 그 자리에 '열리면 생길 것' 세 줄 (팀원 찾기 페이지) */
  variant?: 'default' | 'teams'
  /** 섹션 id (기본 'join'). 제목 id 는 `${id}-title` */
  id?: string
  /** 머리 문구를 바꿀 때만. 비우면 변형마다 정해진 문구 */
  title?: ReactNode
  sub?: ReactNode
}

/**
 * 페이지 끝 '{gen}기에서 만나요' (아트 디렉션 4-7): 옅은 회색 이야기 섹션 → 바로 아래 먹색 꼬리말.
 * 제목 → 모집 상태 한 문장 → 주 버튼 + 두 번째 버튼('지원 안내 보기') | 오른쪽 자주 묻는 질문 세 개.
 * - 주 버튼: 모집 중이고 지원서 주소가 있으면 '지원서 쓰기', 아니면 '{gen}기 소식 받기' (홈 마무리와 같은 링크)
 * - 질문은 펼치지 않고 지원 안내의 그 답(/recruits#faq-{id})으로 보낸다. 답은 한 곳(지원 안내)에만 있다.
 * 페이지가 <main> 맨 끝에 직접 넣는다 (/recruits 는 넣지 않는다: 페이지 자체가 같은 내용).
 */
export function JoinStrip({ variant = 'default', id = 'join', title, sub }: JoinStripProps) {
  const today = useToday()
  const status = useMemo(() => recruitStatus(today), [today])
  const handle = SITE.links.instagramHandle
  const gen = status.generation
  const primary = joinPrimary(status)
  const teams = variant === 'teams'
  const titleId = `${id}-title`
  const asideId = `${id}-aside-title`
  const faqs = teams ? [] : pickFaqs(FAQS, CLOSING.faqIds, FAQ_SHOWN)

  const head = teams
    ? { title: TEAMS_JOIN.title, sub: fill(TEAMS_JOIN.sub, { handle }) }
    : { title: fill(CLOSING.title, { gen }), sub: closingStatusLine(status, CLOSING.status, handle) }

  return (
    <section id={id} className="story field" aria-labelledby={titleId}>
      <div className={`container ${s.inner}`}>
        <div className={j.grid}>
          <div className={j.main}>
            <StoryHead
              titleId={titleId}
              tone="field"
              headClassName={j.head}
              title={title ?? head.title}
              sub={sub ?? head.sub}
            />
            <div className={`btn-row ${j.actions}`}>
              {primary.external ? (
                <a className="btn-primary" href={primary.href} target="_blank" rel="noreferrer">
                  {primary.label}
                  <span className="visually-hidden">{primary.hidden}</span>
                </a>
              ) : (
                <Link className="btn-primary" to={primary.href}>
                  {primary.label}
                </Link>
              )}
              <Link className="btn-secondary" to={PLACE_BY_ID.recruits.path}>
                지원 방법 보기
              </Link>
            </div>
          </div>

          {teams ? (
            <div className={j.aside}>
              <h3 id={asideId} className={j.asideTitle}>
                {TEAMS_JOIN.asideTitle}
              </h3>
              <ul className={j.will} aria-labelledby={asideId}>
                {TEAMS_WILL_HAVE.map((w) => (
                  <li key={w.id}>
                    <span className={j.willName}>{w.name}</span>
                    <span className={j.willDesc}>{w.desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            faqs.length > 0 && (
              <div className={j.aside}>
                <h3 id={asideId} className={j.asideTitle}>
                  자주 묻는 질문
                </h3>
                <ul className={j.faq} aria-labelledby={asideId}>
                  {faqs.map((f) => (
                    <li key={f.id}>
                      <Link to={`${PLACE_BY_ID.recruits.path}#faq-${f.id}`}>{f.q}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  )
}
