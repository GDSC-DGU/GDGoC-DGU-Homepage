/**
 * 화면 전체에서 쓰는 데이터 모양.
 * 백엔드(Spring Boot) API 응답은 data/http/adapters.ts 에서 이 모양으로 바꿔서 넘긴다.
 */

/** 지도 위 장소 = 상단 메뉴 하나 (배범서 기획: Home · Projects · Teams · Community · Recruits) */
export type PlaceId = 'about' | 'projects' | 'teams' | 'community' | 'recruits'

/** 건물 지붕 모양. 새 모양은 features/campus/roofs 에 컴포넌트를 하나 추가하고 등록한다. */
export type RoofType = 'screen' | 'saw' | 'arch' | 'gable'

/** 건물 문이 있는 면: L = 화면 왼쪽 아래를 보는 면(+y), R = 오른쪽 아래를 보는 면(+x) */
export type Face = 'L' | 'R'

/** 지도 격자 위 건물 자리 (격자 1칸 = 화면 64×32px 마름모) */
export interface Footprint {
  x: number
  y: number
  w: number
  d: number
  /** 벽 높이 (격자 단위) */
  h: number
  door: Face
  roof: RoofType
  /** 지붕 꼭대기에서 이름표 핀까지 띄울 높이 */
  pinGap: number
}

export interface Place {
  id: PlaceId
  /** 지도 이름표와 메뉴에 같이 쓰는 이름 */
  label: string
  /** 한 줄 부제 */
  sub: string
  /** 이동할 페이지 */
  path: string
  /** 대표 색 (구글 4색 중 하나, 소개는 잉크색) */
  color: string
  /** 미리보기 패널 설명 (~습니다체) */
  description: string
  /** 지금 진행 중 표시 */
  live?: boolean
  /** 건물 자리. 없으면 광장 깃발(소개)로 그린다 */
  footprint?: Footprint
}

/**
 * 일정 종류.
 * session = 세션 · 세미나 · 스터디, event = 행사 · 연합 행사 · 해커톤, sprint = G-Sprint 단계,
 * project = 프로젝트 발표 · 데모데이(G-Sprint 밖), recruit = 모집 · OT, notice = 공지, rest = 휴회
 */
export type EventKind = 'session' | 'event' | 'sprint' | 'project' | 'recruit' | 'notice' | 'rest'

export interface ScheduleEvent {
  id: string
  /** YYYY-MM-DD (한국 시간 기준 날짜) */
  date: string
  /** 여러 날 행사의 마지막 날 */
  endDate?: string
  /** 화면에 보이는 한글 제목 */
  title: string
  kind: EventKind
  /** 눌렀을 때 열 장소 */
  place: PlaceId
  /** 몇 기 활동인지 (1, 2, 3, 4 …) */
  generation?: number
  /** 연속 행사 이름 (예: Camping Seminar) */
  series?: string
  /** 장소 (예: 신공학관 4142) */
  venue?: string
  /** 원래 게시된 제목 (gdg.community.dev 등) */
  originalTitle?: string
  /** 자세히 보기 주소 */
  url?: string
  /** 근거 (공개 페이지 주소 또는 '4기 운영 계획') */
  source?: string
}

/** 프로젝트 (GitHub GDSC-DGU 조직 등 공개 기록 기준) */
export interface Project {
  id: string
  name: string
  /** 한 줄 설명 (README 기준, 없으면 비움) */
  summary?: string
  /** 어떤 프로그램에서 만들었는지: 'Solution Challenge 2024', 'G-Sprint' … */
  program: string
  year: number
  generation?: number
  stack?: string[]
  repo?: string
  /** 서비스 주소 */
  url?: string
  status: 'done' | 'in-progress'
  source?: string
  /** 데모 영상 주소 (README 에 걸린 YouTube 등). 서비스 주소(url)와 따로 둔다 */
  demo?: string[]
  /** 팀원 이름 (화면 '팀원' 줄). 본인이 고른 표기 그대로 · 공개해도 된다고 확인한 것만 */
  members?: string[]
  /** 대표 저장소(repo)의 GitHub 기여자 수 (statsAsOf 기준). 화면에는 쓰지 않는다 */
  contributors?: number
  /** 대표 저장소의 커밋 수 (모든 브랜치, statsAsOf 기준) */
  commits?: number
  /** 대표 저장소의 첫 커밋 · 마지막 커밋 날짜 'YYYY-MM-DD' (한국 날짜) */
  firstCommit?: string
  lastCommit?: string
  /** 대표 저장소의 GitHub 언어 비율 (바이트 기준 %) */
  languages?: LanguageShare[]
  /** GitHub 숫자(contributors · commits · languages)를 확인한 날 'YYYY-MM-DD' */
  statsAsOf?: string
  /** 표지 그림. 없으면 화면이 이름 · 연도 · 언어 비율로 글자 표지를 그린다 */
  cover?: ProjectImage
  /** 자세히 보기 창에 더 보여 줄 그림 (화면 캡처 · 구조도) */
  images?: ProjectImage[]
}

