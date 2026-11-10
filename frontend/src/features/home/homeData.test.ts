import { describe, expect, it } from 'vitest'
import type { Project, ProjectImage, ScheduleEvent } from '@/domain/types'
import { dayLabel, homeNextEvent, keyParts, nextEvent, projectCounts, projectMeta, shortDay, tileShots } from './homeData'

const ev = (id: string, date: string, kind: ScheduleEvent['kind'], extra: Partial<ScheduleEvent> = {}): ScheduleEvent => ({
  id,
  date,
  title: id,
  kind,
  place: 'community',
  ...extra,
})

const TODAY = '2026-10-17'
const PUBLIC = 'https://gdg.community.dev/events/details/x/'

describe('날짜 표기', () => {
  it("올해는 '10.27 화', 다른 해는 연도를 붙인다", () => {
    expect(dayLabel('2026-10-27', TODAY)).toBe('10.27 화')
    expect(dayLabel('2027-01-30', TODAY)).toBe('2027.01.30 토')
    expect(shortDay('2027-01-30', TODAY)).toBe('2027.01.30')
  })
})

describe('다음 일정', () => {
  const events = [
    ev('rest', '2026-10-20', 'rest'),
    ev('mid', '2026-10-27', 'sprint'),
    ev('past', '2026-10-13', 'sprint'),
    ev('dhdr', '2026-11-02', 'event', { title: '동홍동락 1차' }),
    ev('thon', '2027-01-30', 'event', { title: '동지톤', endDate: '2027-01-31' }),
  ]

  it('휴회와 지난 일정을 건너뛴다', () => {
    expect(nextEvent(events, TODAY)?.id).toBe('mid')
  })

  it('조건에 맞는 첫 일정을 고른다', () => {
    expect(nextEvent(events, TODAY, (e) => e.kind === 'event')?.id).toBe('dhdr')
  })

  it('여러 날 행사는 끝나는 날까지 다가오는 일정이다', () => {
    expect(nextEvent(events, '2027-01-31')?.id).toBe('thon')
  })

  it('일정이 없으면 null', () => {
    expect(nextEvent([], TODAY)).toBeNull()
  })
})

describe('홈 다음 일정 (공개됐거나 확정된 것만)', () => {
  const plan = '4기 운영 계획'
  const events = [
    ev('rest', '2026-10-20', 'rest', { source: plan }),
    ev('mid', '2026-10-27', 'sprint', { source: plan }),
    ev('dhdr', '2026-11-02', 'event', { source: plan }),
    ev('open', '2026-11-10', 'event', { source: PUBLIC, url: PUBLIC }),
  ]

  it('확정된 G-Sprint 날짜는 공개 페이지가 없어도 올린다', () => {
    expect(homeNextEvent(events, TODAY, ['2026-10-27'])?.id).toBe('mid')
  })

  it('운영 계획에만 있는 일정은 건너뛰고 공개된 일정으로', () => {
    expect(homeNextEvent(events, TODAY, [])?.id).toBe('open')
    expect(homeNextEvent(events, '2026-10-28', ['2026-10-27'])?.id).toBe('open')
  })

  it('날짜가 지난 계획은 확정 목록에 있어도 올리지 않는다', () => {
    const stale = [ev('old', '2026-10-01', 'sprint', { source: plan, endDate: '2026-10-02' })]
    expect(homeNextEvent(stale, TODAY, ['2026-10-01'])).toBeNull()
  })

  it('올릴 일정이 없으면 null (섹션을 숨긴다)', () => {
    expect(homeNextEvent([], TODAY, [])).toBeNull()
    expect(homeNextEvent([events[2]], TODAY, [])).toBeNull()
  })
})

describe('프로젝트', () => {
  it('프로그램 이름에 해가 있으면 해를 두 번 쓰지 않는다', () => {
    expect(projectMeta({ program: 'Solution Challenge 2024', year: 2024, generation: 2 })).toBe('Solution Challenge 2024, 2기')
    expect(projectMeta({ program: 'G-Sprint', year: 2026 } as Pick<Project, 'program' | 'year' | 'generation'>)).toBe('G-Sprint, 2026')
  })
})

describe('프로젝트 주장 제목의 숫자', () => {
  const p = (program: string, status: Project['status'] = 'done') => ({ program, status })

  it('완성된 것만 세고, 그중 Solution Challenge 에서 만든 수를 따로 센다', () => {
    const list = [p('Solution Challenge 2026'), p('Solution Challenge 2025 APAC'), p('챕터 웹사이트'), p('G-Sprint', 'in-progress'), p('동국대 봄 축제')]
    expect(projectCounts(list)).toEqual({ done: 4, solutionChallenge: 2 })
  })

  it('목록이 비어 있으면 0', () => {
    expect(projectCounts([])).toEqual({ done: 0, solutionChallenge: 0 })
  })
})

describe('큰 타일 그림 고르기', () => {
  const img = (src: string, kind: ProjectImage['kind'], caption?: string): ProjectImage => ({ src, alt: src, kind, caption, width: 1, height: 1, source: 'https://github.com/GDSC-DGU/x', teamCleared: false })

  it('실제 화면 + 같은 화면의 폰 화면을 겹친다', () => {
    const g = [img('d-home', 'screen', '홈 (데스크톱)'), img('m-onboard', 'mobile', '온보딩 (모바일)'), img('m-home', 'mobile', '홈 (모바일)')]
    expect(tileShots(g)).toEqual({ wide: g[0], phone: g[2] })
  })

  it('같은 화면이 없으면 첫 폰 화면', () => {
    const g = [img('d-search', 'screen', '검색 (데스크톱)'), img('m-a', 'mobile', '온보딩 (모바일)')]
    expect(tileShots(g).phone?.src).toBe('m-a')
  })

  it('소개 그림에는 폰 화면을 겹치지 않고, 로고 · 구조도는 큰 타일에 걸지 않는다', () => {
    expect(tileShots([img('promo', 'promo'), img('m', 'mobile')])).toEqual({ wide: img('promo', 'promo') })
    expect(tileShots([img('logo', 'logo'), img('arch', 'diagram')])).toEqual({ wide: undefined })
  })
})

describe('큰 숫자 조각', () => {
  it("숫자와 단위를 나눈다: '5팀 27명' → 5 · 팀 · 27 · 명", () => {
    expect(keyParts('5팀 27명')).toEqual([
      { text: '5', num: true },
      { text: '팀', num: false },
      { text: '27', num: true },
      { text: '명', num: false },
    ])
    expect(keyParts('18:00')).toEqual([{ text: '18:00', num: true }])
    expect(keyParts('4개 챕터')).toEqual([
      { text: '4', num: true },
      { text: '개 챕터', num: false },
    ])
    expect(keyParts('12.29 데모데이').map((x) => x.text)).toEqual(['12.29', '데모데이'])
  })
})
