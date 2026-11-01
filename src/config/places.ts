import type { Place, PlaceId } from '@/domain/types'

/**
 * 지도 = 메뉴.
 * 장소 하나가 메뉴 하나, 건물 하나, 이름표 하나, 미리보기 패널 하나가 된다.
 * 장소를 더하려면: domain/types.ts 의 PlaceId 에 이름 추가 → 여기 한 줄 → config/pages.ts 에 페이지 계획.
 * 격자는 14×14, 가운데 6.2~7.8 줄이 십자 보행로, 5~9 칸이 광장이다.
 */
export const PLACES: readonly Place[] = [
  {
    id: 'about',
    label: 'GDGoC DGU',
    sub: '소개',
    path: '/',
    color: '#212121',
    description: '동국대학교 학생이 운영하는 Google Developer Groups on Campus 챕터입니다. 4기는 화요일 세션과 팀 프로젝트 G-Sprint로 움직입니다.',
  },
  {
    id: 'community',
    label: '커뮤니티',
    sub: '공지 · 세션 · 행사',
    path: '/community',
    color: '#4285f4',
    description: '공지와 세션 자료, 행사 소식을 한곳에 모읍니다.',
    footprint: { x: 0.9, y: 0.9, w: 3.4, d: 3.0, h: 1.5, door: 'R', roof: 'screen', pinGap: 0.75 },
  },
  {
    id: 'projects',
    label: '프로젝트',
    sub: '팀 프로젝트 모음',
    path: '/projects',
    color: '#ea4335',
    live: true,
    description: '4기 G-Sprint 팀 프로젝트와 지난 기수 프로젝트를 모읍니다. 4기 결과는 12.29 데모데이에서 공개합니다.',
    footprint: { x: 9.7, y: 0.9, w: 3.4, d: 3.2, h: 1.25, door: 'L', roof: 'saw', pinGap: 1.05 },
  },
  {
    // '팀원 모집' 은 동아리 모집으로 읽혀서(2026-10 점검) 멤버끼리 팀을 찾는 게시판이라는 뜻이 드러나게 '팀원 찾기'
    id: 'teams',
    label: '팀원 찾기',
    sub: '멤버끼리 팀 꾸리기',
    path: '/teams',
    color: '#fbbc04',
    description: '멤버끼리 스터디 · 프로젝트 · 공모전 팀원을 찾는 게시판입니다. 아직 준비 중이고, 동아리 지원은 지원 안내에서 합니다.',
    footprint: { x: 0.9, y: 9.7, w: 3.4, d: 3.4, h: 0.95, door: 'R', roof: 'arch', pinGap: 0.7 },
  },
  {
    id: 'recruits',
    label: '지원 안내',
    sub: '5기 모집',
    path: '/recruits',
    color: '#34a853',
    description: '모집 일정과 지원 방법, 지난 모집 과정을 안내합니다.',
    footprint: { x: 9.8, y: 9.8, w: 2.7, d: 2.7, h: 1.05, door: 'L', roof: 'gable', pinGap: 0.7 },
  },
]

export const PLACE_BY_ID: Readonly<Record<PlaceId, Place>> = Object.fromEntries(
  PLACES.map((p) => [p.id, p]),
) as Record<PlaceId, Place>

/**
 * 메뉴 순서: 둘러보기(홈 · 프로젝트 · 커뮤니티) → 지원 안내 → 아직 열지 않은 팀원 찾기.
 * 처음 온 사람이 '무엇을 하는지 → 어떻게 들어가는지' 순서로 읽게 하고, 준비 중인 게시판은 맨 끝에 둔다.
 * (배범서 기획 순서 Home · Projects · Teams · Community · Recruits 에서 바꿈: 2026-10 점검에서
 *  지원 안내 앞의 '팀원 모집' 을 동아리 모집으로 잘못 누르는 일이 있었다)
 * 머리말 · 폰 메뉴에서는 지원 안내를 메뉴 줄 대신 오른쪽 '지원 안내' 버튼(APPLY_PLACE)으로 보인다.
 */
export const NAV_ORDER: readonly PlaceId[] = ['about', 'projects', 'community', 'recruits', 'teams']

/** 머리말 오른쪽 · 폰 메뉴 아래에 늘 보이는 지원 행동이 가리키는 장소 */
export const APPLY_PLACE: PlaceId = 'recruits'

/** 아직 열지 않은 장소: 메뉴 이름 옆에 작은 '준비 중' 표시를 붙인다 */
export const SOON_PLACES: ReadonlySet<PlaceId> = new Set<PlaceId>(['teams'])
export const SOON_LABEL = '준비 중'

/** 메뉴에 보이는 이름: 소개 장소는 메뉴에서 '홈' */
export const navLabel = (id: PlaceId) => (id === 'about' ? '홈' : PLACE_BY_ID[id].label)

/**
 * 넓은 화면 머리말 메뉴 (4기 Figma 시안 2026-11): 로고가 홈, 오른쪽에 네 메뉴. 지원 안내는 '지원하기' 로 메뉴 줄 끝에.
 * 폰 메뉴 시트 · 꼬리말 · 검색은 NAV_ORDER 를 그대로 쓴다.
 */
export const HEADER_NAV: readonly PlaceId[] = ['projects', 'community', 'teams', 'recruits']
export const headerLabel = (id: PlaceId) => (id === 'recruits' ? '지원하기' : navLabel(id))

/** 화면에 칠할 색. 소개 장소의 잉크색은 토큰을 따른다 */
export const placeColor = (id: PlaceId) => (id === 'about' ? 'var(--ink)' : PLACE_BY_ID[id].color)

/**
 * 처음 열려 있을 장소: 소개.
 * 처음 온 사람이 '무슨 동아리인지'부터 보게 한다 (리뷰: 신입생 · 외부 협업 관점)
 */
export const DEFAULT_PLACE: PlaceId = 'about'
