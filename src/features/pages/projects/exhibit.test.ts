import { describe, expect, it } from 'vitest'
import { PROJECTS } from '@/content'
import type { Project, ProjectImage } from '@/domain/types'
import { groupProjects } from '../projectGroups'
import { exhibitRank, isOpenSource, languageSegments, monogram, monthSpan, neighbors, OTHER_LANGUAGES, outLinks, projectCover, projectGallery, repoPath, stageShots, toRooms } from './exhibit'

const img = (src: string, extra: Partial<ProjectImage> = {}): ProjectImage => ({ src, alt: src, kind: 'screen', width: 960, height: 600, source: 'https://raw.githubusercontent.com/GDSC-DGU/x/main/a.png', teamCleared: false, ...extra })
const pj = (id: string, program: string, year: number, extra: Partial<Project> = {}): Project => ({ id, name: id, program, year, status: 'done', ...extra })

describe('그림 고르기', () => {
  it('팀 확인 전 그림은 설정에 따라 숨긴다', () => {
    const p = { cover: img('projects/a.webp'), images: [img('projects/b.webp', { teamCleared: true })] }
    expect(projectCover(p, true)?.src).toBe('projects/a.webp')
    expect(projectCover(p, false)).toBeUndefined()
    expect(projectGallery(p, false).map((i) => i.src)).toEqual(['projects/b.webp'])
    expect(projectGallery(p, true).map((i) => i.src)).toEqual(['projects/a.webp', 'projects/b.webp'])
  })

  it('표지와 같은 그림은 한 번만', () => {
    expect(projectGallery({ cover: img('projects/a.webp'), images: [img('projects/a.webp')] }, true)).toHaveLength(1)
  })

  it('바깥 링크 줄: 공개 저장소 → 데모 영상 (여럿이면 번호), 개인 저장소는 걸지 않는다', () => {
    const pub = () => true
    expect(outLinks({ repo: 'https://github.com/GDSC-DGU/a', demo: ['https://y/1', 'https://y/2'] }, pub).map((l) => l.label)).toEqual(['GitHub 저장소', '데모 영상 1', '데모 영상 2'])
    expect(outLinks({ repo: 'https://github.com/someone/a', demo: ['https://y/1'] }, () => false)).toEqual([{ href: 'https://y/1', label: '데모 영상' }])
    expect(outLinks({}, pub)).toEqual([])
  })

  it('저장소 이름', () => {
    expect(repoPath('https://github.com/GDSC-DGU/2026-SDGs-Project-TodAi/')).toBe('GDSC-DGU/2026-SDGs-Project-TodAi')
  })
})

describe('언어 비율 막대', () => {
  it('큰 것부터 3개, 3% 미만은 기타로 합친다', () => {
    const segs = languageSegments([
      { name: 'CSS', share: 10.4 },
      { name: 'TypeScript', share: 88.6 },
      { name: 'JavaScript', share: 0.6 },
      { name: 'HTML', share: 0.4 },
    ])
    expect(segs).toEqual([
      { name: 'TypeScript', share: 88.6 },
      { name: 'CSS', share: 10.4 },
      { name: OTHER_LANGUAGES, share: 1, rest: true },
    ])
  })

  it('나머지가 0.5% 미만이면 기타를 붙이지 않는다', () => {
    expect(languageSegments([{ name: 'Java', share: 100 }])).toEqual([{ name: 'Java', share: 100 }])
  })

  it('비어 있으면 빈 막대', () => {
    expect(languageSegments(undefined)).toEqual([])
    expect(languageSegments([])).toEqual([])
  })

  it('실제 데이터의 막대는 합이 100 근처다', () => {
    for (const p of PROJECTS.filter((x) => x.languages)) {
      const total = languageSegments(p.languages).reduce((s, l) => s + l.share, 0)
      expect(Math.abs(total - 100), p.id).toBeLessThan(1)
    }
  })
})

describe('아이콘 표지 글자', () => {
  it('연도 낱말은 건너뛰고, 다섯 글자 이하 낱말은 그대로', () => {
    expect(monogram('E&I (Earth & I)')).toBe('E&I')
    expect(monogram('2025 동국대 봄 축제 웹사이트')).toBe('동국대')
    expect(monogram('sMiLe')).toBe('sMiLe')
    // 비슷한 두 웹사이트가 구별된다
    expect(monogram('GDSC DGU 웹사이트')).toBe('GDSC')
    expect(monogram('GDGoC DGU 웹사이트')).toBe('GDGoC')
  })

  it('긴 낱말은 대문자 머리글자, 없으면 앞 두 글자 (한글은 한 글자)', () => {
    expect(monogram('SmileLens')).toBe('SL')
    expect(monogram('harang')).toBe('ha')
    expect(monogram('Circulo')).toBe('Ci')
    expect(monogram('동국대학교축제')).toBe('동')
  })
})

describe('커밋 기간', () => {
  it('달 단위로 줄여 쓴다', () => {
    expect(monthSpan('2026-05-19', '2026-06-26')).toBe('2026.05–06')
    expect(monthSpan('2024-12-01', '2025-02-01')).toBe('2024.12–2025.02')
    expect(monthSpan('2024-02-09', '2024-02-20')).toBe('2024.02')
    expect(monthSpan(undefined, '2024-02-20')).toBe('2024.02')
    expect(monthSpan(undefined, undefined)).toBeNull()
  })
})

