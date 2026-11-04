import { describe, expect, it } from 'vitest'
import { SEMINARS } from '@/content'
import type { Seminar } from '@/domain/types'
import { PREVIEW_COUNT, matchesSeminar, parseSeminarGen, periodLabel, seminarGenerations, seminarGroups, speakerCount, visibleCount } from './seminars'

const s = (id: string, date: string, generation: number, title: string, speaker = '발표자'): Seminar => ({ id, date, generation, title, speaker, format: 'pdf', fileUrl: null })
const LIST = [s('a', '2024-01-05', 1, '나를 알려줘, SSE', '강산아'), s('b', '2025-04-03', 2, 'TypeScript, 개발 속도를 높이는 타입의 힘', '이지희'), s('c', '2025-04-03', 2, '리액트컴포넌트패턴', '김태욱'), s('d', '2026-04-10', 3, 'CLAUDE 너 내 동료가 돼라', '공기훈')]

describe('아카이브 세미나', () => {
  it('최근 기수 먼저, 기수 안은 최근 발표 먼저 (같은 날은 제목 순)', () => {
    const groups = seminarGroups(LIST)
    expect(groups.map((g) => g.generation)).toEqual([3, 2, 1])
    expect(groups[1].items.map((x) => x.id)).toEqual(['c', 'b'])
    expect(groups[1]).toMatchObject({ from: '2025-04-03', to: '2025-04-03', total: 2 })
  })

  it('찾기: 제목 · 발표자, 띄어쓰기 · 대소문자 무시. 맞는 게 없는 기수는 뺀다', () => {
    expect(matchesSeminar(LIST[1], 'type script')).toBe(true)
    expect(matchesSeminar(LIST[0], '강산')).toBe(true)
    expect(seminarGroups(LIST, { q: 'claude' }).map((g) => g.generation)).toEqual([3])
    expect(seminarGroups(LIST, { gen: 2 }).map((g) => g.generation)).toEqual([2])
    expect(seminarGroups(LIST, { q: '없는말zz' })).toEqual([])
  })

  it('접을 때만 기수마다 처음 몇 개, 기간 표기, 주소의 기수', () => {
    const big = seminarGroups(SEMINARS)
    expect(visibleCount(big[0], true)).toBe(PREVIEW_COUNT)
    expect(visibleCount(big[0], false)).toBe(big[0].items.length)
    expect(periodLabel('2025-10-10', '2026-05-22')).toBe('2025.10 – 2026.05')
    expect(periodLabel('2025-04-03', '2025-04-03')).toBe('2025.04')
    expect(parseSeminarGen('2', [3, 2, 1])).toBe(2)
    expect(parseSeminarGen('9', [3, 2, 1])).toBeUndefined()
    expect(parseSeminarGen(null, [3, 2, 1])).toBeUndefined()
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
