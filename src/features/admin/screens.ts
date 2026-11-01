import type { AdminArea } from './data/permissions'

/**
 * 관리자 화면 목록 (명세서 '01) 화면 명세서'의 P-ACM · ABD · APJ · ACT · AMB · ARC, v1.2).
 * 라우트(routes.tsx) · 사이드바(shell/menu.ts) · '만드는 중' 자리(ui/ScreenPlaceholder) · 테스트가 이 목록 하나를 본다.
 * 주소가 있는 '페이지'만 여기 있고, 팝업은 그 팝업을 부르는 페이지의 popups 에 적는다 (팝업은 구역 폴더 안 부품).
 * 주인: 기초(1단계). 2단계는 고치지 않는다 (주소 · 내보낼 이름의 약속).
 */
export type AdminSection = 'boards' | 'projects' | 'contents' | 'users' | 'recruit'

export interface AdminScreen {
  /** 화면 ID (P-ABD-01) */
  id: string
  /** 주소. ':applicantId' 처럼 경로 변수는 react-router 표기 */
  path: string
  title: string
  /** 명세 비고를 줄인 한 줄 (페이지 머리 설명 기본값) */
  summary: string
  /** 팀 와이어프레임 번호 */
  figma: string
  /** 이 화면의 기능 ID */
  functions: string
  area: AdminArea
  /** 구역 폴더 (src/features/admin/{section}) */
  section?: AdminSection
  /** 구역 폴더 index.ts 가 내보낼 페이지 컴포넌트 이름 */
  page?: string
  /** 이 페이지가 부르는 팝업 (P-ID 이름 · 기능) */
  popups?: readonly string[]
}

