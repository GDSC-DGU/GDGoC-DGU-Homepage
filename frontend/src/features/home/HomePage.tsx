import { usePageTitle } from '@/hooks/usePageTitle'
import { AboutNumbers } from './AboutNumbers'
import { ActivityGrid } from './ActivityGrid'
import { HomeHero } from './HomeHero'
import { JoinPanel } from './JoinPanel'
import { ProjectRail } from './ProjectRail'
import { useReveal } from './useReveal'

/**
 * 홈 (4기 Organizer 2026-11-16: 양이 너무 많다 → 슈어소프트테크 홈처럼 섹션 다섯 개로. 캠퍼스 지도도 홈에서 뺀다).
 * 1 첫 화면: 이름 + 한 줄 + 사진 슬라이드 (챕터 · 다음 행사 · 다음 모집)
 * 2 하는 일: 큰 카드 다섯 장 (정기 세션 · G-Sprint · 멤버 세미나 · Solution Challenge · 연합 행사)
 * 3 팀 프로젝트: 옆으로 넘기는 카드 줄 (옅은 회색 면)
 * 4 소개 한 문단 + 숫자 셋
 * 5 지원 띠
 * 움직임도 슈어소프트테크 그대로 (4기 Organizer 2026-11-16): 첫 화면 차례로 올라오기 · 3D 원통 5초 넘김 · 일정 한 줄 4초 넘김 ·
 * 섹션 떠오르기(AOS fade-up) · 프로젝트 줄 5초 넘김 · 숫자 올라가기 · 로고 흐름 · 내리면 머리말 숨김. '동작 줄이기'면 모두 멈춘다.
 * 문구는 content/home.ts. 예전 섹션(회고 · 멤버 세미나 · 다가오는 일정 · 행사 사진 · {n}기의 1년 · Impact · 소식 띠)은 홈에서만 뺐다.
 * 회고는 지원하기, 세미나는 아카이브, 일정 · 연혁은 소개에 그대로 있다.
 */
export function HomePage() {
  usePageTitle()
  useReveal()
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
