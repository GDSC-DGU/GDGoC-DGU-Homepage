import { HeroSection } from './HeroSection'
import { ImpactSection } from './ImpactSection'
import { NewsBand } from './NewsBand'
import { ProjectsSection } from './ProjectsSection'
import { SeminarWall } from './SeminarWall'
import { TimelineSection } from './TimelineSection'
import { UpcomingCards } from './UpcomingCards'
import { VoicesSection } from './VoicesSection'
import { PhotoStrip } from '@/features/common'
import { usePageTitle } from '@/hooks/usePageTitle'

/**
 * 홈 (4기 Organizer 2026-11-06: dcamp.kr 홈 구성을 따른다. 첫 화면 · 지도 · 프로젝트는 그대로).
 * 1 첫 화면: 가운데 이름(로고가 벌어지며 'GDGoC DGU') · 정식 이름 · 짧은 소개 → 캠퍼스 지도
 * 2 프로젝트: 대표 작품 몇 개만 (전부는 /archive) · 3 멤버 회고(회색) · 4 멤버 세미나
 * 5 다가오는 일정(회색): dcamp 'Accelerating your growth' 처럼 영문 세 줄 | 엇갈린 흰 카드
 * (행사 사진) · 6 {n}기의 1년(세로줄 + 구름 마스코트)
 * 7 Impact: 숫자 카드 2 × 2 (dcamp) · 8 소식 띠: 인스타그램 (dcamp 뉴스레터 자리)
 */
export function HomePage() {
  usePageTitle()
  return (
    <>
      <HeroSection />
      <ProjectsSection />
      <VoicesSection />
      <SeminarWall />
      <UpcomingCards />
      <PhotoStrip />
      <TimelineSection />
      <ImpactSection />
      <NewsBand />
    </>
  )
}
