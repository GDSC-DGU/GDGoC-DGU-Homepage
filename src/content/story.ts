/**
 * 홈 문구 묶음 (시안 E, 2026-10-18).
 *
 * 홈은 네 덩어리다: 첫 화면(지도) → 프로젝트(팀으로 만들어 공개한 서비스 {n}개) → 어떻게 하나요(먹색 띠 + 다음 모임 표)
 * → (사람: 동의받은 말이 생길 때까지 숨김) → 페이지 끝 '{gen}기에서 만나요'(common/JoinStrip, 아래 CLOSING 을 쓴다).
 * 모집 절차 · 파트 · 자주 묻는 질문의 답 · 기록은 /recruits · /community 가 말한다. 홈은 거기로 보내기만 한다.
 *
 * 규칙
 *  - 한 사실은 홈에서 한 번만 쓴다 ('같은 문제를 각자 풀고' 는 띠 문장 한 곳, '5팀 27명' 은 G-Sprint 칸 큰 숫자 한 곳).
 *  - 말투는 모두 ~습니다체. 풀이를 붙이는 용어는 G-Sprint 하나뿐이다 (<Term id="g-sprint" />, 띠의 G-Sprint 칸).
 *  - 숫자는 데이터에서 센다 (공개 프로젝트 수 · Solution Challenge 수 · G-Sprint 규모 · D-day). 손으로 적지 않고, 커밋 합계는 쓰지 않는다.
 *  - 숫자 옆에는 짧은 기준을 붙이고, 출처 각주는 홈에 달지 않는다 (꼬리말의 출처 줄이 맡는다).
 *  - 근거: 직접 열어 본 공개 페이지이면서 Organizer 확인이 더 필요 없는 사실만. 출처는 각 블록의 source 에 남긴다.
 *  - 조사는 붙여 쓰고(G-Sprint로), 화면 날짜는 점으로 쓴다 (docs/CONTENT.md 1-1). 주장 제목은 질문형으로 쓰지 않는다. story.test.ts 가 검사한다.
 */

const EVENT = 'https://gdg.community.dev/events/details/google-gdg-on-campus-dongguk-university-seoul-south-korea-presents-'

/** 이 파일이 기대는 공개 페이지 */
export const SOURCES = {
  chapter: 'https://gdg.community.dev/gdg-on-campus-dongguk-university-seoul-south-korea/',
  partSessions: `${EVENT}gdgoc-dgu-4th-member-introduction-amp-part-sessions/`,
  sprintKickoff: `${EVENT}gdgoc-dgu-g-sprint-kickoff-team-meetings/`,
  interChapter: `${EVENT}inter-chapter-session-konkuk-x-dongguk-x-sookmyung/`,
  jointHongik: `${EVENT}gdg-on-campus-dgu-1st-joint-seminar-with-hongik/`,
  jointChungangKonkuk: `${EVENT}gdgoc-dongguk-gdgoc-chungang-gdgoc-konkuk-joint-seminar/`,
  /** 4기 일반 멤버 지원서 (마감 뒤에도 안내문이 열림): 화요일 저녁 6시 · 활동 기간 · 자격 */
  applicationForm: 'https://forms.gle/LmwqYrdkyrtuvAmX6',
  github: 'https://github.com/GDSC-DGU',
} as const

type Source = string | readonly string[]

/* ── 1. 첫 화면 ── */

export const HERO = {
  /**
   * 첫 화면 (팀 피드백 2026-10-28: 긴 문장 대신 로고 · 이름 + 짧은 소개로 임팩트 있게).
   * h1 = 이름(워드마크, 공식 로고가 오면 그 옆에). 예전 h1 '9월에 처음 만난 사람들이 …' 은 다듬어서 G-Sprint 칸(SPRINT_LINE)으로 옮겼다.
   */
  name: 'GDGoC DGU',
  /** 정식 이름 (4기 Organizer 2026-11: 영문 정식 표기) */
  fullName: 'Google Developer Groups on Campus Dongguk Univ',
  /** 이름 아래 짧은 소개 한 문장 (챕터 About: 'regardless of their major or year'). 넓은 화면은 쉼표에서 두 줄 */
  pitch: ['전공과 학년에 상관없이,', '같이 만들며 배우는 개발 커뮤니티입니다.'],
  source: [SOURCES.chapter, SOURCES.sprintKickoff],
} as const