describe('전시실', () => {
  const projects = [
    pj('b', 'SDGs Project', 2026, { generation: 3, cover: img('projects/b.webp', { kind: 'logo' }) }),
    pj('c', 'SDGs Project', 2026, { generation: 3, cover: img('projects/c.webp') }),
    pj('a', 'SDGs Project', 2026, { generation: 3 }),
    pj('x', 'Solution Challenge 2025 APAC', 2025, { generation: 2 }),
    pj('y', 'Solution Challenge 2025 APAC', 2025, { generation: 2 }),
    pj('site', '챕터 웹사이트', 2025),
    pj('old', '챕터 웹사이트', 2024, { generation: 1 }),
  ]
  const rooms = toRooms(groupProjects(projects), true)

  it('id 는 영문 주소로 쓸 수 있는 모양이고 겹치지 않는다', () => {
    expect(rooms.map((r) => r.id)).toEqual(['sdgs-project-2026', 'solution-challenge-apac-2025', 'other-projects'])
  })

  it('3개 이상인 방은 화면 캡처가 있는 작품을 맨 앞에 크게 건다', () => {
    expect(rooms[0].featured?.id).toBe('c')
    expect(rooms[0].projects.map((p) => p.id)).toEqual(['c', 'b', 'a'])
    expect(rooms[1].featured).toBeUndefined()
  })

  it('방 안 순서: 화면 + 서비스 → 화면이나 서비스 → 로고 → 글자 표지, 같은 순위는 이름순', () => {
    expect(exhibitRank(pj('both', 'X', 2025, { url: 'https://example.org', cover: img('a.webp') }), true)).toBe(0)
    expect(exhibitRank(pj('live', 'X', 2025, { url: 'https://example.org', cover: img('a.webp', { kind: 'logo' }) }), true)).toBe(1)
    expect(exhibitRank(pj('logo', 'X', 2025, { cover: img('a.webp', { kind: 'logo' }) }), true)).toBe(2)
    expect(exhibitRank(pj('type', 'X', 2025), true)).toBe(3)
    // 팀 확인 전 그림을 숨기면 표지가 글자 표지로 바뀌어 순위도 내려간다
    expect(exhibitRank(pj('hidden', 'X', 2025, { cover: img('a.webp') }), false)).toBe(3)
    const room = toRooms(
      groupProjects([
        pj('a-type', 'P', 2025),
        pj('b-logo', 'P', 2025, { cover: img('b.webp', { kind: 'logo' }) }),
        pj('c-live', 'P', 2025, { url: 'https://example.org' }),
        pj('d-type', 'P', 2025),
        pj('e-screen', 'P', 2025, { cover: img('e.webp') }),
      ]),
      true,
    )[0]
    // 크게 거는 작품(화면 캡처)이 맨 앞, 그다음 서비스 · 로고 · 글자 표지
    expect(room.projects.map((p) => p.id)).toEqual(['e-screen', 'c-live', 'b-logo', 'a-type', 'd-type'])
  })

  it('실제 데이터: 방마다 지금 열리는 서비스가 글자 표지보다 앞에 있다', () => {
    for (const r of toRooms(groupProjects(PROJECTS.filter((p) => p.status === 'done')))) {
      const ranks = r.projects.filter((p) => p !== r.featured).map((p) => exhibitRank(p))
      expect(ranks, r.id).toEqual([...ranks].sort((a, b) => a - b))
    }
  })

  it('여러 해가 섞인 방은 연도를 기간으로, 기수는 겹치지 않게', () => {
    expect(rooms[2].yearLabel).toBe('2024–2025')
    expect(rooms[2].generations).toEqual([1])
    expect(rooms[0].generations).toEqual([3])
  })

  it('앞 · 뒤 작품은 전시 순서를 따른다', () => {
    expect(neighbors(rooms, 'c')).toEqual({ prev: undefined, next: rooms[0].projects[1] })
    expect(neighbors(rooms, 'a').next?.id).toBe('x')
    expect(neighbors(rooms, 'none')).toEqual({})
  })
})

describe('대표 작품 무대', () => {
  it('넓은 화면과 폰 화면이 다 있으면 둘을 겹쳐 건다 (갤러리에서 처음 나오는 것)', () => {
    const gallery = [img('d1.webp'), img('promo.webp', { kind: 'promo' }), img('m1.webp', { kind: 'mobile' }), img('m2.webp', { kind: 'mobile' })]
    expect(stageShots(gallery)).toEqual({ wide: gallery[0], tall: gallery[2] })
  })

  it('원본 링크는 GitHub 주소만 건다 (노션 모음집은 걸지 않는다)', () => {
    expect(isOpenSource('https://raw.githubusercontent.com/GDSC-DGU/x/main/a.png')).toBe(true)
    expect(isOpenSource('https://github.com/GDSC-DGU/x/blob/main/a.png')).toBe(true)
    expect(isOpenSource('https://app.notion.com/p/fd17f34d4a7e836eb627812b6d89acf2')).toBe(false)
  })

  it('둘 중 하나라도 없으면 겹치지 않는다', () => {
    expect(stageShots([img('promo.webp', { kind: 'promo' }), img('arch.webp', { kind: 'diagram' })])).toBeNull()
    expect(stageShots([img('d1.webp')])).toBeNull()
    expect(stageShots([])).toBeNull()
  })

  it('실제 데이터: 겹쳐 거는 대표 작품은 약조심, Greenap 은 소개 그림 한 장 (그림이 더 많아 Circulo 보다 앞), 2024 는 E&I', () => {
    const done = PROJECTS.filter((p) => p.status === 'done')
    const rooms = toRooms(groupProjects(done))
    const featured = rooms.map((r) => r.featured?.id).filter(Boolean)
    expect(featured).toEqual(['yakjosim', 'greenap', 'earth-and-i'])
    const yak = done.find((p) => p.id === 'yakjosim')!
    const green = done.find((p) => p.id === 'greenap')!
    expect(stageShots(projectGallery(yak))?.tall.kind).toBe('mobile')
    expect(stageShots(projectGallery(green))).toBeNull()
    expect(projectCover(green)?.kind).toBe('promo')
  })
})
