import { dayValue } from '@/lib/date'
import type { Attachment, TeamPartId, TeamsCategory, Ymd } from './types'

/**
 * 프로토타입 데이터 (백엔드가 생기기 전, 게시판이 운영 중인 모습을 팀원에게 보여 주는 용도).
 * 사람 · 글 · 댓글은 모두 지어낸 것이다 (실제 멤버가 아님). 공개 배포에서 프로토타입을 끄면 화면 위에 '예시 화면' 안내가 붙는다.
 * 날짜는 오늘을 기준으로 계산한다 (언제 열어도 모집중 · 마감 · 마감 임박이 섞여 보이게).
 */

export interface SampleAccount {
  studentId: string
  name: string
  generation: number
  /** null 이면 PIN 을 아직 설정하지 않은 계정 */
  pin: string | null
}

/** 직접 써 볼 수 있는 계정 (팀원에게 알려 주는 용도) */
export const DEMO_ACCOUNT = { studentId: '2026000101', pin: '0000' } as const

const account = (n: number, name: string, generation: number, pin: string | null = '0000'): SampleAccount => ({
  studentId: `${2022 + generation}000${String(100 + n).padStart(3, '0')}`,
  name,
  generation,
  pin,
})

export const SAMPLE_ACCOUNTS: readonly SampleAccount[] = [
  account(1, '김민준', 4),
  account(2, '이서연', 4),
  account(3, '박지호', 3),
  account(4, '문유진', 4),
  account(5, '장하윤', 3),
  account(6, '강도현', 4),
  account(7, '서윤재', 4),
  account(8, '송재원', 4),
  account(9, '오채린', 3),
  account(10, '임건우', 4),
  account(11, '신예은', 2),
  account(12, '조현서', 4),
  account(13, '배수아', 4),
  account(14, '홍태민', 3),
  account(99, '한지우', 4, null),
]

/** 첨부 파일 (public/teams-files 에 실제 한 쪽짜리 PDF 가 있다) */
interface SeedFile {
  name: string
  path: string
  size: number
}
const FILES = {
  lostfound: { name: '분실물앱_기획서.pdf', path: 'teams-files/lostfound-plan.pdf', size: 439_324 },
  contest: { name: '공모전_준비_메모.pdf', path: 'teams-files/commute-contest-memo.pdf', size: 294_019 },
} satisfies Record<string, SeedFile>

export interface SeedPost {
  id: string
  category: TeamsCategory
  title: string
  content: string
  authorId: string
  createdAt: string
  editedAt: string | null
  views: number
  startDate: Ymd
  endDate: Ymd
  closedByAuthor: boolean
  parts: TeamPartId[]
  headcount: number | null
  contactUrl: string | null
  attachments: Attachment[]
  deleted: boolean
}

export interface SeedComment {
  id: string
  postId: string
  authorId: string
  content: string
  createdAt: string
}

interface Row {
  category: TeamsCategory
  title: string
  author: number
  /** 몇 시간 전에 썼는지 */
  hoursAgo: number
  /** 모집 기간 (일) */
  days: number
  parts: TeamPartId[]
  headcount: number | null
  /** 관심도 (조회수는 이 값과 글이 올라온 뒤 지난 시간으로 정한다) */
  views: number
  body: string
  contact?: string
  closed?: boolean
  file?: SeedFile
  edited?: boolean
}

