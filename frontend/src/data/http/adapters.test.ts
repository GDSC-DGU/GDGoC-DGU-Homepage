import { describe, expect, it, vi } from 'vitest'
import { adaptList, toScheduleEvent, toYmd, unwrapList } from './adapters'
import { createHttpRepositories, HttpError } from './httpRepositories'

describe('adapters', () => {
  it('Spring Page({ content }) 와 { data } 를 배열로 벗긴다', () => {
    expect(unwrapList({ content: [1, 2] })).toEqual([1, 2])
    expect(unwrapList({ data: [3] })).toEqual([3])
    expect(unwrapList([4])).toEqual([4])
    expect(unwrapList({ nope: 1 })).toEqual([])
  })

  it('여러 날짜 모양을 YYYY-MM-DD 로 맞춘다', () => {
    expect(toYmd('2026-10-27T18:00:00')).toBe('2026-10-27')
    expect(toYmd('2026.1.5')).toBe('2026-01-05')
    expect(toYmd('내일')).toBeUndefined()
  })

  it('대문자 enum 을 읽고, 모르는 종류는 버린다', () => {
    const list = adaptList(
      [
        { id: 7, date: '2026-10-27', title: '중간 발표', kind: 'SPRINT', place: 'PROJECTS' },
        { id: 8, date: '2026-10-28', title: '?', kind: 'PARTY', place: 'projects' },
        { date: '2026-11-02', title: '동홍동락', type: 'event' },
      ],
      toScheduleEvent,
    )
    expect(list).toEqual([
      { id: '7', date: '2026-10-27', title: '중간 발표', kind: 'sprint', place: 'projects' },
      { id: '2026-11-02-동홍동락', date: '2026-11-02', title: '동홍동락', kind: 'event', place: 'community' },
    ])
  })
})

describe('createHttpRepositories (가짜 fetch 로 계약 확인)', () => {
  const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))

  it('주소를 맞게 부르고 응답을 화면 모양으로 바꾼다', async () => {
    const fetcher = vi.fn(() => ok({ content: [{ id: 'a', date: '2026-12-29T00:00:00', title: 'Demo Day', kind: 'Sprint', place: 'projects' }] }))
    const repos = createHttpRepositories('/api', fetcher)
    await expect(repos.schedule.list()).resolves.toEqual([{ id: 'a', date: '2026-12-29', title: 'Demo Day', kind: 'sprint', place: 'projects' }])
    expect(fetcher).toHaveBeenCalledWith('/api/schedules', expect.anything())
  })

  it('실패하면 HttpError 를 던진다 (화면은 오류 문구를 보여준다)', async () => {
    const repos = createHttpRepositories('/api', () => Promise.resolve(new Response('', { status: 503 })))
    await expect(repos.reviews.list()).rejects.toBeInstanceOf(HttpError)
  })

  it('검색어가 너무 짧으면 서버를 부르지 않는다', async () => {
    const fetcher = vi.fn(() => ok([]))
    const repos = createHttpRepositories('/api', fetcher)
    await expect(repos.search.search('a')).resolves.toEqual([])
    expect(fetcher).not.toHaveBeenCalled()
  })
})