/* ── 2. 프로젝트: 팀으로 만들어 공개한 서비스 {n}개 ── */

/**
 * 홈 프로젝트 섹션 (이야기 섹션). 숫자는 화면이 projects.json 에서 센다 (homeData.projectCounts):
 * {n} = GitHub 조직에 공개 저장소가 있는 완성 프로젝트 수, {sc} = 그중 Solution Challenge 에서 만든 수, {org} = 그 GitHub 조직.
 */
export const PROJECTS_STORY = {
  eyebrow: '프로젝트',
  /** 주장 제목. {n} 은 숫자 글꼴로 그린다 */
  title: '팀으로 만들어 공개한 서비스 {n}개',
  /** 제목 아래 두 문장 (넓은 화면에서는 문장마다 한 줄). 숫자 기준을 겸한다 */
  sub: ['{sc}개는 Google Solution Challenge에서 만들었습니다.', '코드는 모두 GitHub에 공개되어 있습니다.'],
  /** 섹션 머리 오른쪽 행동 하나 (사이트 안 →) */
  more: '전체 프로젝트 {n}개 보러 가기',
  /** 큰 타일 아래 나머지 전부 목록의 이름 (읽기 프로그램용) */
  restLabel: '그 밖의 프로젝트',
  /** 폰에서는 목록을 이만큼만 먼저 보이고, 나머지는 버튼으로 펼친다 (홈이 너무 길어지지 않게). 바꾸면 home/projects.module.css 의 nth-child(n + 7) 도 같이 */
  phoneFirst: 6,
  /** 폰 펼치기 버튼. {n} = 아직 안 보이는 수 */
  moreOnPhone: '프로젝트 {n}개 더 보기',
  source: [SOURCES.github, 'src/content/projects.json status · program · repo'],
} as const

/**
 * 홈에 거는 프로젝트 (팀 피드백 2026-10-28: '1~2개만 크게 보이고 나머지는 아이콘만? 다 보여 줘야').
 * - big: 큰 타일 두 장. 실제 화면이 있는 것만 (첫째 약조심은 데스크톱 화면 위에 폰 화면을 겹쳐 건다, 둘째 Greenap 은 소개 그림).
 *   없는 id · 그림이 없는 프로젝트는 건너뛰고, 모자라면 실제 화면 · 소개 그림이 있는 최근 프로젝트로 채운다.
 * - 나머지 완성 프로젝트는 전부 아이콘 · 이름 · 한 줄 목록으로 (최근 것부터, /projects 전시실과 같은 모양).
 */
export const FEATURED_PROJECTS = {
  big: ['yakjosim', 'greenap'],
  source: [SOURCES.github, 'src/content/projects.json summary · cover · images'],
} as const

/* ── 3. 어떻게 하나요: 먹색 띠 (주장 → 세 칸 → 다음 모임 표) ── */

export const BAND = {
  /** 이름표 (장소 이름표 자리. 주장 제목이 아니다) */
  title: '어떻게 하나요',
  /** 띠의 주장 제목 (홈에서 이 말은 여기 한 번). 넓은 화면에서는 묶음마다 한 줄 */
  lines: ['같은 문제를 각자 풀고,', '서로의 풀이를 봅니다.'],
  /** 띠 맨 아래 다음 모임 표 (common/Ticket). 일정은 /community 와 같은 것 (homeNextEvent), D-day 는 날짜로 계산 */
  next: { kicker: '다음 모임', to: '/community#upcoming' },
  source: [SOURCES.partSessions, SOURCES.applicationForm],
} as const

export type WayId = 'sessions' | 'sprint' | 'joint'

export interface Way {
  id: WayId
  /** 칸 맨 위 작은 이름 ('매주 화요일'). {gen} = 지금 기수 */
  label: string
  /** 칸 이름. G-Sprint 는 화면에서 <Term id="g-sprint" /> 로 그린다 (풀이는 홈에서 여기 한 번) */
  name: string
  /**
   * 큰 숫자 한 줄. 숫자는 크게, 단위 글자는 작게 숫자 뒤에 띄워 그린다 ('5팀 27명' 이 '5팀27' 로 붙어 읽히지 않게).
   * G-Sprint 는 확인된 규모(chapter.json sprint)가 있으면 그걸로 바꿔 그린다 (SPRINT_LINE.key).
   */
  key: string
  /** 한 문장 (~습니다.) */
  body: string
  /** 더 읽을 곳 하나 (사이트 안 →) */
  link: { label: string; to: string }
  source: Source
}

