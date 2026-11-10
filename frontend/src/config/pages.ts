import type { PreviewPlace } from '@/data/repositories'

/**
 * 아직 만들지 않은 페이지의 계획. 배범서 '기획 구체화'(노션)와 Figma 와이어프레임 화면 번호를 따른다.
 * 여기 있는 페이지 중 router.tsx 의 BUILT_ROUTES 에 없는 것은 자동으로 '준비 중' 페이지가 된다 (지금: 없음. teams 는 예시 게시판으로 열었다).
 * 관리자 화면(/admin)은 여기 없다: 예시 화면으로 만들었다 (features/admin, docs/ADMIN.md).
 * projects · community · recruits 는 실제 페이지가 있어 lead 는 쓰이지 않고, 기획 메모로만 남긴다.
 * 페이지를 실제로 만들면: 여기서 지우고 → features/ 에 페이지를 만들고 → router.tsx 의 BUILT_ROUTES 에 넣는다.
 */
export interface PagePlan {
  /** 지도 장소와 같은 페이지면 그 id (최근 글 미리보기를 같이 보여준다) */
  place?: PreviewPlace
  title: string
  sub: string
  /** 방문자에게 보이는 한 줄 (~습니다체) */
  lead: string
  /** ── 아래는 팀 내부용. SHOW_PLAN 일 때만 화면에 나온다 ── */
  wireframe: string
  features: string[]
  /** 팀에서 정해야 하는 것 */
  open?: string[]
}

export const PAGE_PLANS = {
  projects: {
    place: 'projects',
    title: '프로젝트',
    sub: '팀 프로젝트 모음',
    lead: 'G-Sprint 팀 프로젝트를 모아 보여줄 공간입니다. 4기 프로젝트는 12.29 데모데이(성과공유회)에서 처음 공개합니다.',
    wireframe: '02',
    features: ['검색', '카드 3열, 2열, 1열 (썸네일, 제목, 짧은 설명)', '아래쪽 페이지 나누기'],
    open: ['관리자만 올릴지, 회원도 올릴지'],
  },
  teams: {
    place: 'teams',
    title: '팀원 찾기',
    sub: '스터디, 프로젝트, 공모전을 함께할 멤버끼리 팀 꾸리기',
    lead: '스터디, 프로젝트, 공모전을 같이할 팀원을 찾는 게시판입니다. 멤버가 글을 올리고 댓글로 이야기할 수 있게 준비하고 있습니다.',
    wireframe: '03, 03-1, 03-2',
    features: ['검색', '한 페이지에 10개', '글 작성: 제목, 기간, 내용 (작성할 때 회원 인증)', '글 조회 + 댓글'],
    open: ['회원 인증 방식 (관리자가 준 고유 ID)'],
  },
  community: {
    place: 'community',
    title: '커뮤니티',
    sub: '공지, 세션, 행사, 정보 공유',
    lead: '공지와 세션 자료, 행사 소식을 모으는 게시판입니다.',
    wireframe: '04, 04-1, 04-2',
    features: ['분류: 공지, 세션, 행사, 정보 공유, 기타', '검색', '한 페이지에 10개', '글 작성, 조회, 댓글'],
    open: ["세션 자료 아카이브를 여기 '세션' 분류로 둘지"],
  },
  recruits: {
    place: 'recruits',
    title: '지원하기',
    sub: '5기 모집',
    lead: '5기 모집 일정과 지원 방법을 이곳에 안내합니다.',
    wireframe: '05, 05-1, 05-2',
    features: ['모집 일정 이미지', '지원하기 (지원 기간이 아니면 안내 팝업)', '지원서 작성'],
    open: ['지원서를 직접 받을지, Google Forms로 연결할지', '지원 자격, 선발 절차, 활동 시간 문구'],
  },
} satisfies Record<string, PagePlan>

export type PagePlanId = keyof typeof PAGE_PLANS

export const PAGE_PLAN_IDS = Object.keys(PAGE_PLANS) as PagePlanId[]
