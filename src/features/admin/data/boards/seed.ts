import { seedTools, type SeedContext } from '../common/seedContext'
import type { FileRef } from '../common/types'
import type { AdminComment, AdminPost, BoardId, BoardsState, CommunityCategory, PostCategory, TeamsCategory } from './types'

/** seed 모양(필드)을 바꾸면 1 올린다: 이 탭에 저장된 옛 게시판 데이터가 새 seed 로 바뀐다 */
export const BOARDS_SEED_VERSION = 2

/**
 * 게시판 예시 데이터: Teams 글 23 · Community 글 22 · 댓글 31 (페이지 나누기 · 분류 · 검색을 시험할 만큼).
 * 주인: 2단계 게시판 담당. 대시보드도 이 데이터를 읽는다 (최근 24시간 글 · 댓글, 최근 5개).
 * 규칙 (BRIEF): 이름은 '예시 멤버 01' 처럼 누가 봐도 예시, 제목 · 내용에 '예시'. 관리자 글 작성자는 '운영진'.
 * - 번호는 게시판마다 오래된 글부터 1, 2, 3 … (아래 목록 순서와 상관없이 작성 시각으로 매긴다)
 * - Community 공지는 2개 (전체 탭 맨 위 고정)
 * - Community 세션 · 행사 글의 기간은 모두 지난 날짜: 대시보드 '행사 일정'은 실제 일정(events.json)을 보여 주고,
 *   관리자가 이 화면에서 새로 쓴 글의 기간만 더한다
 * - Teams 모집 상태는 종료일이 지났으면 '마감' (F-SYS-001), 한 글은 작성자가 직접 마감한 예
 */