/**
 * 띠 안의 세 칸: 화요일 세션 · G-Sprint · 연합 행사. 칸마다 작은 이름 → 큰 숫자 → 이름 → 한 문장 → 링크 하나.
 * G-Sprint 칸의 숫자 · 문장은 chapter.json sprint(확인된 규모) 와 SPRINT.demoDay 로 만든다 (SPRINT_LINE).
 */
export const WAYS: readonly Way[] = [
  {
    id: 'sessions',
    label: '매주 화요일',
    name: '화요일 세션',
    key: '18:00',
    body: 'Frontend · Backend · AI/ML · Product Design 네\u00a0파트로 나뉘어 모입니다.',
    link: { label: '네 파트 보기', to: '/recruits#parts' },
    source: [SOURCES.partSessions, SOURCES.applicationForm],
  },
  {
    id: 'sprint',
    label: '{gen}기 G-Sprint',
    name: 'G-Sprint',
    /** 규모를 확인하지 못한 기수에 쓰는 숫자 ({day} = 데모데이) */
    key: '{day} 데모데이',
    /** 규모를 확인하지 못한 기수에 쓰는 문장 */
    body: '팀마다 한 학기 동안 아이디어부터 배포까지 서비스 하나를 만듭니다.',
    link: { label: 'G-Sprint 보기', to: '/projects#now' },
    source: SOURCES.sprintKickoff,
  },
  {
    id: 'joint',
    label: '합동 세미나',
    name: '연합 행사',
    /** 아래 문장에 적은 챕터 수와 같아야 한다 (story.test.ts) */
    key: '4개 챕터',
    body: '홍익대 · 중앙대 · 건국대 · 숙명여대 챕터와 합동 세미나를 열었습니다.',
    link: { label: '행사 기록 보기', to: '/community#records' },
    source: [SOURCES.jointHongik, SOURCES.jointChungangKonkuk, SOURCES.interChapter],
  },
]

/**
 * G-Sprint 칸 (확인된 규모가 있을 때). 규모 '{teams}팀 {members}명' 은 큰 숫자(key)가 말하고,
 * 문장은 {day} 만 채운다 (몇 기인지는 칸 위 작은 이름 '4기 G-Sprint' 가 말한다). 숫자 기준은 짧게: 킥오프 페이지에서 확인한 규모라 '킥오프 기준'.
 */
export const SPRINT_LINE = {
  key: '{teams}팀 {members}명',
  /** 예전 첫 화면 문장을 다듬어 옮긴 것 (팀 피드백: 'G-Sprint 활동 소개 쪽에'). 데모데이 다음 날부터 지난 일로 */
  before: '9월에 처음 만난 사람들이 한\u00a0팀이 되어, {day}\u00a0데모데이에 서비스를 냅니다.',
  after: '9월에 처음 만난 사람들이 한\u00a0팀이 되어, {day}\u00a0데모데이에 서비스를 냈습니다.',
  basis: '킥오프 기준',
} as const

/* ── 4. 사람 ── */

/**
 * 멤버가 직접 한 말 한 줄. 이 배열이 비어 있으면 홈에 '사람' 섹션이 생기지 않는다 (지금은 비어 있음).
 *
 * 모양 (한 사람 = 한 줄):
 * {
 *   id: 'kim-backend-4',          // 바뀌지 않는 이름
 *   quote: '…',                   // 그 사람이 쓴 말 그대로, 120자 안팎. 말투를 고쳐 쓰지 않는다
 *   name: '김○○',                 // 화면에 쓸 이름 (본인이 고른 표기: 실명 · 성만 · 이니셜)
 *   part: 'Backend',              // Frontend · Backend · AI/ML · Product Design · 코어 …
 *   generation: 4,                // 활동한 기수 (확인 전이면 빼 둔다)
 *   consent: { date: '2026-11-03', by: '4기 Organizer 이도윤' },  // 홈 공개 동의를 받은 날 · 받은 사람
 * }
 * consent 가 없거나 quote 가 비어 있으면 화면에 싣지 않는다 (지어낸 후기 금지, docs/DESIGN.md 1 · 10장).
 */
