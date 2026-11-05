import type { SearchService } from '@/data/repositories'
import type { ArchiveDoc, SearchHit } from '@/domain/types'

/** 검색어에서 빼는 말 (뜻이 없어서 결과를 흐리는 말) */
const STOP_WORDS = new Set(['작년', '관련', '좀', '거', '것', '보여줘', '찾아줘', '자료'])

export function tokenize(query: string): string[] {
  return query
    .normalize('NFC')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t))
}

/** 제목에 들어 있으면 2점, 보조 정보·키워드에만 있으면 1점 */
export function scoreDoc(doc: ArchiveDoc, tokens: string[]): number {
  // 한글이 풀어 쓴 꼴(NFD)로 들어와도 맞게 (맥에서 복사한 제목 등: QA 2026-11-05)
  const title = doc.title.normalize('NFC').toLowerCase()
  const rest = `${doc.meta} ${doc.keywords}`.normalize('NFC').toLowerCase()
  return tokens.reduce((sum, t) => sum + (title.includes(t) ? 2 : rest.includes(t) ? 1 : 0), 0)
}

export function rankDocs(docs: readonly ArchiveDoc[], query: string): SearchHit[] {
  const tokens = tokenize(query)
  if (tokens.length === 0) return []
  return docs
    .map((doc) => ({ doc, score: scoreDoc(doc, tokens) }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
}

/**
 * 서버 없이 쓰는 검색: 단어가 겹치는지만 본다.
 * 실제 서비스에서는 http 구현의 search(서버 /api/search → Gemini API)가 이 자리를 대신한다.
 */
export function createKeywordSearch(docs: readonly ArchiveDoc[]): SearchService {
  return {
    search: async (query) => rankDocs(docs, query),
  }
}
