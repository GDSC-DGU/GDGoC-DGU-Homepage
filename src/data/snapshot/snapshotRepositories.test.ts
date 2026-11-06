import { PROTOTYPE } from '@/config/site'
import { describe, expect, it } from 'vitest'
import { EVENTS, FAQS, PROJECTS, RECRUITING } from '@/content'
import { createMockRepositories } from '@/data/mock/mockRepositories'
import type { Project, ScheduleEvent } from '@/domain/types'
import { buildArchive, communityPreview, createSnapshotRepositories, projectsPreview, recruitsPreview } from './snapshotRepositories'

const ev = (id: string, date: string, extra: Partial<ScheduleEvent> = {}): ScheduleEvent => ({ id, date, title: id, kind: 'session', place: 'community', ...extra })

describe('미리보기 (지도 패널의 최신 3개)', () => {
  it('커뮤니티: 다음 일정 하나 → 최근 지난 행사. 휴회와 다른 장소는 뺀다', () => {
    const events = [
      ev('old', '2026-09-22'),
      ev('recent', '2026-10-06'),
      ev('rest', '2026-10-20', { kind: 'rest' }),
      ev('next', '2026-11-02', { kind: 'event' }),
      ev('later', '2026-12-01'),
      ev('sprint', '2026-10-27', { kind: 'sprint', place: 'projects' }),
    ]
    expect(communityPreview(events, '2026-10-17', 3).map((p) => p.id)).toEqual(['next', 'recent', 'old'])
    expect(communityPreview(events, '2026-10-17', 3)[0]).toMatchObject({ date: '2026-11-02', tag: '행사' })
    // 지난 행사가 모자라면 다음 일정을 더 채운다
    expect(communityPreview(events, '2026-09-01', 3).map((p) => p.id)).toEqual(['old', 'recent', 'next'])
  })

  it('프로젝트: 진행 중 → 최근 해 순서 (같은 해면 설명이 있는 것 먼저). 프로젝트가 없으면 G-Sprint 일정', () => {
    const projects: Project[] = [
      { id: 'p24', name: 'A', program: 'Solution Challenge 2024', year: 2024, status: 'done', repo: 'https://x' },
      { id: 'p26-bare', name: 'D', program: 'SDGs Project', year: 2026, status: 'done', repo: 'https://x' },
      { id: 'p26', name: 'B', program: 'SDGs Project', year: 2026, status: 'done', repo: 'https://x', summary: '설명입니다.' },
      { id: 'now', name: 'C', program: 'G-Sprint', year: 2026, status: 'in-progress' },
    ]
    const items = projectsPreview(projects, [], '2026-10-17', 4)
    expect(items.map((p) => p.id)).toEqual(['now', 'p26', 'p26-bare', 'p24'])
    expect(items[0].label).toBe('진행 중')
    const sprint = [ev('kick', '2026-10-13', { kind: 'sprint', place: 'projects' }), ev('mid', '2026-10-27', { kind: 'sprint', place: 'projects' })]
    expect(projectsPreview([], sprint, '2026-10-17', 3).map((p) => p.id)).toEqual(['mid', 'kick'])
  })

  it('지원 안내: 지금 모집 상태 → 지난 기수 모집 단계 (일어난 순서)', () => {
    const items = recruitsPreview(RECRUITING, 5)
    expect(items[0]).toMatchObject({ title: `${RECRUITING.current.generation}기 모집 일정`, label: '공지 예정' })
    expect(items.slice(1).map((p) => p.title)).toEqual(['4기 코어 멤버 모집', '4기 마케팅 코어 모집', '4기 일반 멤버 모집', '4기 OT'])
  })

  it('실제 콘텐츠로 장소마다 limit 개까지 돌려주고, 팀원 모집은 지어낸 글 없이 상태 줄만 보여 준다', async () => {
    const repos = createSnapshotRepositories({ today: () => '2026-10-17' })
    const community = await repos.previews.latest('community', 3)
    expect(community.map((p) => p.id)).toEqual(['4th-dhdr-1', '4th-git', '4th-intro'])
    const projects = await repos.previews.latest('projects', 3)
    expect(projects[0]).toMatchObject({ id: 'homepage-renewal', label: '진행 중' })
    expect(projects).toHaveLength(3)
    const teams = await repos.previews.latest('teams', 3)
    expect(teams.length).toBeGreaterThan(0)
    for (const t of teams) {
      // 프로토타입 보기(개발 · 테스트)는 게시판의 최근 예시 글('예시' 표시), 공개 배포는 날짜 없는 상태 줄
      if (PROTOTYPE) {
        expect(t.date, t.id).toBeTruthy()
        expect(t.sample, t.id).toBe(true)
      } else {
        expect(t.sample, t.id).toBeUndefined()
        expect(t.date, t.id).toBeUndefined()
        expect(t.label, t.id).toBeTruthy()
      }
    }
    expect(await repos.previews.latest('recruits', 2)).toHaveLength(2)
  })

  it('목록은 복사본을 돌려준다 (화면이 원본을 바꾸지 못하게)', async () => {
    const repos = createSnapshotRepositories()
    const list = await repos.schedule.list()
    list[0].title = '바뀜'
    expect(EVENTS[0].title).not.toBe('바뀜')
    expect((await repos.projects.list()).length).toBe(PROJECTS.length)
  })
})