const ROWS: Row[] = [
  {
    category: '프로젝트',
    title: '캠퍼스 분실물 찾기 앱 같이 만들 FE · BE 구해요',
    author: 1,
    hoursAgo: 3,
    days: 14,
    parts: ['frontend', 'backend'],
    headcount: 2,
    views: 41,
    contact: 'https://open.kakao.com/o/gK7xQm2a',
    file: FILES.lostfound,
    body: '학교 분실물 게시판이 흩어져 있어서 한 곳에서 찾고 올릴 수 있는 앱을 만들어 보려고 합니다.\n\n지금 기획 · 화면 초안까지 나와 있고, 같이 구현할 FE 1명 · BE 1명을 찾습니다.\n\n- 스택: React Native, Spring Boot (바꿀 수 있어요)\n- 진행: 주 1회 오프라인 회의 (수요일 저녁, 신공학관), 나머지는 디스코드\n- 기간: 12월 말 데모데이까지 MVP 목표\n\n기획서 첨부했어요. 오픈채팅이나 댓글로 편하게 물어봐 주세요!',
  },
  {
    category: '스터디',
    title: '매주 화요일 저녁 코딩테스트 스터디 (프로그래머스 Lv.2)',
    author: 2,
    hoursAgo: 9,
    days: 8,
    parts: [],
    headcount: 4,
    views: 57,
    body: '세션 끝나고 바로 1시간씩 코딩테스트 문제 풀이하는 스터디입니다.\n\n- 매주 2문제씩 미리 풀어 오고, 화요일 세션 후 20:00부터 풀이 공유\n- 언어 자유 (파이썬 · 자바 · C++ 다 괜찮아요)\n- 레벨 2 위주, 익숙해지면 레벨 3도\n\n파트 상관없이 하반기 코테 준비하시는 분이면 환영합니다.',
  },
  {
    category: '공모전',
    title: '공공데이터 활용 공모전 같이 나가실 디자이너 · AI 한 분씩 구합니다',
    author: 3,
    hoursAgo: 20,
    days: 10,
    parts: ['design', 'ai'],
    headcount: 2,
    views: 88,
    contact: 'https://open.kakao.com/o/gR2bWf9s',
    file: FILES.contest,
    body: '공공데이터 활용 아이디어 공모전에 나가려고 합니다. 지금 BE 1명 · FE 1명이고, 아래 두 분을 찾아요.\n\n- PD: 서비스 화면 · 발표 자료 디자인\n- AI/ML: 교통 데이터로 혼잡도 예측 모델\n\n아이디어는 "통학 시간대별 붐비는 정도 알려 주기" 쪽으로 잡아 두었고, 같이 다듬으면 좋겠습니다. 준비 메모 첨부합니다.',
  },
  {
    category: '소모임',
    title: '점심에 기술 블로그 한 편씩 읽는 모임',
    author: 8,
    hoursAgo: 30,
    days: 21,
    parts: [],
    headcount: 6,
    views: 34,
    body: '월 · 목 점심에 학식 먹으면서 기술 블로그 글 한 편씩 같이 읽고 이야기하는 가벼운 모임이에요.\n\n준비할 건 없고, 그날 읽을 글은 전날 디스코드에 올립니다. 부담 없이 오세요!',
  },
  {
    category: '스터디',
    title: 'Spring Boot 입문 스터디 — 주 1회 온라인',
    author: 5,
    hoursAgo: 52,
    days: 5,
    parts: ['backend'],
    headcount: 3,
    views: 63,
    contact: 'https://discord.gg/q8VnT3hC',
    body: 'BE 파트 세션 복습 겸 Spring Boot 입문서를 같이 끝까지 보는 스터디입니다.\n\n- 일요일 21:00 온라인 (디스코드 화면 공유)\n- 한 주에 두 장씩, 돌아가며 발표\n- 마지막 2주는 간단한 게시판 API 만들어 보기\n\n자바 문법만 알면 충분해요.',
  },
  {
    category: '프로젝트',
    title: '동아리 행사 사진 정리 웹 같이 만드실 분',
    author: 6,
    hoursAgo: 75,
    days: 10,
    parts: ['frontend', 'design'],
    headcount: 2,
    views: 29,
    contact: 'https://open.kakao.com/o/gT5nLp4d',
    body: '행사 때마다 사진이 단톡 · 드라이브에 흩어져서, 행사별로 모아 보고 내려받는 작은 웹을 만들려고 합니다.\n\nFE 한 분, 화면 잡아 주실 PD 한 분 찾아요. 2주 정도면 끝날 작은 규모예요.',
  },
  {
    category: '기타',
    title: '중앙도서관 모각코 같이 하실 분 (평일 저녁)',
    author: 9,
    hoursAgo: 100,
    days: 30,
    parts: [],
    headcount: null,
    views: 45,
    body: '평일 19시 ~ 22시에 중앙도서관 3층에서 각자 할 거 하는 모각코입니다.\n\n시작할 때 오늘 할 일 한 줄, 끝날 때 한 일 한 줄만 공유해요. 오고 싶은 날만 오셔도 됩니다.',
  },
  {
    category: '스터디',
    title: 'React 공식 문서 같이 읽기',
    author: 10,
    hoursAgo: 130,
    days: 7,
    parts: ['frontend'],
    headcount: 4,
    views: 72,
    contact: 'https://open.kakao.com/o/gH3cVz8k',
    closed: true,
    edited: true,
    body: 'react.dev 문서를 처음부터 같이 읽는 스터디예요. 한 주에 한 장씩 읽고 예제 하나씩 직접 만들어 봅니다.\n\n(추가) 인원이 다 차서 마감했습니다. 관심 가져 주셔서 감사해요!',
  },
  {
    category: '공모전',
    title: '해커톤 팀 빌딩: 기획 맡아 주실 분 찾아요',
    author: 4,
    hoursAgo: 160,
    days: 9,
    parts: ['design'],
    headcount: 1,
    views: 95,
    contact: 'https://open.kakao.com/o/gM9eYr1u',
    body: '겨울 연합 해커톤에 나갈 팀입니다. 개발 3명은 있고, 아이디어 정리 · 발표를 맡아 주실 분을 찾아요.\n\n해커톤 처음이어도 괜찮습니다. 같이 준비하면서 맞춰 가요.',
  },
  {
    category: '스터디',
    title: '머신러닝 기초 수학 스터디 (선형대수 · 확률)',
    author: 3,
    hoursAgo: 190,
    days: 5,
    parts: ['ai'],
    headcount: 5,
    views: 51,
    body: 'AI/ML 파트 세션 들으면서 수식에서 막히는 분들 같이 기초부터 보려고 해요.\n\n- 1 ~ 3주: 선형대수 (벡터 · 행렬 · 고윳값)\n- 4 ~ 6주: 확률 · 통계 기초\n\n금요일 18시, 원흥관 스터디룸.',
  },
  {
    category: '프로젝트',
    title: '학식 메뉴 알림 디스코드 봇 만들어요',
    author: 11,
    hoursAgo: 230,
    days: 20,
    parts: ['backend', 'ai'],
    headcount: 2,
    views: 38,
    contact: 'https://discord.gg/Zk4pR7mW',
    body: '매일 아침 학식 메뉴를 디스코드에 올려 주는 봇을 만들고, 메뉴 사진으로 칼로리 대충 알려 주는 기능까지 붙여 보려 합니다.\n\nBE 한 분, 이미지 모델 써 보고 싶은 AI 한 분 환영해요.',
  },
  {
    category: '소모임',
    title: '주말 북한산 등산 + 회고 쓰는 모임',
    author: 12,
    hoursAgo: 260,
    days: 5,
    parts: [],
    headcount: null,
    views: 27,
    body: '한 달에 한 번 토요일 오전에 가볍게 등산하고, 내려와서 한 달 회고를 같이 써요. 코스는 초보 기준입니다.',
  },
  {
    category: '스터디',
    title: 'CS 면접 질문 스터디 (운영체제 · 네트워크)',
    author: 2,
    hoursAgo: 310,
    days: 10,
    parts: ['backend', 'frontend'],
    headcount: 4,
    views: 66,
    body: '매주 주제 하나씩 정해서 면접 질문 10개를 돌아가며 답해 보는 스터디입니다. 답변은 노션에 정리해서 같이 봐요.',
  },
  {
    category: '공모전',
    title: '데이터 분석 공모전 팀원 모집 (Python)',
    author: 13,
    hoursAgo: 350,
    days: 7,
    parts: ['ai'],
    headcount: 2,
    views: 47,
    contact: 'https://forms.gle/2sJqXnV8bTzKe5Gf9',
    body: '판다스로 데이터 정리 · 시각화 해 보신 분이면 충분합니다. 분석 주제는 같이 정해요.',
  },
  {
    category: '기타',
    title: '포트폴리오 서로 봐 줄 사람 구해요',
    author: 7,
    hoursAgo: 390,
    days: 10,
    parts: [],
    headcount: null,
    views: 33,
    body: '방학 전에 포트폴리오 한 번씩 정리하려고요. 서로 30분씩 봐 주고 피드백 주고받을 분 찾습니다.',
  },
  {
    category: '프로젝트',
    title: '오픈소스 첫 기여 같이 해 봐요',
    author: 14,
    hoursAgo: 430,
    days: 30,
    parts: [],
    headcount: 3,
    views: 58,
    contact: 'https://discord.gg/b6YhN2tQ',
    body: 'good first issue 붙은 이슈 골라서 PR 하나씩 올려 보는 게 목표예요. 저장소 고르기부터 같이 합니다.',
  },
  {
    category: '스터디',
    title: 'Figma 컴포넌트 · 오토레이아웃 스터디',
    author: 6,
    hoursAgo: 480,
    days: 7,
    parts: ['design'],
    headcount: 4,
    views: 31,
    body: 'PD 파트 분들 위주로, 개발자도 환영합니다. 매주 화면 하나를 컴포넌트로 쪼개 보는 실습을 해요.',
  },
  {
    category: '스터디',
    title: 'Docker · 배포 실습 스터디',
    author: 5,
    hoursAgo: 530,
    days: 7,
    parts: ['backend'],
    headcount: 3,
    views: 44,
    body: '자기 프로젝트 하나를 컨테이너로 만들어서 클라우드에 올려 보는 데까지 같이 갑니다.',
  },
  {
    category: '소모임',
    title: '영어로 기술 이야기하는 모임',
    author: 7,
    hoursAgo: 580,
    days: 10,
    parts: [],
    headcount: 6,
    views: 22,
    body: '격주 목요일 저녁, 기술 영상 하나 보고 영어로 15분씩 이야기해요. 실력 상관없어요.',
  },
  {
    category: '공모전',
    title: '앱 공모전 FE 한 분 구해요 (React Native)',
    author: 1,
    hoursAgo: 650,
    days: 5,
    parts: ['frontend'],
    headcount: 1,
    views: 39,
    body: '디자인 · 백엔드는 준비돼 있고 화면 구현해 주실 한 분 찾아요.',
  },
  {
    category: '프로젝트',
    title: '시간표 겹치는 친구 찾기 웹',
    author: 9,
    hoursAgo: 720,
    days: 10,
    parts: ['frontend', 'backend', 'design'],
    headcount: 3,
    views: 54,
    body: '시간표를 올리면 공강이 겹치는 친구를 보여 주는 웹이에요. 2주 해커톤처럼 빠르게 만들어 봐요.',
  },
  {
    category: '스터디',
    title: '알고리즘 기초반 (파이썬, 입문 환영)',
    author: 4,
    hoursAgo: 790,
    days: 14,
    parts: [],
    headcount: 6,
    views: 49,
    body: '자료구조부터 차근차근 가는 입문반입니다. 매주 개념 하나 + 쉬운 문제 5개.',
  },
  {
    category: '기타',
    title: '시험기간 스터디룸 같이 예약하실 분',
    author: 12,
    hoursAgo: 860,
    days: 3,
    parts: [],
    headcount: null,
    views: 18,
    body: '중간고사 기간에 스터디룸 같이 잡고 각자 공부해요. 자리 맡는 거 돌아가면서 하면 편할 것 같아요.',
  },
]

