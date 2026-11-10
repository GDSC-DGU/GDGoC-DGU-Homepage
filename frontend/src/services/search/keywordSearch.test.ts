import { describe, expect, it } from 'vitest'
import type { ArchiveDoc } from '@/domain/types'
import { createKeywordSearch, rankDocs, tokenize } from './keywordSearch'

const docs: ArchiveDoc[] = [
  { id: 'a', place: 'community', title: '금융권 IT 현업자 세미나', meta: '2026.12.01 · 세션', keywords: 'spring 백엔드 금융' },
  { id: 'b', place: 'community', title: 'Camping Seminar 2회', meta: '2025.10.31 · 세션', keywords: '캠핑 세미나 세션' },
  { id: 'c', place: 'projects', title: 'G-Sprint 데모데이 · 성과공유회', meta: '2026.12.29', keywords: '해커톤 발표' },
]

describe('keywordSearch', () => {
  it('뜻 없는 말은 빼고 소문자로 나눈다', () => {
    expect(tokenize('작년 Spring 세미나 자료')).toEqual(['spring', '세미나'])
  })

  it('제목에 맞는 글을 먼저 보여준다', () => {
    const hits = rankDocs(docs, 'Spring 세미나')
    expect(hits.map((h) => h.doc.title)).toEqual(['금융권 IT 현업자 세미나', 'Camping Seminar 2회'])
    expect(hits[0].score).toBe(3)
  })

  it('맞는 게 없거나 검색어가 비면 빈 목록', () => {
    expect(rankDocs(docs, '')).toEqual([])
    expect(rankDocs(docs, '블록체인')).toEqual([])
  })

  it('SearchService 모양으로 감싼다', async () => {
    const svc = createKeywordSearch(docs)
    expect((await svc.search('해커톤'))[0].doc.place).toBe('projects')
  })
})