/**
 * 세미나 발표 하나 (아카이브 '세미나'). 출처: 백엔드 팀이 노션에 모은 '전 기수 데이터 모음집' (content/seminars.json).
 * 발표 자료 파일은 백엔드가 R2 에 올리고 fileUrl 을 채운다. 비어 있으면 화면에서 '자료 보기'를 숨긴다.
 */
/** 행사 사진 (content/photos.json). 얼굴이 보이는 사람 모두의 웹 공개 동의가 기록된 사진만 */
export interface EventPhoto {
  id: string
  /** 'photos/2026-09-ot.webp' (public/ 기준) 또는 https 주소 */
  src: string
  /** 사진에 무엇이 있는지 (읽기 프로그램용, 예: '4기 OT에서 조별로 자기소개하는 멤버들') */
  alt: string
  width: number
  height: number
  /** 찍은 날 'YYYY-MM-DD' */
  date: string
  /** 행사 이름 (사진 아래 한 줄) */
  event: string
  generation?: number
  /** 웹 공개 동의를 받은 날 · 받은 사람 */
  consent: { date: string; by: string }
}

export interface Seminar {
  id: string
  /** 발표한 날 'YYYY-MM-DD' */
  date: string
  generation: number
  title: string
  /** 발표자 이름 (공개 확인: 4기 Organizer 2026-11-04) */
  speaker: string
  /** 남아 있는 발표 자료 형식. 자료가 없거나 확인이 필요하면 null */
  format: 'pdf' | 'pptx' | null
  /** 발표 자료 공개 주소 (R2). 올리기 전에는 null */
  fileUrl: string | null
}

/**
 * 프로젝트 그림 종류.
 * screen = 화면 캡처, mobile = 폰 화면 캡처, promo = 팀이 만든 소개 이미지, diagram = 구조도 · ERD, logo = 로고 · 아이콘 · 캐릭터
 */
export type ProjectImageKind = 'screen' | 'mobile' | 'promo' | 'diagram' | 'logo'

/** 프로젝트 그림 한 장: 팀 저장소(README · 파일)의 그림을 줄여 public/project-images 에 둔 것 */
export interface ProjectImage {
  /** public/ 기준 경로, 앞에 / 없이: 'project-images/yakjosim.webp' */
  src: string
  /** 화면 읽기 프로그램용 설명 */
  alt: string
  /** 그림 아래 짧은 이름 ('홈 (데스크톱)') */
  caption?: string
  kind: ProjectImageKind
  width: number
  height: number
  /** 원본 주소 (GitHub 저장소의 그 파일) */
  source: string
  /** 팀이 사이트 게시를 확인했는지. 확인 전이면 false */
  teamCleared: boolean
}

/** GitHub 언어 비율 한 줄 */
export interface LanguageShare {
  name: string
  /** 바이트 기준 % (0~100) */
  share: number
}

/** 기수 연혁 */
export interface Generation {
  n: number
  /** 그때 이름: 'GDSC DGU' | 'GDGoC DGU' */
  name: string
  /** 'YYYY-MM'. 첫 공개 행사(OT)가 있던 달. 공개 기록이 없으면 비운다 (1기) */
  start?: string
  /** 'YYYY-MM'. 마지막으로 확인된 공개 행사의 달. 지금 기수나 모르면 비운다 */
  end?: string
  /** 한 줄 요약 (확인된 사실만) */
  summary: string
  /** 대표 기록 2~4개 */
  highlights: string[]
  current?: boolean
  source: string[]
}

export interface Faq {
  id: string
  q: string
  a: string
  source?: string
}

/** 숫자 하나. 실제 값과 기준(출처 · 날짜)이 있을 때만 쓴다 */
export interface Stat {
  id: string
  label: string
  value: number
  /** 기준: 'gdg.community.dev 기준 2026.10' */
  note?: string
  source?: string
}

/** 장소 미리보기의 글 한 줄 */
export interface PreviewItem {
  id: string
  title: string
  /** YYYY-MM-DD. 날짜가 없는 글은 label 을 대신 보여준다 */
  date?: string
  /** '모집 중' 같은 짧은 말 */
  label?: string
  tag?: string
  /** 실제 글이 아니라 화면을 보여주려고 넣은 예시 */
  sample?: boolean
}

export interface Review {
  id: string
  body: string
  author: string
  part?: string
}

export interface ArchiveDoc {
  id: string
  place: PlaceId
  title: string
  meta: string
  keywords: string
  sample?: boolean
}

export interface SearchHit {
  doc: ArchiveDoc
  score: number
}
