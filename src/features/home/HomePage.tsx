import { HeroSection } from './HeroSection'
import { ProjectsSection } from './ProjectsSection'
import { SeminarWall } from './SeminarWall'
import { TimelineSection } from './TimelineSection'
import { VoicesSection } from './VoicesSection'
import { PhotoStrip } from '@/features/common'
import { usePageTitle } from '@/hooks/usePageTitle'

/**
 * 홈 (4기 Figma 시안 2026-11): 흰 → 흰 → 옅은 회색 → 흰 → 회색 꼬리말.
 * 1 첫 화면: 가운데 이름(로고가 벌어지며 'GDGoC DGU') · 정식 이름 · 짧은 소개 → 캠퍼스 지도(사이트맵)를 화면 폭 가득
 * 2 프로젝트: 대표 작품 몇 개만 (전부는 /archive)
 * 3 멤버 회고: 지난 기수 멤버가 쓴 회고 세 사람 → 더 보기 (동의를 받은 회고가 없으면 공개 사이트에서는 숨김)
 * 4 멤버 세미나: 기수마다 최근 발표 제목 세 개 (전부는 /archive?view=seminars)
 * (행사 사진: content/photos.json 에 공개 동의가 기록된 사진이 있을 때만)
 * 5 {n}기의 1년: 모집 → OT → 정기 세션 → G-Sprint → 수료 한 줄 (날짜는 4기 기준)
 * 활동 · 일정 · 지원 안내는 각 페이지가 맡는다 (홈 끝에 '{gen}기에서 만나요' 를 붙이지 않는다).
 */
export function HomePage() {
  usePageTitle()
  return (
    <>
      <HeroSection />
      <ProjectsSection />
      <VoicesSection />
      <SeminarWall />
      <PhotoStrip />
      <TimelineSection />
    </>
  )
}
