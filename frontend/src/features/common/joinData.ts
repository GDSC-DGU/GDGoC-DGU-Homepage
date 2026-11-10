import type { RecruitStatus } from '@/content/recruitingStatus'

/**
 * 페이지 끝 '{gen}기에서 만나요'(JoinStrip) 계산 (DOM 없음, common.test.ts 에 테스트).
 * 모집 상태 문장 · 자주 묻는 질문은 홈과 같은 것을 쓴다: content/story.ts CLOSING · features/home/homeData.ts closingStatusLine · pickFaqs.
 */

export interface JoinPrimary {
  /** apply: 모집 중이고 지원서 주소가 있을 때 '지원서 쓰기' · notify: 그 밖 '{gen}기 소식 받기' (인스타그램) */
  kind: 'apply' | 'notify'
  label: string
  href: string
  /** 읽기 프로그램에만 덧붙는 말 (어디로 · 새 창) */
  hidden: string
}

/** 주 버튼 하나: 모집 중이면 지원서, 아니면 소식 채널. 링크는 홈 마무리(ClosingSection)와 같은 값 */
export function joinPrimary(st: RecruitStatus): JoinPrimary {
  if (st.state === 'open' && st.applyUrl) return { kind: 'apply', label: '지원서 쓰기', href: st.applyUrl, hidden: ` (${st.generation}기 지원서, 새 창)` }
  return { kind: 'notify', label: `${st.generation}기 소식 받기`, href: st.channelUrl, hidden: ' (인스타그램, 새 창)' }
}

/**
 * 팀원 찾기가 열리면 생길 것 (/teams 의 JoinStrip 변형).
 * config/pages.ts PAGE_PLANS.teams.features(팀 기획)를 방문자 말로 줄인 것이다. from 은 그 기획 줄 그대로 (테스트가 확인한다).
 */
export const TEAMS_WILL_HAVE = [
  {
    id: 'post',
    name: '팀원 찾는 글',
    desc: '스터디, 프로젝트, 공모전마다 제목, 기간, 내용을 적어 올립니다. 글은 멤버 인증을 거쳐 씁니다.',
    from: '글 작성: 제목, 기간, 내용 (작성할 때 회원 인증)',
  },
  { id: 'comment', name: '댓글', desc: '올라온 글을 읽고 댓글로 이야기합니다.', from: '글 조회 + 댓글' },
  { id: 'search', name: '검색', desc: '올라온 글을 검색해 찾습니다.', from: '검색' },
] as const

/** /teams 변형의 머리 문구 */
export const TEAMS_JOIN = {
  title: '팀원 찾기는 준비하고 있습니다',
  /** {handle}: 인스타그램 계정 */
  sub: '여는 시기는 정해지지 않았습니다. 열리면 인스타그램 {handle}에 알립니다.',
  asideTitle: '열리면 생길 것',
} as const
