/**
 * 관리자 쿼리 key (TanStack Query). 모두 'admin' 으로 시작한다:
 * 예시 데이터가 바뀌면(저장 · 삭제 · '처음으로') AdminDataProvider 가 ['admin'] 아래를 한꺼번에 다시 부른다.
 * 그래서 mutation 뒤에 따로 invalidate 하지 않아도 목록이 새로 그려진다 (http 로 바꾸면 onSuccess 에서 invalidate).
 *
 *   useQuery({ queryKey: adminKeys.section('boards', 'posts', board, query), queryFn: () => repos.boards.listPosts(board, query) })
 */
export const adminKeys = {
  all: ['admin'] as const,
  section: (section: 'dashboard' | 'boards' | 'projects' | 'contents' | 'users' | 'recruit', ...parts: unknown[]) => ['admin', section, ...parts] as const,
}

/** 로그인한 관리자 (API-ACM-003). 'admin' 아래가 아니다: 데이터가 바뀔 때마다 다시 부르지 않게 */
export const adminMeKey = ['admin-auth', 'me'] as const
