/**
 * 홈 문구 (4기 Organizer 2026-11-16: 슈어소프트테크 홈 구성을 따라 섹션 다섯 개로 줄인다. 캠퍼스 지도는 홈에서 뺀다).
 * 1 첫 화면: 이름 + 소개 한 줄 + 사진 슬라이드 · 2 하는 일 큰 카드 · 3 팀 프로젝트 넘기기 · 4 소개 한 문단 + 숫자 · 5 지원 띠
 * {gen} = 지금 기수 (4), {next} = 다음 모집 기수 (5), {n} · {start} 같은 숫자는 화면에서 저장소 자료로 센다.
 * 지어낸 숫자 · 인용은 쓰지 않는다 (docs/CONTENT.md 1장). 문구 규칙은 content.test.ts 가 잡는다.
 */

/** 첫 화면 사진 슬라이드. photo 는 content/photos.json 의 id (공개 동의가 있는 사진만) */
export const HOME_SLIDES = {
  community: {
    cate: 'About us',
    photo: '2024-05-16-open-seminar-group',
    title: '1기부터 {gen}기까지 이어 온 챕터',
    body: '{start}년 GDSC DGU로 시작해 해마다 9월에 새 기수를 엽니다.',
    action: '소개 보기',
    to: '/about',
  },
  /** 다음 행사 (events.json 에서 G-Sprint · 행사 중 가장 가까운 것). 없으면 이 슬라이드는 빠진다 */
  next: {
    cate: 'Upcoming',
    photo: '2023-12-22-closing-room',
    body: '{date}에 열립니다. 다른 일정은 소개 페이지에 모아 두었습니다.',
    action: '일정 보기',
    to: '/about#upcoming',
  },
  recruit: {
    cate: 'Recruit',
    photo: '2023-09-15-welcome-group',
    title: '{next}기 모집',
    titleOpen: '{next}기 지원을 받고 있습니다',
    body: {
      unscheduled: '모집 일정이 정해지면 지원하기 페이지와 인스타그램에 가장 먼저 알립니다.',
      soon: '{date}부터 지원을 받습니다.',
      open: '{date}까지 지원을 받습니다.',
      ended: '지원을 마감했습니다. 다음 모집도 인스타그램에 가장 먼저 알립니다.',
    },
    action: '지원 안내 보기',
    to: '/recruits',
  },
} as const

/** 첫 화면 슬라이드 버튼 (읽기 프로그램용 이름) */
export const HOME_CAROUSEL = {
  label: 'GDGoC DGU 소식',
  prev: '이전 슬라이드',
  next: '다음 슬라이드',
  pause: '슬라이드 넘기기 멈춤',
  play: '슬라이드 넘기기 다시 시작',
} as const

/** 첫 화면 아래 한 줄 (슈어소프트테크 'What's new'): 다가오는 일정이 4초마다 위로 넘어간다 */
export const HOME_TICKER = {
  label: '다가오는 일정',
  limit: 6,
  prev: '이전 일정',
  next: '다음 일정',
  pause: '일정 넘기기 멈춤',
  play: '일정 넘기기 다시 시작',
} as const

export type ActivityTone = 'photo' | 'dark' | 'gen'

export interface Activity {
  id: string
  title: string
  body: string
  /** 카드 아래 작은 태그 */
  tags?: readonly string[]
  to: string
  /** tone 이 photo 면 content/photos.json 의 id. 사진이 없는 활동은 면 색 + 선 그림 */
  tone: ActivityTone
  photo?: string
  icon?: 'trophy' | 'people'
}

/** 2 하는 일: 큰 카드 다섯 장 (넓은 화면은 첫 줄 한 장 + 넓은 한 장, 둘째 줄 세 장) */
export const HOME_ACTIVITIES = {
  /** 제목 위 영문 이름표 (슈어소프트테크 '• Solution & Service •' 자리) */
  eng: 'What We Do',
  title: '매주 모이고, 한 학기에 서비스 하나를 만듭니다',
  sub: '파트별 실습부터 팀 프로젝트, 멤버 발표, 다른 학교와 여는 행사까지 한 해 동안 이어집니다.',
  cards: [
    {
      id: 'sessions',
      title: '정기 세션',
      body: '매주 화요일 18:00에 파트별로 모여 같은 문제를 각자 풀고 서로의 풀이를 봅니다.',
      tags: ['Frontend', 'Backend', 'AI/ML', 'Product Design'],
      to: '/about',
      tone: 'photo',
      photo: '2023-11-24-part-seminar',
    },
    {
      id: 'sprint',
      title: 'G-Sprint',
      body: '팀마다 가을 학기 동안 아이디어부터 배포까지 서비스 하나를 만들고 데모데이에서 직접 시연합니다.',
      tags: ['팀 프로젝트', 'Google 기술', '데모데이'],
      to: '/archive',
      tone: 'photo',
      photo: '2023-12-22-closing-teams',
    },
    {
      id: 'seminars',
      title: '멤버 세미나',
      body: '멤버가 주제를 정해 직접 발표합니다. 지난 발표 {n}개가 아카이브에 있습니다.',
      to: '/archive?view=seminars',
      tone: 'photo',
      photo: '2023-10-06-camping-seminar-2-talk',
    },
    {
      id: 'solution-challenge',
      title: 'Solution Challenge',
      body: 'Google이 여는 대학생 개발 대회에 팀으로 나가 사회 문제를 푸는 서비스를 만듭니다.',
      to: '/archive',
      tone: 'dark',
      icon: 'trophy',
    },
    {
      id: 'joint',
      title: '연합 행사',
      body: '동홍동락, 동지톤처럼 다른 챕터, 동아리와 함께 행사를 엽니다.',
      to: '/about',
      tone: 'gen',
      icon: 'people',
    },
  ] satisfies readonly Activity[],
} as const

/** 3 팀 프로젝트: 제목 · 한 줄은 PROJECTS_STORY (content/story.ts) 를 그대로 쓴다 */
export const HOME_PROJECTS = {
  eng: 'Projects',
  /** 넘기는 줄에 거는 수 (전부는 /archive) */
  limit: 12,
  more: '전체 보기',
  prev: '이전 프로젝트',
  next: '다음 프로젝트',
  pause: '프로젝트 넘기기 멈춤',
  play: '프로젝트 넘기기 다시 시작',
  /** 소개 섹션 아래 로고 흐름 (슈어소프트테크 파트너 로고 자리): 로고 표지가 있는 프로젝트만 */
  logosLabel: '로고가 있는 팀 프로젝트',
} as const

/** 4 소개 한 문단 + 숫자 셋 */
export const HOME_ABOUT = {
  eng: 'About GDGoC DGU',
  title: '{start}년부터 이어 온 동국대학교 개발자 커뮤니티',
  body: 'Google Developer Groups on Campus는 Google 개발자 기술에 관심 있는 대학생 커뮤니티입니다. GDGoC DGU는 그 동국대학교 챕터로, 전공과 학년에 상관없이 함께 배우고 만듭니다.',
  action: '소개 보기',
  stats: {
    seminars: '멤버 세미나',
    generation: '지금 기수',
    members: '챕터 페이지 가입자',
  },
} as const

/** 5 지원 띠 */
export const HOME_JOIN = {
  eng: 'Join us',
  title: 'GDGoC DGU와 함께 시작해 보세요',
  sub: '{next}기 모집과 행사 소식은 인스타그램 {handle}에 가장 먼저 올라옵니다.',
  apply: '지원서 쓰기',
  guide: '지원 안내 보기',
  instagram: '인스타그램',
} as const