export interface Voice {
  id: string
  /** 카드 맨 위 굵은 한 줄: 그 사람이 한 말에서 고른 핵심 문장 */
  headline?: string
  quote: string
  name: string
  part: string
  /** 활동한 기수. 확인되지 않았으면 비워 둔다 (화면에서 기수 표시를 빼고 파트만) */
  generation?: number
  consent: { date: string; by: string }
}

/**
 * 지난 기수 회고 (Notion GDG > Retrospective > 회고 DB 의 'Liked · Learned' 칸).
 * 본인이 쓴 문장에서 좋았던 점 · 배운 점을 골라 옮겼다. 인터뷰 말투(~습니다)로 끝맺음만 맞추고 오타 · 띄어쓰기를 고쳤다 (내용을 새로 쓰지 않음).
 * headline 은 같은 사람의 회고에서 고른 핵심 문장.
 * 공개 동의: 4기 Organizer 이도윤이 회고 작성자 전원에게 확인 (2026-11-01).
 * 기수: 2기 회고지만 화면에는 기수를 붙이지 않는다 (4기 Organizer 결정, 2026-11-01). 다른 기수 이름표를 지어 붙이지 않는다.
 */
const RETRO_CONSENT = { date: '2026-11-01', by: '4기 Organizer 이도윤 (회고 작성자 전원 공개 동의)' } as const

export const voices: readonly Voice[] = [
  {
    id: 'retro-park-subin',
    name: '박수빈',
    part: 'AI/ML',
    headline: '다양한 분야의 실력자분들과 함께하며 많이 배웠습니다.',
    quote: '접해 보지 못했던 분야의 세미나를 들으며 지식을 넓힐 수 있었고, 다른 전공 · 다른 분야 사람들과 친해질 수 있어서 좋았습니다. 열정과 지식 모두에서 많이 배웠던 것 같습니다.',
    consent: RETRO_CONSENT,
  },
  {
    id: 'retro-jeong-yuhyeon',
    name: '정유현',
    part: 'Community',
    headline: '열심히 하는 사람들 덕분에 긍정적인 영향을 많이 받았습니다.',
    quote: '선배들을 만나 이야기도 많이 듣고 배울 기회가 많았던 점이 좋았습니다. 공부하는 방법과 앞으로의 진로를 고민하는 자세를 배웠고, 데브렐로서 행사를 기획하고 진행하는 능력도 배웠습니다.',
    consent: RETRO_CONSENT,
  },
  {
    id: 'retro-lee-dayeon',
    name: '이다연',
    part: 'Marketing',
    headline: '디자인 툴을 직접 만들어 보며 익혔습니다.',
    quote: 'Marketing manager로 지원할 때 Figma를 거의 처음 다루는 거나 마찬가지였는데, 카드뉴스 · 포스터 · 굿즈 · 웹사이트를 직접 만들어 보며 디자인 툴을 익히게 되었습니다. 멋진 선배님들께 진로 관련 인사이트도 얻을 수 있었습니다.',
    consent: RETRO_CONSENT,
  },
  {
    id: 'retro-jo-wonjun',
    name: '조원준',
    part: 'Backend',
    headline: '오픈 세미나에서 연사로 발표해 볼 수 있었습니다.',
    quote: '다른 사람들의 세미나를 들을 수 있었던 점도 좋았고, 사람들이 정말 착하고 좋은 분들이었습니다. 다들 열심히 사는 모습을 보면서 저도 동기부여가 많이 되었습니다.',
    consent: RETRO_CONSENT,
  },
  {
    id: 'retro-kim-gyuri',
    name: '김규리',
    part: 'Backend',
    headline: '매주 새로운 자극이 되었습니다.',
    quote: '세미나와 스터디를 준비하는 과정에서도, 다른 사람의 세미나를 듣는 과정에서도 자극을 많이 받았습니다. 이전에 생각해 보지 못했던 분야나 기술에도 관심을 가질 계기가 되어서 참 좋았습니다.',
    consent: RETRO_CONSENT,
  },
  {
    id: 'retro-lee-ganguk',
    name: '이강욱',
    part: 'AI/ML',
    headline: '한 분야밖에 몰랐는데 더 다양한 분야를 알게 되었습니다.',
    quote: 'AI/ML 파트에 똑똑하신 분들이 많아서 CV · NLP 등 분야를 가리지 않고 다양하게 배울 수 있었습니다. 대학원 진학을 고민하던 저에게도 도움이 많이 되었습니다.',
    consent: RETRO_CONSENT,
  },
  {
    id: 'retro-hong-gyujin',
    name: '홍규진',
    part: 'Frontend',
    headline: '코딩만큼 네트워킹이 정말 필요하다는 걸 느꼈습니다.',
    quote: '다른 대학이나 선배님들뿐만 아니라 같은 기수의 대단하신 분들에게 배움을 쉽게 요청하고 빠르게 배울 수 있었습니다. 그동안 외면했던 다른 파트의 CS 지식이나 AI 파트의 지식도 배울 수 있었습니다.',
    consent: RETRO_CONSENT,
  },
  {
    id: 'retro-eom-taewoo',
    name: '엄태우',
    part: 'AI/ML',
    headline: '한 단계 성장할 수 있는 기회를 자주 만났습니다.',
    quote: '각 분야를 진심으로 공부하는 여러 사람들을 만날 수 있었습니다. 단순한 정보 공유를 넘어서, 효과적으로 정보를 전달하는 방법도 배울 수 있었습니다.',
    consent: RETRO_CONSENT,
  },
  {
    id: 'retro-min-janggyu',
    name: '민장규',
    part: 'Backend',
    headline: '개발 이야기를 나눌 때 얻어 가는 게 엄청 많았습니다.',
    quote: '멤버들이 다들 많은 활동을 하고 열심히 공부하는 모습을 보고 자극을 많이 받았습니다. 매주 다른 파트의 세미나를 들으며 다양한 지식을 얻었고, 함께 두 번의 대회에 나가 좋은 추억도 쌓았습니다.',
    consent: RETRO_CONSENT,
  },
  {
    id: 'retro-kim-subin',
    name: '김수빈',
    part: 'Frontend',
    headline: '나아갈 방향을 깊게 고민할 수 있었습니다.',
    quote: '한 분야에 한정되지 않고 다양한 파트를 접할 수 있었습니다. 다른 사람들이 어떤 기술에 집중하고 어떻게 공부하는지, 진로를 어떻게 개척해 나가는지 배우면서 제가 어떻게 해야 할지 고민할 수 있었습니다.',
    consent: RETRO_CONSENT,
  },
]