const COMMENTS: Array<[post: number, author: number, minutesAfter: number, content: string]> = [
  [0, 2, 40, 'FE로 참여하고 싶어요! React Native는 처음인데 괜찮을까요?'],
  [0, 1, 70, '네 괜찮아요! 첫 주에 같이 세팅부터 할 거라 처음이셔도 됩니다. 오픈채팅으로 연락 주세요.'],
  [0, 6, 120, 'BE 자리 아직 남았나요? 스프링 프로젝트 한 번 해 봤습니다.'],
  [1, 5, 60, '화요일 세션 끝나고 바로 하는 거죠? 장소도 같은가요?'],
  [1, 2, 95, '네, 세션하는 강의실에서 그대로 해요.'],
  [2, 7, 200, '디자인으로 지원해도 될까요? 공모전은 처음이에요.'],
  [2, 3, 260, '물론이죠! 댓글 남겨 주셔서 감사해요. 오늘 저녁에 연락드릴게요.'],
  [4, 1, 30, '입문자도 따라갈 수 있을까요?'],
  [4, 5, 75, '네, 첫 2주는 자바 · 스프링 기본부터 해요.'],
  [8, 2, 300, '기획 경험은 적지만 발표는 자신 있어요. 관심 있습니다!'],
  [9, 4, 90, '확률 파트만 들어도 되나요?'],
  [12, 1, 45, '네트워크 주차 기다리고 있었어요. 참여하고 싶습니다.'],
  [3, 9, 30, '점심 몇 시쯤 모이나요?'],
  [3, 8, 55, '12시 10분에 학생회관 앞에서 모여요! 편하게 오세요.'],
  [5, 12, 120, '행사 사진 매번 단톡방에서 찾느라 힘들었는데 좋네요. FE로 참여 가능할까요?'],
  [5, 6, 180, '네! 오픈채팅으로 연락 주세요.'],
  [7, 6, 50, '공식 문서 처음부터 같이 읽는 거죠? 저도 참여하고 싶어요.'],
  [7, 10, 80, '네 맞아요. 본문에 오픈채팅 링크 달아 둘게요.'],
  [7, 13, 1500, '다음에 또 열리면 꼭 알려 주세요!'],
  [10, 8, 200, '학식 메뉴는 어디서 받아 오나요?'],
  [10, 11, 260, '생협 홈페이지에서 가져오는 걸로 시작해 보려고요. 같이 고민해요!'],
  [13, 4, 180, '판다스 정도 다룰 줄 아는데 참여해도 될까요?'],
  [15, 2, 60, '첫 기여할 이슈를 같이 골라 주시는 거 너무 좋아요.'],
]

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * 조회수: 글마다 관심도(r.views)가 다르고, 오래된 글일수록 쌓인다.
 * 첫 나흘 동안 빠르게 오르고 그 뒤로는 천천히 (한 달이면 관심도의 두 배쯤).
 */
