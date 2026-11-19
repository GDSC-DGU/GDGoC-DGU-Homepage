import type { PlaceId } from '@/domain/types'
import { PLACE_BY_ID } from './places'

/**
 * 머리말 메뉴 · 전체 메뉴 (4기 Organizer 2026-11-16: 슈어소프트테크 머리말과 같이 메뉴마다 아래 칸을 둔다).
 * 넓은 화면(1024 이상)은 머리말 가운데 메뉴에 마우스를 올리면 아래 칸이 한꺼번에 펼쳐지고, 그보다 좁으면 오른쪽 '전체 메뉴' 버튼으로만 연다.
 * 아래 칸 주소는 지금 있는 페이지 · 섹션만 (없는 주소를 만들지 않는다).
 */
export interface MenuItem {
  label: string
  to: string
}
export interface MenuGroup {
  id: PlaceId
  label: string
  to: string
  items: readonly MenuItem[]
}

const group = (id: PlaceId, items: MenuItem[]): MenuGroup => ({ id, label: PLACE_BY_ID[id].label, to: PLACE_BY_ID[id].path, items })

export const SITE_MENU: readonly MenuGroup[] = [
  group('community', [
    { label: 'GDGoC DGU', to: '/about' },
    { label: '다가오는 일정', to: '/about#upcoming' },
    { label: '기수별 기록', to: '/about#records' },
  ]),
  group('projects', [
    { label: '프로젝트', to: '/archive' },
    { label: '세미나', to: '/archive?view=seminars' },
  ]),
  group('recruits', [
    { label: '지원 안내', to: '/recruits' },
    { label: '주요 활동', to: '/recruits#activities' },
    { label: '자주 묻는 질문', to: '/recruits#faq' },
  ]),
  group('teams', [
    { label: '모집 글', to: '/teams' },
    { label: '글쓰기', to: '/teams/write' },
  ]),
]
