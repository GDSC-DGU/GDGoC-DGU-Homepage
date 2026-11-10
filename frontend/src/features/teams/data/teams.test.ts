import { describe, expect, it } from 'vitest'
import { TeamsError } from './repository'
import { closingSoon, contactAction, contactLabel, deadlineLabel, fileError, listSearch, pageWindow, parseListParams, periodLabel, sizeLabel, statusOf, timeAgo, validatePost, contactUrlError } from './rules'
import { createSampleTeamsRepository } from './sampleRepository'
import { DEMO_ACCOUNT, SAMPLE_ACCOUNTS } from './sampleSeed'
import type { PostInput } from './types'

const NOW = Date.parse('2026-11-03T03:00:00Z') // 한국 12:00
const repo = (now = () => NOW) => createSampleTeamsRepository({ now, delay: 0 })
const DEMO = { ...DEMO_ACCOUNT }
const input = (extra: Partial<PostInput> = {}): PostInput => ({
  category: '스터디',
  title: '예시 테스트 글',
  startDate: '2026-11-03',
  endDate: '2026-11-20',
  parts: ['frontend'],
  headcount: 3,
  contactUrl: null,
  content: '예시 내용',
  attachmentIds: [],
  ...extra,
})
const codeOf = async (p: Promise<unknown>) => {
  try {
    await p
    return 'OK'
  } catch (e) {
    return e instanceof TeamsError ? e.code : 'OTHER'
  }
}

describe('팀원 찾기 규칙', () => {
  it('종료일 다음 날부터 마감, 작성자가 마감하면 바로 마감', () => {
    expect(statusOf('2026-11-03', false, '2026-11-03')).toBe('모집중')
    expect(statusOf('2026-11-02', false, '2026-11-03')).toBe('마감')
    expect(statusOf('2026-12-01', true, '2026-11-03')).toBe('마감')
  })

  it('필수 칸 · 기간 순서 · 링크 모양을 확인한다', () => {
    expect(validatePost(input())).toEqual({})
    const e = validatePost(input({ title: ' ', content: '', endDate: '2026-11-01', contactUrl: 'javascript:alert(1)' }))
    expect(Object.keys(e).sort()).toEqual(['contactUrl', 'content', 'startDate', 'title'])
    expect(contactUrlError('https://open.kakao.com/o/abc')).toBeNull()
    expect(contactUrlError('discord.gg/abc')).not.toBeNull()
  })

  it('첨부: PDF · JPG · PNG, 10MB 까지', () => {
    expect(fileError({ name: 'a.pdf', type: 'application/pdf', size: 1000 })).toBeNull()
    expect(fileError({ name: 'a.hwp', type: '', size: 1000 })).not.toBeNull()
    expect(fileError({ name: 'a.png', type: 'image/png', size: 11 * 1024 * 1024 })).not.toBeNull()
    expect(sizeLabel(1_258_291)).toBe('1.2MB')
  })

  it('목록 주소 ↔ 거르기 (잘못된 값은 버린다)', () => {
    const q = parseListParams(new URLSearchParams('cat=스터디&status=모집중&part=frontend&q=리액트&sort=deadline&page=2'))
    expect(q).toEqual({ category: '스터디', status: '모집중', part: 'frontend', q: '리액트', sort: 'deadline', page: 2 })
    expect(parseListParams(new URLSearchParams(listSearch(q)))).toEqual(q)
    expect(parseListParams(new URLSearchParams('cat=없는분류&page=-3'))).toEqual({ page: 1 })
  })

  it('마감 표시 · 시각 · 연락 이름', () => {
    expect(deadlineLabel('2026-11-03', '모집중', '2026-11-03')).toBe('오늘 마감')
    expect(deadlineLabel('2026-11-08', '모집중', '2026-11-03')).toBe('D-5')
    expect(deadlineLabel('2026-11-08', '마감', '2026-11-03')).toBeNull()
    expect(closingSoon('2026-11-05', '모집중', '2026-11-03')).toBe(true)
    expect(closingSoon('2026-11-10', '모집중', '2026-11-03')).toBe(false)
    expect(timeAgo('2026-11-03T02:30:00Z', NOW)).toBe('30분 전')
    expect(timeAgo('2026-10-30T02:30:00Z', NOW)).toBe('10.30')
    expect(contactLabel('https://open.kakao.com/o/abc')).toBe('카카오톡 오픈채팅')
    expect(contactLabel('https://discord.gg/abc')).toBe('디스코드')
    expect(contactAction('https://open.kakao.com/o/abc')).toBe('카카오톡 오픈채팅으로 연락하기')
    expect(contactAction('https://discord.gg/abc')).toBe('디스코드로 연락하기')
    expect(contactAction('https://forms.gle/abc')).toBe('구글 폼으로 연락하기')
    expect(contactAction('https://example.com/x')).toBe('연락 링크 열기')
  })

  it('쪽 번호는 지금 쪽을 가운데 두고 다섯 개', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3])
    expect(pageWindow(5, 9)).toEqual([3, 4, 5, 6, 7])
    expect(pageWindow(9, 9)).toEqual([5, 6, 7, 8, 9])
  })

  it('모집 기간 표시: 같은 해면 뒤 날짜에서 해를 뺀다', () => {
    expect(periodLabel('2026-10-14', '2026-10-31')).toBe('2026.10.14~10.31')
    expect(periodLabel('2026-12-20', '2027-01-10')).toBe('2026.12.20~2027.01.10')
  })
})

