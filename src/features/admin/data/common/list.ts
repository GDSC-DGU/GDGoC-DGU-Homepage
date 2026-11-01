import type { Page, PageQuery } from './types'

/**
 * 목록 계산 (예시 저장소가 서버 대신 하는 일): 검색 · 페이지 나누기.
 * http 구현에서는 서버가 하므로 쓰지 않는다.
 */

export const DEFAULT_PAGE_SIZE = 10

/** 검색어가 한 칸이라도 들어 있으면 true. 대소문자 · 앞뒤 공백 무시, 빈 검색어는 모두 맞음 */
export function matchesQuery(q: string | undefined, fields: readonly (string | null | undefined)[]): boolean {
  const needle = (q ?? '').trim().toLowerCase()
  if (!needle) return true
  return fields.some((f) => typeof f === 'string' && f.toLowerCase().includes(needle))
}

/** 페이지 나누기. 범위를 벗어난 page 는 마지막 쪽으로 맞춘다 (삭제 뒤 빈 쪽이 남지 않게) */
export function paginate<T>(items: readonly T[], query: PageQuery = {}): Page<T> {
  const pageSize = Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Math.min(Math.max(1, Math.floor(query.page ?? 1)), totalPages)
  const start = (page - 1) * pageSize
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize, totalPages }
}

/** 최신순 (ISO 시각 문자열 내림차순) */
export const byNewest = <T>(pick: (x: T) => string) => (a: T, b: T) => pick(b).localeCompare(pick(a))

/** 겹치지 않는 id. crypto.randomUUID 는 보안 주소(https · localhost)에서만 있어서 쓰지 않는다 */
export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
