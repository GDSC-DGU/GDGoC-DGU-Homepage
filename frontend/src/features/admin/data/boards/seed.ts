import { EVENTS } from '@/content'
import type { EventKind, ScheduleEvent } from '@/domain/types'
import { statusOf } from '@/features/teams/data/rules'
import { createSampleSeed, SAMPLE_ACCOUNTS } from '@/features/teams/data/sampleSeed'
import { kstToday } from '@/lib/date'
import { ADMIN_SAMPLE } from '../../sample'
import { formatDay } from '../../ui/format'
import { seedTools, type SeedContext } from '../common/seedContext'
import type { AdminComment, AdminPost, BoardId, BoardsState, CommunityCategory } from './types'

/** seed 모양(필드)을 바꾸면 1 올린다: 이 탭에 저장된 옛 게시판 데이터가 새 seed 로 바뀐다 */
export const BOARDS_SEED_VERSION = 3

/** 일정 종류 → Community 분류 (휴회는 공지로 알린다) */
const CATEGORY_OF_KIND: Partial<Record<EventKind, CommunityCategory>> = { session: '세션', event: '행사', recruit: '행사', sprint: '행사', rest: '공지', notice: '공지' }

/** 일정 글은 그 날 일주일 전 10:00 (KST) 에 올린 것으로 둔다 (아직 그 시각이 오지 않은 일정은 글이 없다) */
const POST_DAYS_BEFORE = 7

/**
 * 게시판 처음 데이터 (공개 사이트와 같은 자료에서 만든다).
 * - Teams: 공개 팀원 찾기(/teams)의 프로토타입 데이터(teams/data/sampleSeed.ts)를 그대로. 글 · 작성자(이름 · 기수) · 작성 시각 · 조회수 ·
 *   기간 · 파트 · 인원 · 첨부 · 댓글이 /teams 와 같다. 모집 상태는 /teams 와 같은 규칙(statusOf)으로 정한다
 * - Community: 지금 기수의 공개 일정(src/content/events.json)을 운영진이 올린 세션 · 행사 글로, 휴회는 공지로.
 *   공개 사이트에는 회원 글 · 댓글 게시판이 없어서 정보 공유 · 기타 글과 댓글은 예시 화면(sample)에서만 채운다
 * 주인: 2단계 게시판 담당. 대시보드도 이 데이터를 읽는다 (최근 24시간 글 · 댓글, 최근 5개).
 */
export function createBoardsSeed(ctx: SeedContext): BoardsState {
  const sample = ctx.sample ?? ADMIN_SAMPLE
  const teams = teamsSeed(ctx.now)
  const community = communitySeed(ctx, sample)
  const posts = [...teams.posts, ...community.posts]

  // 번호: 게시판마다 오래된 글부터 1, 2, 3 … (공개 /teams 의 번호와 같은 규칙)
  const counters: Record<BoardId, number> = { teams: 0, community: 0 }
  const numbered = [...posts].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((p) => ({ ...p, no: ++counters[p.board] }))
  return { posts: numbered, comments: [...teams.comments, ...community.comments] }
}

/** 공개 /teams 와 같은 글 · 댓글 (지금 시각 기준으로 계산하는 것까지 같다) */
function teamsSeed(now: number): BoardsState {
  const today = kstToday(new Date(now))
  const seed = createSampleSeed(today, now)
  const people = new Map(SAMPLE_ACCOUNTS.map((a) => [a.studentId, a]))
  const who = (studentId: string) => {
    const a = people.get(studentId)
    return { authorName: a?.name ?? '알 수 없음', authorGeneration: a?.generation ?? null }
  }

  const posts = seed.posts
    .filter((p) => !p.deleted)
    .map(
      (p): AdminPost => ({
        id: p.id,
        board: 'teams',
        no: 0,
        category: p.category,
        title: p.title,
        content: p.content,
        ...who(p.authorId),
        byAdmin: false,
        createdAt: p.createdAt,
        views: p.views,
        startDate: p.startDate,
        endDate: p.endDate,
        recruitStatus: statusOf(p.endDate, p.closedByAuthor, today),
        closedByAuthor: p.closedByAuthor,
        parts: [...p.parts],
        headcount: p.headcount,
        attachments: p.attachments.map((f) => ({ fileId: f.id, url: f.url, name: f.name, type: f.type, size: f.size })),
        posted: null,
        deleted: null,
      }),
    )
  const comments = seed.comments.map(
    (c): AdminComment => ({
      id: c.id,
      board: 'teams',
      postId: c.postId,
      ...who(c.authorId),
      content: c.content,
      createdAt: c.createdAt,
      deleted: null,
    }),
  )
  return { posts, comments }
}

/** 지금 기수: 공개 일정에서 가장 최근 기수 */
const currentGeneration = (events: readonly ScheduleEvent[]) => Math.max(0, ...events.map((e) => e.generation ?? 0))

/** 일정 → 글 내용 (일정에 적힌 사실만: 날짜 · 장소 · 행사 페이지) */
function eventContent(e: ScheduleEvent): string {
  const day = formatDay(e.date) + (e.endDate ? ` – ${formatDay(e.endDate)}` : '')
  if (e.kind === 'rest') return `${day} 정기 모임은 ${e.title}로 쉽니다.\n다음 모임은 홈페이지 커뮤니티의 '다가오는 일정'에서 확인해 주세요.`
  const lines = [e.title, '', `일시: ${day}`, `장소: ${e.venue ?? '정해지면 다시 알립니다'}`]
  if (e.url) lines.push('', `행사 페이지: ${e.url}`)
  return lines.join('\n')
}