describe('예시 저장소', () => {
  it('프로토타입 데이터: 계정은 예시 학번 꼴, 글은 세 쪽, 모집중 · 마감이 섞인다', async () => {
    const r = repo()
    const all = await r.list({ page: 1 })
    expect(all.total).toBeGreaterThan(20)
    for (const a of SAMPLE_ACCOUNTS) expect(a.studentId).toMatch(/^20\d{2}000\d{3}$/)
    const open = await r.list({ page: 1, status: '모집중' })
    expect(open.total).toBeGreaterThan(0)
    expect(open.total).toBeLessThan(all.total)
  })

  it('정렬: 마감 임박순은 모집 중인 글을 종료일 가까운 순으로 먼저, 조회순은 조회수 순', async () => {
    const r = repo()
    const d = await r.list({ page: 1, sort: 'deadline' })
    const open = d.items.filter((p) => p.status === '모집중')
    expect(d.items.slice(0, open.length).every((p) => p.status === '모집중')).toBe(true)
    expect(open.map((p) => p.endDate)).toEqual([...open.map((p) => p.endDate)].sort())
    const v = await r.list({ page: 1, sort: 'views' })
    expect(v.items.map((p) => p.views)).toEqual([...v.items.map((p) => p.views)].sort((a, b) => b - a))
  })

  it('옆 칸: 마감 임박은 3일 안 모집 중 글, 많이 본 글 5개는 이번 주 조회순', async () => {
    const r = repo()
    const sum = await r.summary()
    expect(sum.closingSoon.length).toBeGreaterThan(0)
    expect(sum.closingSoon.length).toBeLessThanOrEqual(3)
    expect(sum.closingSoon.every((p) => p.status === '모집중' && closingSoon(p.endDate, p.status, '2026-11-03'))).toBe(true)
    const all = (await r.list({ page: 1 })).items
    expect(sum.newToday).toBe(all.filter((p) => Date.parse(p.createdAt) > NOW - 24 * 3_600_000).length)
    expect(sum.popular.map((p) => p.views)).toEqual([...sum.popular.map((p) => p.views)].sort((a, b) => b - a))
  })

  it('이전 · 다음 글', async () => {
    const r = repo()
    const newest = (await r.list({ page: 1 })).items[0]
    const adj = await r.adjacent(newest.id)
    expect(adj.next).toBeNull()
    expect(adj.prev).not.toBeNull()
  })

  it('한 쪽 10개, 최신순, 거르기를 함께 적용', async () => {
    const r = repo()
    const page1 = await r.list({ page: 1 })
    expect(page1.items).toHaveLength(10)
    expect(page1.items[0].createdAt >= page1.items[1].createdAt).toBe(true)
    const study = await r.list({ page: 1, category: '스터디', status: '모집중' })
    expect(study.items.every((p) => p.category === '스터디' && p.status === '모집중')).toBe(true)
    const fe = await r.list({ page: 1, part: 'frontend' })
    expect(fe.items.every((p) => p.parts.includes('frontend'))).toBe(true)
    expect((await r.list({ page: 1, q: '없는검색어zz' })).total).toBe(0)
  })

  it('글쓰기: 학번 · PIN 이 맞으면 이름 · 기수로 저장되고 맨 위에 온다', async () => {
    const r = repo()
    const all = await r.list({ page: 1 })
    const p = await r.create(input(), DEMO)
    expect(p.author).toEqual({ name: SAMPLE_ACCOUNTS[0].name, generation: 4 })
    expect((await r.list({ page: 1 })).items[0].id).toBe(p.id)
    expect(p.id).toBe(`post-${all.total + 1}`)
    expect(await codeOf(r.create(input({ title: '' }), DEMO))).toBe('INVALID')
  })

  it('PIN 을 5번 틀리면 15분 제한, 그 뒤 다시 5번 틀리면 잠김', async () => {
    let now = NOW
    const r = repo(() => now)
    const wrong = { studentId: DEMO.studentId, pin: '9999' }
    for (let i = 0; i < 4; i++) expect(await codeOf(r.create(input(), wrong))).toBe('AUTH_WRONG')
    expect(await codeOf(r.create(input(), wrong))).toBe('AUTH_LIMITED')
    expect(await codeOf(r.create(input(), DEMO))).toBe('AUTH_LIMITED')
    now += 16 * 60_000
    for (let i = 0; i < 4; i++) expect(await codeOf(r.create(input(), wrong))).toBe('AUTH_WRONG')
    expect(await codeOf(r.create(input(), wrong))).toBe('AUTH_LOCKED')
    expect(await codeOf(r.create(input(), DEMO))).toBe('AUTH_LOCKED')
  })

  it('PIN 을 설정하지 않은 계정은 메일 링크 안내', async () => {
    const r = repo()
    const unset = SAMPLE_ACCOUNTS.find((a) => a.pin === null)!
    expect(await codeOf(r.create(input(), { studentId: unset.studentId, pin: '0000' }))).toBe('PIN_NOT_SET')
  })

  it('수정 · 삭제는 작성자만. 마감은 바로, 지난 종료일로는 다시 모집중이 안 된다', async () => {
    const r = repo()
    const p = await r.create(input(), DEMO)
    const other = SAMPLE_ACCOUNTS.find((a) => a.pin && a.studentId !== DEMO.studentId)!
    expect(await codeOf(r.verifyAuthor(p.id, { studentId: other.studentId, pin: other.pin! }))).toBe('NOT_AUTHOR')
    expect(await codeOf(r.verifyAuthor(p.id, DEMO))).toBe('OK')
    const closed = await r.update(p.id, { ...input(), status: '마감' }, DEMO)
    expect(closed.status).toBe('마감')
    expect(closed.editedAt).not.toBeNull()
    expect(await codeOf(r.update(p.id, { ...input({ startDate: '2026-10-01', endDate: '2026-10-10' }), status: '모집중' }, DEMO))).toBe('INVALID')
    await r.remove(p.id, DEMO)
    expect(await codeOf(r.get(p.id))).toBe('DELETED')
    expect((await r.list({ page: 1 })).items.some((x) => x.id === p.id)).toBe(false)
  })

  it('댓글은 작성 순서, 조회수는 들어올 때마다 +1', async () => {
    const r = repo()
    const p = await r.create(input(), DEMO)
    await r.addComment(p.id, '첫 댓글', DEMO)
    await r.addComment(p.id, '두 번째', DEMO)
    expect((await r.comments(p.id)).map((c) => c.content)).toEqual(['첫 댓글', '두 번째'])
    expect(await r.countView(p.id)).toBe(1)
    expect(await r.countView(p.id)).toBe(2)
    expect((await r.get(p.id)).commentCount).toBe(2)
  })
})