describe('검색 아카이브', () => {
  const docs = buildArchive()

  it('행사 · 프로젝트 · FAQ 를 담고, id 가 겹치지 않는다', () => {
    const ids = docs.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(docs.some((d) => d.id.startsWith('event-'))).toBe(true)
    expect(docs.filter((d) => d.id.startsWith('project-'))).toHaveLength(PROJECTS.filter((p) => p.status === 'done').length)
    expect(docs.filter((d) => d.id.startsWith('faq-'))).toHaveLength(FAQS.length)
    expect(docs.some((d) => d.id === 'event-4th-rest-mid')).toBe(false)
  })

  it('제목은 화면용 한글 제목이고(게시된 영어 원제목이 아님), 예시 글이 없다', () => {
    const originals = new Set(EVENTS.map((e) => e.originalTitle).filter(Boolean))
    expect(docs.filter((d) => originals.has(d.title)).map((d) => d.title)).toEqual([])
    expect(docs.find((d) => d.id === 'event-3rd-dev-conference')?.title).toBe('동국대 Dev Conference 2025')
    expect(docs.find((d) => d.id === 'event-4th-sprint-kickoff')?.title).toBe('G-Sprint 킥오프와 팀 회의')
    expect(docs.filter((d) => d.sample)).toEqual([])
  })

  it('예시 글을 빼도 빈 묶음 · 빈 패널이 없다', async () => {
    // 팀원 모집 게시판은 아직 글이 없어 검색 묶음에 나오지 않는다. 동지톤은 커뮤니티 행사로 찾는다
    expect(docs.some((d) => d.place === 'teams')).toBe(false)
    expect(docs.find((d) => d.id === 'event-4th-dongjithon')?.place).toBe('community')
    // 지도 패널은 장소마다 한 줄 이상 (팀원 모집은 상태 줄)
    const repos = createSnapshotRepositories({ today: () => '2026-10-17' })
    for (const place of ['community', 'projects', 'teams', 'recruits'] as const) {
      expect((await repos.previews.latest(place, 3)).length, place).toBeGreaterThan(0)
    }
  })

  const search = createSnapshotRepositories().search
  const titles = async (q: string) => (await search.search(q)).map((h) => h.doc.title)

  it('한글로 영어 행사 이름을 찾는다', async () => {
    expect((await titles('캠핑 세미나')).some((t) => t.startsWith('Camping Seminar'))).toBe(true)
    expect((await titles('캠핑세미나')).length).toBeGreaterThan(0)
    expect(await titles('솔루션 챌린지')).toContain('Greenap')
    expect(await titles('스터디잼')).toContain('Gemini Study Jams 1주차')
  })

  it('영어로 한글 제목을 찾는다', async () => {
    expect(await titles('demo day')).toContain('2기 데모데이')
    expect(await titles('hackathon')).toContain('동지톤')
  })

  it('기술 이름으로 프로젝트를 찾는다', async () => {
    expect(await titles('플러터')).toContain('Earlips')
    expect(await titles('spring boot')).toContain('Circulo')
  })

  it('FAQ 도 찾는다', async () => {
    const hits = await search.search('연락')
    expect(hits.some((h) => h.doc.id === 'faq-contact' && h.doc.place === 'recruits')).toBe(true)
  })
})

describe('mock 구현 (테스트 · 화면 시안용)', () => {
  it('그대로 동작한다', async () => {
    const repos = createMockRepositories()
    expect((await repos.schedule.list()).length).toBeGreaterThan(0)
    const teams = await repos.previews.latest('teams', 2)
    expect(teams).toHaveLength(2)
    expect(teams.some((t) => t.sample)).toBe(false)
    expect((await repos.search.search('세미나')).length).toBeGreaterThan(0)
    expect((await repos.search.search('팀원 모집')).some((h) => h.doc.sample)).toBe(false)
  })
})
