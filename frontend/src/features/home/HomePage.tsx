import { usePageTitle } from '@/hooks/usePageTitle'
import { AboutNumbers } from './AboutNumbers'
import { ActivityGrid } from './ActivityGrid'
import { HomeHero } from './HomeHero'
import { JoinPanel } from './JoinPanel'
import { ProjectRail } from './ProjectRail'

/**
 * 홈 (4기 Organizer 2026-11-16: 양이 너무 많다 → 슈어소프트테크 홈처럼 섹션 다섯 개로. 캠퍼스 지도도 홈에서 뺀다).
 * 1 첫 화면: 이름 + 한 줄 + 사진 슬라이드 (챕터 · 다음 행사 · 다음 모집)
 * 2 하는 일: 큰 카드 다섯 장 (정기 세션 · G-Sprint · 멤버 세미나 · Solution Challenge · 연합 행사)
 * 3 팀 프로젝트: 옆으로 넘기는 카드 줄 (옅은 회색 면)
 * 4 소개 한 문단 + 숫자 셋
 * 5 지원 띠
 * 문구는 content/home.ts. 예전 섹션(회고 · 멤버 세미나 · 다가오는 일정 · 행사 사진 · {n}기의 1년 · Impact · 소식 띠)은 홈에서만 뺐다.
 * 회고는 지원하기, 세미나는 아카이브, 일정 · 연혁은 소개에 그대로 있다.
 */
export function HomePage() {
  usePageTitle()
  return (
    <>
      <HomeHero />
      <ActivityGrid />
      <ProjectRail />
      <AboutNumbers />
      <JoinPanel />
    </>
  )
}