const viewsFor = (r: Row) => Math.round(r.views * Math.min(1, 0.25 + r.hoursAgo / 96) * (1 + Math.min(r.hoursAgo, 720) / 720))

export function createSampleSeed(today: Ymd, now: number): { posts: SeedPost[]; comments: SeedComment[] } {
  const ymd = (offset: number): Ymd => {
    const d = new Date(dayValue(today) + offset * 86_400_000)
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  }
  const acc = (n: number) => SAMPLE_ACCOUNTS[n - 1].studentId

  /** 한국 날짜 (UTC+9) */
  const kstYmd = (ms: number): Ymd => {
    const d = new Date(ms + 9 * 3_600_000)
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  }
  const posts = ROWS.map((r, i): SeedPost => {
    const created = now - r.hoursAgo * 3_600_000
    const start = kstYmd(created)
    return {
      id: `post-${pad(ROWS.length - i)}`,
      category: r.category,
      title: r.title,
      content: r.body,
      authorId: acc(r.author),
      createdAt: new Date(created).toISOString(),
      editedAt: r.edited ? new Date(created + 20 * 3_600_000).toISOString() : null,
      views: viewsFor(r),
      startDate: start,
      endDate: ymd(Math.round((dayValue(start) - dayValue(today)) / 86_400_000) + r.days),
      closedByAuthor: Boolean(r.closed),
      parts: r.parts,
      headcount: r.headcount,
      contactUrl: r.contact ?? null,
      attachments: r.file ? [{ id: `file-${pad(i)}`, name: r.file.name, type: 'application/pdf', size: r.file.size, url: `${import.meta.env.BASE_URL}${r.file.path}` }] : [],
      deleted: false,
    }
  })

  const comments = COMMENTS.map(([p, author, after, content], i): SeedComment => ({
    id: `comment-${pad(i + 1)}`,
    postId: posts[p].id,
    authorId: acc(author),
    content,
    createdAt: new Date(Math.min(now - 60_000, Date.parse(posts[p].createdAt) + after * 60_000)).toISOString(),
  }))

  return { posts, comments }
}
