import { describe, expect, it } from 'vitest'
import { SEMINARS } from '@/content'
import type { Seminar } from '@/domain/types'
import { latestByGeneration, matchesByGeneration, matchesSeminar, parseSeminarGen, periodLabel, seminarFileState, seminarGenerations, seminarGroup, seminarHref, seminarTabs, speakerCount } from './seminars'

const s = (id: string, date: string, generation: number, title: string, speaker = '발표자', extra: Partial<Seminar> = {}): Seminar => ({ id, date, generation, title, speaker, format: 'pdf', fileUrl: null, ...extra })
const LIST = [s('a', '2024-01-05', 1, '나를 알려줘, SSE', '강산아'), s('b', '2025-04-03', 2, 'TypeScript, 개발 속도를 높이는 타입의 힘', '이지희'), s('c', '2025-04-03', 2, '리액트컴포넌트패턴', '김태욱'), s('d', '2026-04-10', 3, 'CLAUDE 너 내 동료가 돼라', '공기훈')]

describe('아카이브 세미나', () => {
  it('기수 탭: 최근 기수 먼저, 전체 탭은 없다', () => {
    expect(seminarTabs(LIST)).toEqual([
      { key: '3', label: '3기', gen: 3, count: 1 },
      { key: '2', label: '2기', gen: 2, count: 2 },
      { key: '1', label: '1기', gen: 1, count: 1 },
    ])
  })

  it('한 기수: 최근 발표 먼저 (같은 날은 제목 순), 접지 않고 전부', () => {
    const g = seminarGroup(LIST, 2)!
    expect(g.items.map((x) => x.id)).toEqual(['c', 'b'])
    expect(g).toMatchObject({ from: '2025-04-03', to: '2025-04-03', total: 2 })
    expect(seminarGroup(LIST, 9)).toBeNull()
  })

  it('찾기: 제목 · 발표자, 띄어쓰기 · 대소문자 무시. 고른 기수 밖에서 맞는 개수', () => {
    expect(matchesSeminar(LIST[1], 'type script')).toBe(true)
    expect(matchesSeminar(LIST[0], '강산')).toBe(true)
    expect(seminarGroup(LIST, 3, 'claude')!.items.map((x) => x.id)).toEqual(['d'])
    expect(seminarGroup(LIST, 2, 'claude')!.items).toEqual([])
    expect(matchesByGeneration(LIST, 'claude')).toEqual([{ gen: 3, count: 1 }])
    expect(matchesByGeneration(LIST, '없는말zz')).toEqual([])
  })

  it('주소의 기수: 없거나 이상하면 가장 최근 기수', () => {
    expect(parseSeminarGen('2', [3, 2, 1])).toBe(2)
    expect(parseSeminarGen('9', [3, 2, 1])).toBe(3)
    expect(parseSeminarGen(null, [3, 2, 1])).toBe(3)
    expect(parseSeminarGen(null, [])).toBeUndefined()
  })

  it('자료 상태: 주소가 있으면 열기, 파일만 있으면 준비 중, 자료가 없던 발표는 비움', () => {
    expect(seminarFileState({ format: 'pdf', fileUrl: 'https://files.example/a.pdf' })).toBe('ready')
    expect(seminarFileState({ format: 'pptx', fileUrl: null })).toBe('pending')
    expect(seminarFileState({ format: null, fileUrl: null })).toBe('none')
  })

  it('홈 멤버 세미나: 기수마다 최근 발표 n개, 누르면 아카이브에서 그 발표를 찾은 화면', () => {
    expect(latestByGeneration(LIST, 1).map((g) => [g.gen, g.items.map((x) => x.id)])).toEqual([
      [3, ['d']],
      [2, ['c']],
      [1, ['a']],
    ])
    expect(latestByGeneration(SEMINARS).every((g) => g.items.length === 3)).toBe(true)
    const href = seminarHref(LIST[1])
    expect(href.startsWith('/archive?')).toBe(true)
    const p = new URLSearchParams(href.slice('/archive?'.length).split('#')[0])
    expect([p.get('view'), p.get('gen'), p.get('q')]).toEqual(['seminars', '2', LIST[1].title])
    expect(href.endsWith('#archive-views')).toBe(true)
  })

  it('기간 표기 · 발표자 수', () => {
    expect(periodLabel('2025-10-10', '2026-05-22')).toBe('2025.10–2026.05')
    expect(periodLabel('2025-04-03', '2025-04-03')).toBe('2025.04')
    expect(seminarGenerations(LIST)).toEqual([3, 2, 1])
    expect(speakerCount([...LIST, s('e', '2026-01-01', 3, '또', '공기훈')])).toBe(4)
  })

  it('실제 자료: 1–3기 104개, 제목 · 발표자가 비지 않고 주소는 아직 비어 있다', () => {
    expect(SEMINARS).toHaveLength(104)
    expect(seminarGenerations(SEMINARS)).toEqual([3, 2, 1])
    expect(SEMINARS.every((x) => x.title.trim() && x.speaker.trim())).toBe(true)
    expect(SEMINARS.every((x) => x.fileUrl === null || x.fileUrl.startsWith('https://'))).toBe(true)
  })
})
