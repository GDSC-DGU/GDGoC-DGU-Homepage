import { describe, expect, it } from 'vitest'
import { PAGE_PLANS } from '@/config/pages'
import { recruitStatus, type RecruitingSource } from '@/content/recruitingStatus'
import { projectIcon } from './iconTileData'
import { TEAMS_WILL_HAVE, joinPrimary } from './joinData'
import { ticketDate, ticketDday } from './ticketData'

const source = (current: Partial<RecruitingSource['current']>): RecruitingSource => ({
  current: { generation: 5, channel: 'https://www.instagram.com/gdg.donggukuniv/', ...current },
  history: [],
})

describe('Ticket 계산', () => {
  it('D-day 는 날짜로 계산한다', () => {
    expect(ticketDday('2026-10-27', null, '2026-10-18')).toBe('D-9')
    expect(ticketDday('2026-10-27', undefined, '2026-10-27')).toBe('D-day')
    expect(ticketDday('2026-10-27', null, '2026-10-28')).toBe('종료')
  })
  it('여러 날 행사는 사이에 진행 중, 끝나면 종료', () => {
    expect(ticketDday('2027-01-30', '2027-01-31', '2027-01-29')).toBe('D-1')
    expect(ticketDday('2027-01-30', '2027-01-31', '2027-01-31')).toBe('진행 중')
    expect(ticketDday('2027-01-30', '2027-01-31', '2027-02-01')).toBe('종료')
  })
  it('날짜는 10.27 + 요일, 해가 다르면 연도를 붙인다', () => {
    expect(ticketDate('2026-10-27', '2026-10-18')).toEqual({ day: '10.27', week: '화' })
    expect(ticketDate('2027-01-30', '2026-10-18')).toEqual({ day: '2027.01.30', week: '토' })
  })
})

describe('JoinStrip 주 버튼', () => {
  it('모집 중이고 지원서 주소가 있으면 지원서 쓰기', () => {
    const st = recruitStatus('2026-11-02', source({ opensAt: '2026-11-01', deadline: '2026-11-10', applyUrl: 'https://forms.gle/x' }))
    expect(joinPrimary(st)).toMatchObject({ kind: 'apply', label: '지원서 쓰기', href: 'https://forms.gle/x' })
  })
  it('지원서 주소가 없거나 모집 전 · 뒤면 소식 받기 (인스타그램)', () => {
    const open = recruitStatus('2026-11-02', source({ opensAt: '2026-11-01', deadline: '2026-11-10' }))
    const none = recruitStatus('2026-10-18', source({}))
    for (const st of [open, none]) {
      expect(joinPrimary(st)).toMatchObject({ kind: 'notify', label: '5기 소식 받기', href: 'https://www.instagram.com/gdg.donggukuniv/' })
    }
  })
})

describe('팀원 찾기: 열리면 생길 것', () => {
  it('세 줄 모두 팀 기획(config/pages.ts)에 있는 기능이다', () => {
    expect(TEAMS_WILL_HAVE).toHaveLength(3)
    for (const w of TEAMS_WILL_HAVE) expect(PAGE_PLANS.teams.features).toContain(w.from)
  })
  it('문장은 습니다체로 끝난다', () => {
    for (const w of TEAMS_WILL_HAVE) expect(w.desc).toMatch(/니다\.$/)
  })
})

describe('아이콘 타일', () => {
  const cover = { src: 'project-images/todai.webp', alt: '토닥이 로고', kind: 'logo' as const, width: 400, height: 400, source: 'https://github.com/x', teamCleared: true }
  it('표지 그림이 없으면 그리지 않는다', () => {
    expect(projectIcon({ id: 'smile', name: 'Smile', cover: undefined })).toBeNull()
  })
  it('이름 뒤 괄호 설명은 빼고, 누르면 자세히 보기 창으로', () => {
    const t = projectIcon({ id: 'todai', name: '토닥이 (TodAi)', cover })
    expect(t).toMatchObject({ name: '토닥이', to: { pathname: '/archive', search: '?p=todai' }, width: 400, height: 400 })
    expect(t?.src.endsWith('project-images/todai.webp')).toBe(true)
  })
})