export const ADMIN_SCREENS = [
  { id: 'P-ACM-01', path: '/admin/login', title: '관리자 로그인', summary: 'Lead · Core 계정만 로그인합니다.', figma: '06 · 06-2', functions: 'F-ACM-001', area: 'dashboard', popups: ['P-ACM-04 비밀번호 변경 (F-ACM-002)'] },
  { id: 'P-ACM-03', path: '/admin', title: '대시보드', summary: '로그인 후 첫 화면입니다.', figma: '07', functions: 'F-ACM-005~008', area: 'dashboard' },
  {
    id: 'P-ABD-01',
    path: '/admin/boards/teams',
    title: 'Teams 게시판 관리',
    summary: 'Teams 게시글과 댓글을 찾아보고 삭제합니다.',
    figma: '07-1',
    functions: 'F-ABD-001~005',
    area: 'boards',
    section: 'boards',
    page: 'TeamsBoardPage',
  },
  {
    id: 'P-ABD-02',
    path: '/admin/boards/community',
    title: 'Community 게시판 관리',
    summary: 'Community 게시글과 댓글을 분류별로 찾아보고 삭제합니다. 관리자 게시글은 음영으로 구분합니다.',
    figma: '07-2',
    functions: 'F-ABD-006~009 · 011 · 012',
    area: 'boards',
    section: 'boards',
    page: 'CommunityBoardPage',
  },
  {
    id: 'P-ABD-03',
    path: '/admin/boards/community/write',
    title: 'Community 게시글 작성',
    summary: '공지 · 세션 · 행사를 포함한 모든 분류로 운영진 이름의 글을 게시합니다.',
    figma: '07-2-1',
    functions: 'F-ABD-010 · 013',
    area: 'boards',
    section: 'boards',
    page: 'CommunityWritePage',
  },
  {
    id: 'P-APJ-01',
    path: '/admin/projects',
    title: '프로젝트 관리',
    summary: '공개 · 비공개 프로젝트를 모두 보고 등록 · 수정 · 삭제합니다.',
    figma: '07-7',
    functions: 'F-APJ-001~003',
    area: 'projects',
    section: 'projects',
    page: 'ProjectListPage',
  },
  {
    id: 'P-APJ-02',
    path: '/admin/projects/write',
    title: '프로젝트 등록 · 수정',
    summary: '썸네일 · 제목 · 간단한 설명 · 기수를 입력해 프로젝트를 등록합니다. 목록의 [수정]으로 들어오면 수정 모드(?id=)입니다.',
    figma: '07-7-1',
    functions: 'F-APJ-004~006',
    area: 'projects',
    section: 'projects',
    page: 'ProjectWritePage',
  },
  {
    id: 'P-ACT-01',
    path: '/admin/contents',
    title: '홈페이지 콘텐츠 관리',
    summary: '홈 소개 이미지 · 지난 기수 리뷰 · 모집 포스터를 관리합니다.',
    figma: '07-8',
    functions: 'F-ACT-001~006',
    area: 'contents',
    section: 'contents',
    page: 'ContentsPage',
    popups: ['P-ACT-02 리뷰 추가 · 수정 (F-ACT-007~009)'],
  },
  {
    id: 'P-AMB-01',
    path: '/admin/users',
    title: '사용자 관리',
    summary: 'Lead · Core · General 사용자와 관리 권한, PIN 설정 상태를 관리합니다. Core는 General만 추가 · 수정합니다.',
    figma: '07-3',
    functions: 'F-AMB-001~004 · 013',
    area: 'users',
    section: 'users',
    page: 'UsersPage',
    popups: ['P-AMB-02 사용자 추가 · 수정 (F-AMB-006~011)', 'P-AMB-04 PIN 초기화 확인 (F-AMB-012)', 'P-AMB-05 계정 잠금 해제 (F-AMB-015)'],
  },
  {
    id: 'P-AMB-03',
    path: '/admin/users/history',
    title: '사용자 변경 이력',
    summary: '누가 언제 어떤 사용자에게 무엇을 바꿨는지 최신순으로 봅니다.',
    figma: '07-3-5',
    functions: 'F-AMB-005 · 014',
    area: 'users',
    section: 'users',
    page: 'UserHistoryPage',
  },
  {
    id: 'P-ARC-01',
    path: '/admin/recruit/form',
    title: '지원폼 작성',
    summary: '지원서 질문과 모집 기수 · 지원 기간을 정해 임시 저장하거나 게시합니다.',
    figma: '07-4',
    functions: 'F-ARC-001~005',
    area: 'recruit',
    section: 'recruit',
    page: 'RecruitFormPage',
    popups: ['P-ARC-10 지원서 미리보기 (F-ARC-003)'],
  },
  {
    id: 'P-ARC-07',
    path: '/admin/recruit/form/criteria',
    title: '평가 기준 설정',
    summary: '자동 점수에 쓰는 평가 항목과 배점(합계 100점)을 정합니다.',
    figma: '07-4-1',
    functions: 'F-ARC-031~034',
    area: 'recruit',
    section: 'recruit',
    page: 'RecruitCriteriaPage',
  },
  {
    id: 'P-ARC-02',
    path: '/admin/recruit/applicants',
    title: '지원자 관리',
    summary: '접수된 지원서를 결과별로 보고, 결과를 처리하고, 결과 메일을 보냅니다.',
    figma: '07-5',
    functions: 'F-ARC-006~012',
    area: 'recruit',
    section: 'recruit',
    page: 'ApplicantsPage',
    popups: ['P-ARC-04 이메일 일괄 발송 (F-ARC-018~020)', 'P-ARC-05 발송 결과 (F-ARC-021~023)', 'P-ARC-09 최종 합격자 사용자 등록 (F-ARC-036~038)'],
  },
  {
    id: 'P-ARC-03',
    path: '/admin/recruit/applicants/:applicantId',
    title: '지원서 상세',
    summary: '한 지원자의 응답 · 자동 평가 점수 · 결과 · 처리 이력을 함께 보고 면접 일정을 정합니다.',
    figma: '07-5-1 · 07-5-6',
    functions: 'F-ARC-013~016 · 035 · 039',
    area: 'recruit',
    section: 'recruit',
    page: 'ApplicantDetailPage',
    popups: ['P-ARC-08 결과 잠금 해제 (F-ARC-017, Lead만)'],
  },
  {
    id: 'P-ARC-06',
    path: '/admin/recruit/templates',
    title: '이메일 템플릿',
    summary: '전형 결과별 메일 양식을 만들고 고칩니다.',
    figma: '07-6',
    functions: 'F-ARC-024~030',
    area: 'recruit',
    section: 'recruit',
    page: 'MailTemplatesPage',
  },
] as const satisfies readonly AdminScreen[]

export type AdminScreenId = (typeof ADMIN_SCREENS)[number]['id']

export const screenById = (id: AdminScreenId): AdminScreen => ADMIN_SCREENS.find((x) => x.id === id)!

/** 화면 주소 (링크는 이 함수로: 주소가 바뀌어도 한곳만 고친다) */
export const adminPath = {
  login: '/admin/login',
  dashboard: '/admin',
  teams: '/admin/boards/teams',
  community: '/admin/boards/community',
  communityWrite: '/admin/boards/community/write',
  projects: '/admin/projects',
  projectWrite: (id?: string) => (id ? `/admin/projects/write?id=${encodeURIComponent(id)}` : '/admin/projects/write'),
  contents: '/admin/contents',
  users: '/admin/users',
  userHistory: '/admin/users/history',
  recruitForm: '/admin/recruit/form',
  recruitCriteria: '/admin/recruit/form/criteria',
  applicants: '/admin/recruit/applicants',
  applicant: (id: string) => `/admin/recruit/applicants/${encodeURIComponent(id)}`,
  templates: '/admin/recruit/templates',
  board: (board: 'teams' | 'community') => (board === 'teams' ? '/admin/boards/teams' : '/admin/boards/community'),
} as const