function communitySeed(ctx: SeedContext, sample: boolean): BoardsState {
  const { by } = seedTools(ctx)
  const generation = currentGeneration(EVENTS)
  const writers = ['A', 'B', 'C'] as const

  const posts = EVENTS.filter((e) => e.generation === generation && CATEGORY_OF_KIND[e.kind])
    .map((e) => ({ e, at: new Date(Date.parse(`${e.date}T10:00:00+09:00`) - POST_DAYS_BEFORE * 86_400_000).toISOString() }))
    .filter(({ at }) => Date.parse(at) <= ctx.now)
    .map(({ e, at }, i): AdminPost => {
      const category = CATEGORY_OF_KIND[e.kind]!
      const notice = category === '공지'
      return {
        id: `cp-${e.id}`,
        board: 'community',
        no: 0,
        category,
        title: notice ? `${formatDay(e.date).slice(5).replace(/[()]/g, '')} ${e.title} 안내` : e.title,
        content: eventContent(e),
        authorName: '운영진',
        byAdmin: true,
        createdAt: at,
        // 공개 사이트에는 글 화면이 없어 조회수를 세지 않는다 (목록은 조회수 대신 일정을 보여 준다)
        views: 0,
        startDate: notice ? null : e.date,
        endDate: notice ? null : (e.endDate ?? e.date),
        recruitStatus: null,
        attachments: [],
        posted: by(writers[i % writers.length], at),
        deleted: null,
      }
    })

  if (!sample) return { posts, comments: [] }
  const extra = sampleMemberPosts(ctx)
  return { posts: [...posts, ...extra.posts], comments: extra.comments }
}

/**
 * 예시 화면에서만: Community 회원 글(정보 공유 · 기타)과 댓글. 공개 사이트에 아직 없는 게시판이라 '[예시]' 를 붙인다.
 * 작성자는 사용자 목록에 있는 사람(teams 의 SAMPLE_ACCOUNTS)으로.
 */
function sampleMemberPosts(ctx: SeedContext): BoardsState {
  const { ago } = seedTools(ctx)
  const person = (n: number) => SAMPLE_ACCOUNTS[(n - 1) % 14]
  const member = (id: string, category: CommunityCategory, title: string, author: number, createdAt: string, views: number): AdminPost => {
    const a = person(author)
    return {
      id,
      board: 'community',
      no: 0,
      category,
      title,
      content: `${title}\n\n예시 글입니다. 실제 게시글이 아니며, 관리자 화면을 보여 주려고 만든 내용입니다.`,
      authorName: a.name,
      authorGeneration: a.generation,
      byAdmin: false,
      createdAt,
      views,
      startDate: null,
      endDate: null,
      recruitStatus: null,
      attachments: [],
      posted: null,
      deleted: null,
    }
  }
  const posts: AdminPost[] = [
    member('cp-m01', '정보 공유', '[예시] 개발 공부에 도움이 된 글 모음', 1, ago({ days: 5, hours: 4 }), 38),
    member('cp-m02', '기타', '[예시] 동아리방 분실물 안내', 2, ago({ days: 2, hours: 8 }), 11),
    member('cp-m03', '정보 공유', '[예시] 학교 근처 공부하기 좋은 곳', 3, ago({ hours: 9 }), 7),
    member('cp-m04', '정보 공유', '[예시] 깃 커밋 메시지 쓰는 법 정리', 4, ago({ days: 16, hours: 5 }), 57),
    member('cp-m05', '기타', '[예시] 동아리 단체 티셔츠 수요 조사', 5, ago({ days: 18, hours: 1 }), 64),
    member('cp-m06', '정보 공유', '[예시] 무료로 쓸 수 있는 디자인 도구 모음', 6, ago({ days: 20, hours: 6 }), 45),
    member('cp-m07', '기타', '[예시] 스터디룸 예약 방법 질문', 7, ago({ days: 26, hours: 7 }), 21),
    member('cp-m08', '정보 공유', '[예시] 자주 쓰는 단축키 모음', 8, ago({ days: 1, hours: 2 }), 9),
  ]
  const comment = (id: string, postId: string, author: number, content: string, createdAt: string): AdminComment => {
    const a = person(author)
    return { id, board: 'community', postId, authorName: a.name, authorGeneration: a.generation, content, createdAt, deleted: null }
  }
  const comments: AdminComment[] = [
    comment('cc-01', 'cp-m01', 9, '예시 댓글입니다. 좋은 글 감사합니다.', ago({ days: 4, hours: 2 })),
    comment('cc-02', 'cp-m02', 10, '예시 댓글입니다. 제 것 같아요.', ago({ days: 1, hours: 20 })),
    comment('cc-03', 'cp-m03', 11, '예시 댓글입니다. 주말에도 여나요?', ago({ hours: 7 })),
    comment('cc-04', 'cp-m04', 12, '예시 댓글입니다. 정리해 주셔서 고맙습니다.', ago({ days: 15 })),
    comment('cc-05', 'cp-m05', 13, '예시 댓글입니다. 저는 L 사이즈로 신청합니다.', ago({ days: 17 })),
    comment('cc-06', 'cp-m08', 14, '예시 댓글입니다. 유용한 정보 감사합니다.', ago({ hours: 22 })),
  ]
  return { posts, comments }
}
