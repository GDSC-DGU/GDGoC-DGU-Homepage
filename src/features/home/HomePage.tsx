import { CapabilitySection } from './CapabilitySection'
import { HeroSection } from './HeroSection'
import { ProjectsSection } from './ProjectsSection'
import { VoicesSection } from './VoicesSection'

/**
 * 홈 (4기 Figma 시안 2026-11): 흰 → 흰 → 옅은 회색 → 흰 → 회색 꼬리말.
 * 1 첫 화면: 가운데 이름(로고가 벌어지며 'GDGoC DGU') · 정식 이름 · 짧은 소개 → 캠퍼스 지도(사이트맵)를 화면 폭 가득
 * 2 프로젝트: 대표 작품 몇 개만 (전부는 /projects)
 * 3 Interview: 지난 기수 멤버의 리뷰가 자동으로 넘어간다 (동의를 받은 리뷰가 없으면 공개 사이트에서는 숨김)
 * 4 GDGoC DGU 역량: 네 파트 카드
 * 활동 · 일정 · 지원 안내는 각 페이지가 맡는다 (홈 끝에 '{gen}기에서 만나요' 를 붙이지 않는다).
 */
export function HomePage() {
  return (
    <>
      <HeroSection />
      <ProjectsSection />
      <VoicesSection />
      <CapabilitySection />
    </>
  )
}
