import type { ArchiveDoc, PlaceId, PreviewItem, Review, ScheduleEvent, Stat } from '@/domain/types'

/**
 * 서버 없이 화면을 볼 때 쓰는 데이터.
 * 일정과 행사 이름은 4기 실제 일정이다 (src/content/events.json 과 같은 이름 · 날짜).
 * 지어낸 글(예시 게시글 · 후기 · 지나간 기수의 활동처럼 읽히는 글)은 넣지 않는다. 사실로 오해될 수 있다.
 * 아직 열지 않은 게시판은 날짜 없는 '상태' 줄로 보여 준다.
 */

export const SCHEDULE: ScheduleEvent[] = [
  { id: '4th-ot', date: '2026-09-15', title: '4기 OT', kind: 'recruit', place: 'recruits' },
  { id: '4th-intro', date: '2026-09-22', title: '멤버 소개, 파트 세션', kind: 'session', place: 'community' },
  { id: '4th-git', date: '2026-10-06', title: 'Git 세션, 파트 세션', kind: 'session', place: 'community' },
  { id: 'sprint-kickoff', date: '2026-10-13', title: 'G-Sprint 킥오프, 팀 회의', kind: 'sprint', place: 'projects' },
  { id: 'rest-mid', date: '2026-10-20', title: '중간고사 휴회', kind: 'rest', place: 'community' },
  { id: 'sprint-mid', date: '2026-10-27', title: 'G-Sprint 중간 발표', kind: 'sprint', place: 'projects' },
  { id: 'dhdr-1', date: '2026-11-02', title: '동홍동락 1차', venue: '홍익대', kind: 'event', place: 'community' },
  { id: 'seminar-fin', date: '2026-12-01', title: '금융권 IT 현업자 세미나', kind: 'session', place: 'community' },
  { id: 'rest-final', date: '2026-12-08', title: '기말고사 휴회', kind: 'rest', place: 'community' },
  { id: 'mt', date: '2026-12-15', title: 'MT', kind: 'event', place: 'community' },
  { id: 'dhdr-2', date: '2026-12-22', title: '동홍동락 2차', venue: '동국대 신공학관', kind: 'event', place: 'community' },
  { id: 'demo-day', date: '2026-12-29', title: 'G-Sprint 데모데이, 성과공유회', kind: 'sprint', place: 'projects' },
  { id: 'dongjithon', date: '2027-01-30', endDate: '2027-01-31', title: '동지톤', venue: '동국대', kind: 'event', place: 'community' },
]

/** 실제 숫자(멤버 수 등)가 정해지면 넣는다. 비어 있으면 첫 화면에 숫자 줄이 나오지 않는다 */
export const STATS: Stat[] = []

/**
 * 팀원 찾기(teams) 게시판은 아직 열지 않았다. 지어낸 모집 글 대신 지금 상태를 날짜 없이 보여 준다.
 * 스냅샷 구현(공개 페이지)도 이 줄을 그대로 쓴다.
 */
export const TEAMS_STATUS: PreviewItem[] = [
  { id: 't-status', label: '상태', title: '팀원 찾기 게시판은 아직 열지 않았습니다' },
  { id: 't-notice', label: '공지', title: '열면 인스타그램 @gdg.donggukuniv에 먼저 알립니다' },
]

export const PREVIEWS: Record<Exclude<PlaceId, 'about'>, PreviewItem[]> = {
  projects: [
    { id: 'p-kickoff', date: '2026-10-13', title: 'G-Sprint 킥오프, 팀 회의', tag: 'G-Sprint' },
    { id: 'p-mid', date: '2026-10-27', title: 'G-Sprint 중간 발표', tag: 'G-Sprint' },
    { id: 'p-demo', date: '2026-12-29', title: 'G-Sprint 데모데이, 성과공유회', tag: 'G-Sprint' },
  ],
  teams: TEAMS_STATUS,
  community: [
    { id: 'c-git', date: '2026-10-06', title: 'Git 세션, 파트 세션', tag: '세션' },
    { id: 'c-rest', date: '2026-10-20', title: '중간고사 휴회', tag: '휴회' },
    { id: 'c-dhdr-1', date: '2026-11-02', title: '동홍동락 1차', tag: '행사' },
  ],
  recruits: [
    { id: 'r-5th', label: '공지 예정', title: '5기 모집 일정', tag: '모집' },
    { id: 'r-4th', label: '4기', title: '8월 코어 멤버, 9월 마케팅 코어, 일반 멤버 모집', tag: '지난 모집' },
  ],
}

/** 멤버가 직접 쓴 후기만 싣는다. 받기 전에는 비워 둔다 */
export const REVIEWS: Review[] = []

export const ARCHIVE: ArchiveDoc[] = [
  { id: 'a-git', place: 'community', title: 'Git 세션, 파트 세션', meta: '2026.10.06, 세션', keywords: 'git 깃 세션 파트 세션 part session' },
  { id: 'a-intro', place: 'community', title: '멤버 소개, 파트 세션', meta: '2026.09.22, 세션', keywords: '멤버 소개 세션 파트 세션 part session' },
  { id: 'a-ot', place: 'recruits', title: '4기 OT', meta: '2026.09.15, 모집, OT', keywords: 'ot orientation 오리엔테이션 오티 4기' },
  { id: 'a-seminar', place: 'community', title: '금융권 IT 현업자 세미나', meta: '2026.12.01, 세션', keywords: '세미나 금융 현업 it 백엔드 backend' },
  { id: 'a-dhdr-1', place: 'community', title: '동홍동락 1차', meta: '2026.11.02, 동국대 × 홍익대 교류전, 홍익대', keywords: '동홍동락 교류전 홍익 홍익대 연합 행사' },
  { id: 'a-dhdr-2', place: 'community', title: '동홍동락 2차', meta: '2026.12.22, 동국대 × 홍익대 교류전, 동국대 신공학관', keywords: '동홍동락 교류전 홍익 홍익대 연합 행사' },
  { id: 'a-mt', place: 'community', title: 'MT', meta: '2026.12.15, 행사', keywords: 'mt 엠티 행사' },
  { id: 'a-dongjithon', place: 'community', title: '동지톤', meta: '2027.01.30~01.31, 행사, 동국대', keywords: '동지톤 해커톤 hackathon 공모전 행사' },
  { id: 'a-homepage', place: 'projects', title: 'GDGoC DGU 홈페이지 리뉴얼', meta: 'G-Sprint, 4기, 진행 중', keywords: '홈페이지 웹사이트 website 프로젝트 g-sprint' },
  { id: 'a-demo', place: 'projects', title: 'G-Sprint 데모데이, 성과공유회', meta: '2026.12.29, G-Sprint', keywords: 'demo day 데모데이 성과공유회 발표 g-sprint 프로젝트' },
  { id: 'a-5th', place: 'recruits', title: '5기 모집 일정', meta: '공지 예정', keywords: '모집 지원 지원하기 리크루팅 5기 5th 일정' },
  { id: 'a-about', place: 'about', title: 'GDGoC DGU 소개', meta: '연결, 배움, 성장', keywords: '소개 gdgoc gdg dgu 동아리 커뮤니티 about connect learn grow' },
  { id: 'a-parts', place: 'about', title: '파트 4개', meta: 'Frontend, Backend, AI/ML, Product Design', keywords: '파트 frontend backend ai/ml design 프론트 백엔드 디자인' },
]
