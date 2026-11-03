/**
 * 사이트 공통 문구와 링크. 실제 주소가 정해지면 여기만 바꾼다.
 * 확인되지 않은 정보는 넣지 않는다. 값이 null 이면 화면에서 그 줄을 숨긴다.
 */
export const SITE = {
  shortName: 'GDGoC DGU',
  fullName: 'Google Developer Groups on Campus Dongguk University',
  generation: '4기',
  generationYears: '2026–27',
  /** 첫 화면 h1 아래 한 줄 (챕터 About: 'regardless of their major or year') */
  pitch: '동국대학교 Google Developer Groups on Campus 4기(2026–27)입니다. 전공과 학년에 상관없이 함께합니다.',
  links: {
    /** 인스타그램 프로필에서 확인 (2026-10-15) */
    instagram: 'https://www.instagram.com/gdg.donggukuniv/',
    instagramHandle: '@gdg.donggukuniv',
    linktree: 'https://linktr.ee/GDGoC_DGU',
    email: null as string | null,
    linkedin: null as string | null,
    github: null as string | null,
    /** 꼬리말 '채널 바로가기' 아이콘. 주소가 확인되면 넣는다 (null 이면 아이콘을 숨긴다) */
    /** 4기 Organizer 확인 (2026-11-01) */
    youtube: 'https://www.youtube.com/@GDGoCDGU' as string | null,
    discord: null as string | null,
  },
  /** 꼬리말 주소 (4기 Organizer 시안, 2026-11-01) */
  address: '서울시 중구 필동로1길 30 동국대학교 필동관 1층',
} as const

/** 소개 장소(광장 깃발)의 미리보기 세 줄. 확인된 사실만 (4기 운영 계획 · 일정) */
export const ABOUT_FACTS = [
  { id: 'sessions', label: '정기 세션', title: '화요일 · 네 파트별 실습' },
  { id: 'sprint', label: 'G-Sprint', title: '5팀 27명 · 12.29 데모데이' },
  { id: 'joint', label: '연합 행사', title: '동홍동락 · 동지톤' },
] as const

/** 지난 모집에서 확인된 사실 (인스타그램 4기 모집 게시물 · Linktree 4기 지원서 기준). 5기 일정이 아니다 */
export const RECRUIT_FACTS = [
  { id: 'when', label: '지난 모집', body: '4기는 8월에 코어 멤버, 9월 초에 마케팅 코어 · 일반 멤버를 모집했습니다.' },
  { id: 'session', label: '정기 세션', body: '4기는 매주 화요일 저녁 6시에 모입니다. 시험 기간에는 쉽니다.' },
  { id: 'next', label: '5기 모집', body: '일정이 정해지면 이 페이지와 인스타그램에 가장 먼저 공지합니다.' },
] as const

/**
 * 4기 G-Sprint 일정 (확정).
 * 발제 · 팀빌딩은 팀 계획, 10.13 은 공개 행사 'G-Sprint Kickoff: Team Meetings' (events.json 4th-sprint-kickoff) 와 같은 날이다.
 */
export const SPRINT = {
  title: 'G-Sprint',
  demoDay: '2026-12-29',
  steps: [
    { label: '발제', when: '09.22', date: '2026-09-22' },
    { label: '팀빌딩', when: '10.06', date: '2026-10-06' },
    { label: '킥오프', when: '10.13', date: '2026-10-13' },
    { label: '중간 발표', when: '10.27', date: '2026-10-27' },
    { label: '개발', when: '11월', date: '2026-11-03' },
    { label: '데모데이', when: '12.29', date: '2026-12-29', note: '성과공유회' },
  ],
} as const

/**
 * 팀 내부 기획 메모(들어갈 기능, 정할 것, 와이어프레임 번호)를 화면에 보일지.
 * 외부 방문자에게는 숨기고, 개발 중(npm run dev)이거나 VITE_SHOW_PLAN=true 일 때만 보인다.
 */
export const SHOW_PLAN = import.meta.env.DEV || import.meta.env.VITE_SHOW_PLAN === 'true'

/**
 * 프로토타입 보기: 팀원 찾기 게시판을 운영 중인 것처럼 보여 준다 (4기 Organizer 결정 2026-11: 팀원에게 보여 줄 프로토타입).
 * 켜면 '예시 화면' 안내 · 메뉴의 '준비 중' 표시 · 머리의 공사 중 간판이 빠지고, 지도 미리보기에 최근 글이 나온다.
 * 개발 화면(npm run dev)과 VITE_PROTOTYPE=true 로 만든 빌드(휴대폰 미리보기)에서 켜진다.
 * 공개 배포에서도 켜려면 Vercel 환경 변수에 VITE_PROTOTYPE=true. 백엔드가 붙으면 이 값 대신 실제 데이터가 그 자리를 채운다.
 */
export const PROTOTYPE = import.meta.env.DEV || import.meta.env.VITE_PROTOTYPE === 'true'