/** 홈 'Interview' 섹션 머리 (4기 Figma 시안 2026-11). voices 가 비어 있으면 공개 사이트에서는 그리지 않는다 */
export const VOICES = {
  title: 'Interview',
  sub: '지난 기수 멤버가 직접 쓴 이야기',
} as const

/* ── 5. 페이지 끝: {gen}기에서 만나요 ── */

/**
 * 페이지 끝 '{gen}기에서 만나요' (common/JoinStrip 이 홈 · /projects · /community 에서 쓴다).
 * 이름 · 모양(title · status · faqIds)을 바꾸지 않는다: JoinStrip 이 이 셋과 homeData 의 closingStatusLine · pickFaqs 를 가져다 쓴다.
 */
export const CLOSING = {
  /** {gen}기에서 만나요 */
  title: '{gen}기에서 만나요',
  /** 모집 상태 한 문장 (recruitStatus().state 마다). {gen} {handle} {opens} {deadline} */
  status: {
    unscheduled: '{gen}기 모집 일정은 아직 정해지지 않았습니다. 정해지면 인스타그램 {handle}에 가장 먼저 올립니다.',
    soon: '{gen}기 모집은 {opens}에 열립니다. 자세한 안내는 인스타그램 {handle}에 먼저 올립니다.',
    open: '지금 {gen}기 모집을 받고 있습니다.',
    openUntil: '{gen}기 모집을 {deadline}까지 받습니다.',
    ended: '{gen}기 모집은 마감했습니다. 다음 소식은 인스타그램 {handle}에 가장 먼저 올립니다.',
  },
  /** 페이지 끝에 거는 자주 묻는 질문 세 개 (faq.json id). 누르면 /recruits#faq-{id} 에서 그 답이 펼쳐진다 */
  faqIds: ['who', 'when-recruit', 'how-to-apply'],
  source: ['src/content/recruitingStatus.ts', 'src/content/faq.json'],
} as const
