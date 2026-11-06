import { describe, expect, it } from 'vitest'
import { CLOSING } from '@/content/story'
import type { RecruitStatus } from '@/content/recruitingStatus'
import type { Project } from '@/domain/types'
import { closingStatusLine, fill, isAfter, isShowableVoice, pickFaqs, pickProjects, statusWords } from './homeData'

const pj = (id: string, extra: Partial<Project> = {}): Project => ({ id, name: id, program: 'Solution Challenge 2026', year: 2026, generation: 3, status: 'done', repo: `https://github.com/GDSC-DGU/${id}`, ...extra })

const st = (extra: Partial<RecruitStatus>): RecruitStatus => ({ state: 'unscheduled', generation: 5, channelUrl: 'https://www.instagram.com/gdg.donggukuniv/', lastWindow: '2026.08~09', lastGeneration: 4, ...extra })

describe('첫 화면 시제 · 문구', () => {
  it('데모데이 당일까지는 아직, 다음 날부터 지난 일', () => {
    expect(isAfter('2026-12-29', '2026-12-29')).toBe(false)
    expect(isAfter('2026-12-30', '2026-12-29')).toBe(true)
    expect(isAfter('2026-10-18', '2026-12-29')).toBe(false)
  })

  it('{key} 를 값으로 바꾸고 모르는 key 는 그대로 둔다', () => {
    expect(fill('지금까지 {n}개 · {x}', { n: 23 })).toBe('지금까지 23개 · {x}')
  })
})

describe('모집 상태 (recruitStatus 결과로)', () => {
  it('미정: 지금 상태 · 지난 시기 · 먼저 알릴 채널', () => {
    expect(statusWords(st({}))).toEqual({ state: '아직 열리지 않음', more: ['지난 4기는 2026.08~09에 모집', '열리면 인스타그램에 먼저'] })
    expect(statusWords(st({ lastWindow: undefined })).more).toEqual(['열리면 인스타그램에 먼저'])
  })

  it('곧 · 모집 중 · 마감', () => {
    expect(statusWords(st({ state: 'soon', opensAt: '2027-03-02', deadline: '2027-03-09' }))).toEqual({ state: '03.02 열림', more: ['03.09 마감', '인스타그램에 먼저 안내'] })
    expect(statusWords(st({ state: 'open', deadline: '2027-03-09' }))).toEqual({ state: '지금 받고 있음', more: ['03.09 마감'] })
    expect(statusWords(st({ state: 'open' })).more).toEqual([])
    expect(statusWords(st({ state: 'ended' })).state).toBe('마감')
  })

  it('마무리 한 문장은 상태마다 ~습니다.', () => {
    const handle = '@gdg.donggukuniv'
    const lines = [
      closingStatusLine(st({}), CLOSING.status, handle),
      closingStatusLine(st({ state: 'soon', opensAt: '2027-03-02' }), CLOSING.status, handle),
      closingStatusLine(st({ state: 'open' }), CLOSING.status, handle),
      closingStatusLine(st({ state: 'open', deadline: '2027-03-09' }), CLOSING.status, handle),
      closingStatusLine(st({ state: 'ended' }), CLOSING.status, handle),
    ]
    expect(lines[0]).toBe('5기 모집 일정은 아직 정해지지 않았습니다. 정해지면 인스타그램 @gdg.donggukuniv에 가장 먼저 올립니다.')
    expect(lines[1]).toContain('03.02에 열립니다')
    expect(lines[3]).toBe('5기 모집을 03.09까지 받습니다.')
    for (const l of lines) {
      expect(l).toMatch(/니다\.$/)
      expect(l).not.toMatch(/\{\w+\}/)
    }
  })
})

describe('프로젝트 · 자주 묻는 질문 · 사람 고르기', () => {
  const cover = (kind: 'screen' | 'logo' | 'promo') => ({ src: 'x.webp', alt: 'x', kind, width: 1, height: 1, source: 'https://github.com/GDSC-DGU/x', teamCleared: false })
  const list = [
    pj('a', { cover: cover('logo'), summary: 'a' }),
    pj('b', { cover: cover('screen'), summary: 'b' }),
    pj('c', { summary: 'c' }),
    pj('d', { cover: cover('promo'), summary: 'd', year: 2025, generation: 2 }),
    pj('wip', { status: 'in-progress' }),
  ]

  it('고른 순서대로, 없는 id 는 건너뛰고, 모자라면 그림 있는 것부터 채운다', () => {
    expect(pickProjects(list, ['c', 'zzz', 'wip'], 3).map((p) => p.id)).toEqual(['c', 'b', 'd'])
    expect(pickProjects(list, [], 10).map((p) => p.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  it('자주 묻는 질문은 출처 있는 것만, 고른 순서대로 채운다', () => {
    const faqs = [
      { id: 'a', source: 'x' },
      { id: 'b' },
      { id: 'c', source: 'y' },
      { id: 'd', source: 'z' },
    ]
    expect(pickFaqs(faqs, ['c', 'b', 'missing'], 3).map((f) => f.id)).toEqual(['c', 'a', 'd'])
  })

  it('사람: 동의 기록이 있고 말이 비어 있지 않은 것만 싣는다', () => {
    const v = { id: 'x', quote: '화요일마다 다른 풀이를 봤습니다.', name: '김○○', part: 'Backend', generation: 4, consent: { date: '2026-11-03', by: '4기 Organizer' } }
    expect(isShowableVoice(v)).toBe(true)
    expect(isShowableVoice({ ...v, quote: '  ' })).toBe(false)
    expect(isShowableVoice({ ...v, consent: { date: '', by: '' } })).toBe(false)
    expect(isShowableVoice({ ...v, consent: null })).toBe(false)
  })
})