export function createBoardsSeed(ctx: SeedContext): BoardsState {
  const { ago, dayOffset, by } = seedTools(ctx)
  const today = dayOffset(0)

  const base = (board: BoardId, id: string, category: PostCategory, title: string, createdAt: string, extra: Partial<AdminPost>): AdminPost => ({
    id,
    board,
    no: 0,
    category,
    title,
    content: `${title}\n\n예시 글입니다. 실제 게시글이 아니며, 관리자 화면을 보여 주려고 만든 내용입니다.`,
    authorName: '예시 멤버 01',
    byAdmin: false,
    createdAt,
    views: 12,
    startDate: null,
    endDate: null,
    recruitStatus: null,
    attachments: [],
    posted: null,
    deleted: null,
    ...extra,
  })

  /** Teams 글: daysAgo 에 시작해 periodDays 동안 모집. 종료일이 지났으면 마감 */
  const teams = (id: string, category: TeamsCategory, title: string, author: string, createdAt: string, views: number, start: number, periodDays: number, extra: Partial<AdminPost> = {}): AdminPost => {
    const endDate = dayOffset(start - periodDays)
    return base('teams', id, category, title, createdAt, { authorName: author, views, startDate: dayOffset(start), endDate, recruitStatus: endDate < today ? '마감' : '모집중', ...extra })
  }
  /** Community 회원 글 (정보 공유 · 기타) */
  const member = (id: string, category: CommunityCategory, title: string, author: string, createdAt: string, views: number, extra: Partial<AdminPost> = {}): AdminPost =>
    base('community', id, category, title, createdAt, { authorName: author, views, ...extra })
  /** Community 관리자 글 (공지 · 세션 · 행사): 작성자는 '운영진', 게시한 계정은 내부 기록 */
  const admin = (id: string, category: CommunityCategory, title: string, createdAt: string, views: number, who: 'A' | 'B' | 'C', period?: [number, number]): AdminPost =>
    base('community', id, category, title, createdAt, {
      authorName: '운영진',
      byAdmin: true,
      views,
      posted: by(who, createdAt),
      ...(period ? { startDate: dayOffset(period[0]), endDate: dayOffset(period[1]) } : {}),
    })

  const file = (fileId: string, name: string, type: string, size: number): FileRef => ({ fileId, url: '', name, type, size })

  const posts: AdminPost[] = [
    // ── Teams ──
    teams('tp-01', '스터디', '[예시] 알고리즘 스터디 같이 하실 분', '예시 멤버 01', ago({ days: 9, hours: 3 }), 41, 9, 7),
    teams('tp-02', '프로젝트', '[예시] 사이드 프로젝트 프런트엔드 팀원 구합니다', '예시 멤버 02', ago({ days: 6, hours: 5 }), 33, 6, 14, {
      attachments: [file('seed-file-tp02', '예시_프로젝트_소개.pdf', 'application/pdf', 1_258_291)],
    }),
    teams('tp-03', '공모전', '[예시] 공모전 디자이너 한 분 찾습니다', '예시 멤버 03', ago({ days: 3, hours: 1 }), 27, 3, 7),
    teams('tp-04', '소모임', '[예시] 점심 코드 리뷰 모임', '예시 멤버 04', ago({ days: 1, hours: 6 }), 9, 1, 14),
    teams('tp-05', '기타', '[예시] 모의 면접 짝 구해요', '예시 멤버 05', ago({ hours: 5 }), 4, 0, 7),
    teams('tp-06', '프로젝트', '[예시] 백엔드 개발자 한 분 모십니다', '예시 멤버 06', ago({ hours: 2, minutes: 10 }), 2, 0, 10),
    teams('tp-07', '프로젝트', '[예시] 해커톤 같이 나갈 기획자 찾습니다', '예시 멤버 07', ago({ days: 11, hours: 2 }), 58, 11, 14),
    teams('tp-08', '스터디', '[예시] 운영체제 스터디원 모집', '예시 멤버 08', ago({ days: 13, hours: 4 }), 36, 13, 10),
    teams('tp-09', '소모임', '[예시] 아침 러닝 소모임', '예시 멤버 09', ago({ days: 15, hours: 1 }), 22, 15, 30),
    teams('tp-10', '공모전', '[예시] 데이터 분석 공모전 팀원 구해요', '예시 멤버 10', ago({ days: 17, hours: 7 }), 47, 17, 10),
    teams('tp-11', '기타', '[예시] 노트북 거치대 같이 공동구매 하실 분', '예시 멤버 11', ago({ days: 19, hours: 3 }), 15, 19, 7),
    teams('tp-12', '프로젝트', '[예시] 안드로이드 앱 디자이너 모집', '예시 멤버 07', ago({ days: 21, hours: 5 }), 63, 21, 14),
    // 작성자가 종료일 전에 직접 마감한 글 (F-TEM-009 5)
    teams('tp-13', '스터디', '[예시] 영어 기술 문서 읽기 모임', '예시 멤버 12', ago({ days: 23 }), 19, 2, 20, { recruitStatus: '마감' }),
    teams('tp-14', '스터디', '[예시] 클라우드 자격증 스터디', '예시 멤버 13', ago({ days: 25, hours: 6 }), 71, 25, 14),
    teams('tp-15', '프로젝트', '[예시] 백엔드 API 설계 같이 해 봐요', '예시 멤버 08', ago({ days: 27, hours: 2 }), 44, 27, 14),
    teams('tp-16', '소모임', '[예시] 보드게임 소모임 인원 모집', '예시 멤버 14', ago({ days: 29, hours: 8 }), 28, 29, 7),
    teams('tp-17', '공모전', '[예시] 교내 아이디어 공모전 함께해요', '예시 멤버 15', ago({ days: 31, hours: 1 }), 52, 31, 10),
    teams('tp-18', '기타', '[예시] 발표 연습 같이 하실 분', '예시 멤버 16', ago({ days: 34, hours: 3 }), 17, 34, 7),
    teams('tp-19', '프로젝트', '[예시] 웹 접근성 점검 도구 만들 분', '예시 멤버 07', ago({ days: 37, hours: 4 }), 66, 37, 21),
    teams('tp-20', '스터디', '[예시] 자료구조 기초 스터디', '예시 멤버 17', ago({ days: 40, hours: 2 }), 38, 40, 14),
    teams('tp-21', '소모임', '[예시] 사진 찍는 개발자 모임', '예시 멤버 18', ago({ days: 43, hours: 6 }), 24, 43, 30),
    teams('tp-22', '공모전', '[예시] 오픈소스 기여 대회 팀 구합니다', '예시 멤버 19', ago({ days: 46, hours: 5 }), 49, 46, 14),
    teams('tp-23', '기타', '[예시] 중고 전공책 나눔합니다', '예시 멤버 20', ago({ days: 50, hours: 1 }), 31, 50, 7),

    // ── Community ──
    admin('cp-01', '공지', '[예시] 4기 활동 규칙 안내', ago({ days: 12 }), 120, 'A'),
    { ...admin('cp-02', '세션', '[예시] 파트별 세션 자료 모음', ago({ days: 8, hours: 2 }), 64, 'B', [8, 8]), attachments: [file('seed-file-cp02a', '예시_세션자료.pdf', 'application/pdf', 2_411_724), file('seed-file-cp02b', '예시_화면설계.png', 'image/png', 655_360)] },
    member('cp-03', '정보 공유', '[예시] 개발 공부에 도움이 된 글 모음', '예시 멤버 21', ago({ days: 5, hours: 4 }), 38),
    admin('cp-04', '행사', '[예시] 중간 발표 안내', ago({ days: 7, hours: 3 }), 52, 'A', [5, 5]),
    member('cp-05', '기타', '[예시] 동아리방 분실물 안내', '예시 멤버 22', ago({ days: 2, hours: 8 }), 11),
    member('cp-06', '정보 공유', '[예시] 학교 근처 공부하기 좋은 곳', '예시 멤버 23', ago({ hours: 9 }), 7),
    admin('cp-07', '공지', '[예시] 이번 주 세션 장소 변경', ago({ hours: 3, minutes: 20 }), 18, 'B'),
    { ...admin('cp-08', '세션', '[예시] 1주차 세션: 협업 도구 익히기', ago({ days: 30, hours: 3 }), 88, 'A', [28, 28]), attachments: [file('seed-file-cp08', '예시_1주차_안내.pdf', 'application/pdf', 830_000)] },
    admin('cp-09', '행사', '[예시] 4기 첫 모임 안내', ago({ days: 45, hours: 2 }), 143, 'A', [40, 40]),
    member('cp-10', '정보 공유', '[예시] 깃 커밋 메시지 쓰는 법 정리', '예시 멤버 24', ago({ days: 16, hours: 5 }), 57),
    member('cp-11', '기타', '[예시] 동아리 단체 티셔츠 수요 조사', '예시 멤버 25', ago({ days: 18, hours: 1 }), 64),
    member('cp-12', '정보 공유', '[예시] 무료로 쓸 수 있는 디자인 도구 모음', '예시 멤버 26', ago({ days: 20, hours: 6 }), 45),
    admin('cp-13', '세션', '[예시] 2주차 세션: 화면 설계 기초', ago({ days: 22, hours: 2 }), 76, 'C', [21, 21]),
    member('cp-14', '정보 공유', '[예시] 면접 준비할 때 본 자료', '예시 멤버 27', ago({ days: 24, hours: 4 }), 69),
    member('cp-15', '기타', '[예시] 스터디룸 예약 방법 질문', '예시 멤버 28', ago({ days: 26, hours: 7 }), 21),
    admin('cp-16', '행사', '[예시] 선배와의 대화 행사 안내', ago({ days: 33, hours: 5 }), 97, 'B', [31, 31]),
    member('cp-17', '정보 공유', '[예시] 클라우드 무료 크레딧 받는 법', '예시 멤버 24', ago({ days: 36, hours: 2 }), 81),
    member('cp-18', '기타', '[예시] 우산 주인 찾습니다', '예시 멤버 29', ago({ days: 38, hours: 3 }), 13),
    admin('cp-19', '세션', '[예시] 3주차 세션: API 다루기', ago({ days: 15, hours: 3 }), 72, 'A', [14, 14]),
    member('cp-20', '정보 공유', '[예시] 개발 블로그 시작하기', '예시 멤버 30', ago({ days: 10, hours: 6 }), 34),
    member('cp-21', '기타', '[예시] 동아리방 청소 당번 정하기', '예시 멤버 31', ago({ days: 6, hours: 2 }), 16),
    member('cp-22', '정보 공유', '[예시] 자주 쓰는 단축키 모음', '예시 멤버 25', ago({ days: 1, hours: 2 }), 9),
  ]

  // 번호: 게시판마다 오래된 글부터 1, 2, 3 …
  const counters: Record<BoardId, number> = { teams: 0, community: 0 }
  const numbered = [...posts].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((p) => ({ ...p, no: ++counters[p.board] }))
  const byId = new Map(numbered.map((p) => [p.id, p]))

  const comment = (id: string, postId: string, authorName: string, content: string, createdAt: string): AdminComment => ({
    id,
    board: byId.get(postId)?.board ?? 'teams',
    postId,
    authorName,
    content,
    createdAt,
    deleted: null,
  })

  const comments: AdminComment[] = [
    comment('tc-01', 'tp-01', '예시 멤버 32', '예시 댓글입니다. 저도 참여하고 싶습니다.', ago({ days: 8 })),
    comment('tc-02', 'tp-02', '예시 멤버 33', '예시 댓글입니다. 어떤 기술을 쓰는지 궁금합니다.', ago({ days: 5 })),
    comment('cc-01', 'cp-03', '예시 멤버 34', '예시 댓글입니다. 좋은 글 감사합니다.', ago({ days: 4, hours: 2 })),
    comment('tc-03', 'tp-03', '예시 멤버 35', '예시 댓글입니다. 포트폴리오를 보내 드려도 될까요?', ago({ days: 2 })),
    comment('cc-02', 'cp-05', '예시 멤버 36', '예시 댓글입니다. 제 것 같아요.', ago({ days: 1, hours: 20 })),
    comment('tc-04', 'tp-04', '예시 멤버 37', '예시 댓글입니다. 다음 주부터 갈게요.', ago({ hours: 20 })),
    comment('cc-03', 'cp-06', '예시 멤버 38', '예시 댓글입니다. 주말에도 여나요?', ago({ hours: 7 })),
    comment('tc-05', 'tp-05', '예시 멤버 39', '예시 댓글입니다. 시간 맞춰 봐요.', ago({ hours: 4 })),
    comment('cc-04', 'cp-07', '예시 멤버 40', '예시 댓글입니다. 확인했습니다.', ago({ hours: 2, minutes: 40 })),
    comment('tc-06', 'tp-06', '예시 멤버 41', '예시 댓글입니다. 지원하고 싶습니다.', ago({ minutes: 35 })),
    comment('tc-07', 'tp-07', '예시 멤버 32', '예시 댓글입니다. 기획 경험은 적지만 참여해도 될까요?', ago({ days: 10 })),
    comment('tc-08', 'tp-08', '예시 멤버 42', '예시 댓글입니다. 교재는 무엇으로 하나요?', ago({ days: 12 })),
    comment('tc-09', 'tp-10', '예시 멤버 43', '예시 댓글입니다. 마감 전에 연락드릴게요.', ago({ days: 16 })),
    comment('tc-10', 'tp-12', '예시 멤버 44', '예시 댓글입니다. 포트폴리오 링크를 남깁니다.', ago({ days: 20 })),
    comment('tc-11', 'tp-14', '예시 멤버 45', '예시 댓글입니다. 시험 날짜가 언제인가요?', ago({ days: 24 })),
    comment('tc-12', 'tp-15', '예시 멤버 32', '예시 댓글입니다. 저도 함께하고 싶습니다.', ago({ days: 26 })),
    comment('tc-13', 'tp-17', '예시 멤버 46', '예시 댓글입니다. 아이디어 회의는 언제 하나요?', ago({ days: 30 })),
    comment('tc-14', 'tp-19', '예시 멤버 47', '예시 댓글입니다. 접근성 공부 중이라 관심 있습니다.', ago({ days: 36 })),
    comment('tc-15', 'tp-20', '예시 멤버 48', '예시 댓글입니다. 처음 배우는 사람도 괜찮나요?', ago({ days: 39 })),
    comment('tc-16', 'tp-22', '예시 멤버 42', '예시 댓글입니다. 팀 자리가 아직 남았나요?', ago({ days: 45 })),
    comment('cc-05', 'cp-10', '예시 멤버 49', '예시 댓글입니다. 정리해 주셔서 고맙습니다.', ago({ days: 15 })),
    comment('cc-06', 'cp-11', '예시 멤버 50', '예시 댓글입니다. 저는 L 사이즈로 신청합니다.', ago({ days: 17 })),
    comment('cc-07', 'cp-12', '예시 멤버 51', '예시 댓글입니다. 저장해 두고 쓰겠습니다.', ago({ days: 19 })),
    comment('cc-08', 'cp-14', '예시 멤버 49', '예시 댓글입니다. 도움이 많이 됐어요.', ago({ days: 23 })),
    comment('cc-09', 'cp-15', '예시 멤버 52', '예시 댓글입니다. 학교 누리집에서 예약할 수 있습니다.', ago({ days: 25 })),
    comment('cc-10', 'cp-17', '예시 멤버 53', '예시 댓글입니다. 신청 절차가 바뀌었나요?', ago({ days: 35 })),
    comment('cc-11', 'cp-18', '예시 멤버 54', '예시 댓글입니다. 검은색 우산이면 제 것 같습니다.', ago({ days: 37 })),
    comment('cc-12', 'cp-20', '예시 멤버 55', '예시 댓글입니다. 저도 시작해 보겠습니다.', ago({ days: 9 })),
    comment('cc-13', 'cp-21', '예시 멤버 50', '예시 댓글입니다. 다음 주부터 하면 좋겠습니다.', ago({ days: 5 })),
    comment('cc-14', 'cp-22', '예시 멤버 56', '예시 댓글입니다. 유용한 정보 감사합니다.', ago({ hours: 22 })),
    comment('cc-15', 'cp-19', '예시 멤버 57', '예시 댓글입니다. 세션 자료는 어디서 받나요?', ago({ days: 14 })),
  ]

  return { posts: numbered, comments }
}
