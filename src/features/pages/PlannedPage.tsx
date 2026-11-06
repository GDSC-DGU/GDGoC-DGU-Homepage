import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PAGE_PLANS, type PagePlan, type PagePlanId } from '@/config/pages'
import { NAV_ORDER, PLACE_BY_ID, navLabel, placeColor } from '@/config/places'
import { SHOW_PLAN } from '@/config/site'
import { CONTENT_UPDATED_AT } from '@/content'
import type { PlaceId } from '@/domain/types'
import { JoinStrip } from '@/features/common'
import { PageHero } from '@/features/pagehero/PageHero'
import { useToday } from '@/hooks/useToday'
import { DetourLink } from './community/Signage'
import { dateLabel } from './format'
import { Mark, PageHead, Section } from './PageParts'
import s from './pages.module.css'
import { usePageTitle } from '@/hooks/usePageTitle'

/** 지금 열려 있는 페이지와 그 페이지에서 볼 수 있는 것 */
const OPEN_PAGES: Partial<Record<PlaceId, string>> = {
  about: '캠퍼스 지도와 대표 프로젝트',
  projects: '지난 프로젝트와 세미나 발표',
  community: '다가오는 일정과 기수별 행사 기록',
  teams: '프로젝트, 스터디 팀원 모집 글',
  recruits: '지원 자격, 지난 모집 기록, 자주 묻는 질문',
}

/** 지금 볼 수 있는 페이지로 가는 줄 목록 (찾을 수 없음 페이지). 사이트 안 이동이라 화살표는 없다 */
function Destinations() {
  const ids = NAV_ORDER.filter((id) => OPEN_PAGES[id])
  return (
    <ul className={s.destinations}>
      {ids.map((id) => (
        <li key={id}>
          <Link to={PLACE_BY_ID[id].path} className={s.destination}>
            <span className={s.destName}>
              <Mark color={placeColor(id)} />
              {navLabel(id)}
            </span>
            <span className={s.destDesc}>{OPEN_PAGES[id]}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** 팀 내부용 기획 메모. 외부 방문자에게는 보이지 않는다 (SHOW_PLAN: npm run dev 또는 VITE_SHOW_PLAN=true) */
function PlanNotes({ id, plan }: { id: PagePlanId; plan: PagePlan }) {
  return (
    <Section id={`${id}-plan`} title="팀 기획 메모" desc={`개발 화면에서만 보입니다. 와이어프레임 ${plan.wireframe}`} quiet>
      <div className={s.notes}>
        <h3>들어갈 기능</h3>
        <ul>
          {plan.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        {plan.open && (
          <>
            <h3>팀에서 정할 것</h3>
            <ul>
              {plan.open.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Section>
  )
}

/**
 * 준비 중 페이지 머리의 리드 (config/pages.ts 의 lead 대신).
 * 팀원 찾기는 이름 때문에 동아리 모집 페이지로 오는 사람이 있어서(2026-10 점검), 동아리 멤버를 뽑는 곳이 아니라는 말과
 * 지원 안내로 가는 길을 첫 화면에 둔다.
 */
const LEADS: Partial<Record<PagePlanId, ReactNode>> = {
  teams: (
    <>
      GDGoC DGU 멤버끼리 스터디, 프로젝트, 공모전을 같이할 팀원을 찾는 게시판입니다. 동아리 멤버를 뽑는 곳은 아닙니다.
      <DetourLink to={PLACE_BY_ID.recruits.path} place="recruits">
        동아리 지원은 지원 안내에서
      </DetourLink>
    </>
  ),
}

/**
 * 아직 열지 않은 페이지 (/teams).
 * 무엇이 될지 · 지금 상태 · 여는 시기(미정) · 먼저 알릴 곳만 적는다 (DESIGN 10장).
 * 지도에 건물이 있는 장소(팀원 찾기)는 짧게: 공사 중인 건물 머리 → JoinStrip 변형 하나('팀원 찾기는 준비하고 있습니다'
 * + 소식 받기 · 지원 안내 보기 | 열리면 생길 것 세 줄) → 꼬리말. 지금 상태 · 여는 시기 · 먼저 알릴 곳은 JoinStrip 한 줄이 말한다.
 */
export function PlannedPage({ id }: { id: PagePlanId }) {
  const today = useToday()
  const plan: PagePlan = PAGE_PLANS[id]
  usePageTitle(plan.title)
  const place = 'place' in plan ? plan.place : undefined
  const meta = (
    <>
      <span className={s.statusTag}>준비 중</span> <span className="num">{dateLabel(CONTENT_UPDATED_AT, null, today)}</span> 기준
    </>
  )

  // 지금 계획된 페이지는 모두 지도 장소(팀원 찾기). 관리자 화면(/admin)은 features/admin 이 따로 그린다
  if (!place) return <NotFoundPage />

  return (
    <div className={`container ${s.page}`}>
      {/* 이름 · 부제는 지도 장소(config/places.ts)와 같게: 메뉴 · 지도 이름표 · 이 페이지가 한 이름을 쓴다 */}
      <PageHero place={place} title={PLACE_BY_ID[place].label} lead={LEADS[id] ?? plan.lead} meta={meta} />

      {/* 개발 화면에서만: 팀 기획 메모 (JoinStrip 뒤에 두면 꼬리말 위에 흰 여백이 생겨 앞에 둔다) */}
      {SHOW_PLAN && <PlanNotes id={id} plan={plan} />}

      <JoinStrip variant={id === 'teams' ? 'teams' : 'default'} />
    </div>
  )
}

/** 없는 주소. 머리말 · 꼬리말 안에서 보인다 */
export function NotFoundPage() {
  const { pathname } = useLocation()
  usePageTitle('페이지 없음')
  return (
    <div className={`container ${s.page}`}>
      <PageHead
        wide
        eyebrow={<span className="num">404</span>}
        title="이 주소에는 페이지가 없습니다"
        lead="주소가 바뀌었거나 없는 페이지입니다."
        meta={
          <>
            요청한 주소 <code className={s.path}>{pathname}</code>
          </>
        }
      />
      <Section id="elsewhere" title="갈 수 있는 곳">
        <Destinations />
      </Section>
    </div>
  )
}
