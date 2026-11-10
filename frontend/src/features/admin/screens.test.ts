import { describe, expect, it } from 'vitest'
import { PROTOTYPE } from '@/config/site'
import { voices } from '@/content/story'
import { SAMPLE_ACCOUNTS } from '@/features/teams/data/sampleSeed'
import { ADMIN_ACCOUNT_SEED, EXAMPLE_ACCOUNTS } from './data/common/accounts'
import { createAdminSeed } from './data/seed'
import { ADMIN_SCREENS, adminPath } from './screens'
import { ADMIN_SAMPLE } from './sample'
import { ADMIN_MENU, isGroup } from './shell/menu'
import { adminTitle } from './ui/useAdminTitle'

/** 명세서 01) 화면 명세서 v1.2 의 관리자 페이지 주소 (팝업은 주소 없음) */
const SPEC_URLS = [
  '/admin/login',
  '/admin',
  '/admin/boards/teams',
  '/admin/boards/community',
  '/admin/boards/community/write',
  '/admin/projects',
  '/admin/projects/write',
  '/admin/contents',
  '/admin/users',
  '/admin/users/history',
  '/admin/recruit/form',
  '/admin/recruit/form/criteria',
  '/admin/recruit/applicants',
  '/admin/recruit/applicants/{applicantId}',
  '/admin/recruit/templates',
]

describe('관리자 화면 목록 (screens.ts)', () => {
  it('명세서의 관리자 주소가 모두 있다', () => {
    const paths = ADMIN_SCREENS.map((s) => s.path.replace(/:(\w+)/g, '{$1}'))
    expect([...paths].sort()).toEqual([...SPEC_URLS].sort())
  })

  it('화면 ID 는 겹치지 않고, 구역 화면은 내보낼 페이지 이름이 있다', () => {
    const ids = ADMIN_SCREENS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const s of ADMIN_SCREENS) if ('section' in s) expect(s.page, s.id).toMatch(/^[A-Z]\w+Page$/)
  })

  it('사이드바 메뉴는 모두 화면 목록의 주소로 간다', () => {
    const paths = new Set<string>(ADMIN_SCREENS.map((s) => s.path))
    const links = ADMIN_MENU.flatMap((m) => (isGroup(m) ? m.children : [m]))
    for (const l of links) expect(paths.has(l.to), l.to).toBe(true)
  })

  it('주소 도우미', () => {
    expect(adminPath.projectWrite('agriguard')).toBe('/admin/projects/write?id=agriguard')
    expect(adminPath.applicant('a 1')).toBe('/admin/recruit/applicants/a%201')
  })
})

describe("처음 데이터: 프로토타입 보기에서는 '예시' 표시 없이 공개 사이트와 같은 사람 · 글 (sample.ts)", () => {
  const NOW = Date.parse('2026-11-01T03:00:00Z')
  const seed = createAdminSeed({ now: NOW, sample: false })
  const sampleSeed = createAdminSeed({ now: NOW, sample: true })
  const ADMIN_NAME = /^운영진[A-Z]?$/
  const teamsPeople = new Set(SAMPLE_ACCOUNTS.map((a) => a.name))

  it("vitest 는 프로토타입 보기라 ADMIN_SAMPLE 이 꺼져 있고, 탭 제목에 '(예시)'가 없다", () => {
    expect(ADMIN_SAMPLE).toBe(!PROTOTYPE)
    expect(adminTitle('대시보드')).toBe(ADMIN_SAMPLE ? '대시보드 · 관리자 (예시) · GDGoC DGU' : '대시보드 · 관리자 · GDGoC DGU')
  })

  it('사용자: 관리자 계정(운영진A …) + 공개 팀원 찾기의 계정. 이메일은 example.com (실제 주소가 아님)', () => {
    for (const u of seed.users.users) {
      expect(ADMIN_NAME.test(u.name) || teamsPeople.has(u.name), u.id).toBe(true)
      expect(u.email, u.id).toMatch(/@example\.com$/)
      expect(u.studentId, u.id).toMatch(/^\d{10}$/)
    }
  })

  it("게시글 · 댓글 · 리뷰 · 메일 템플릿 · 평가 기준에 '예시' 표시가 없다 (예시 화면 seed 에는 있다)", () => {
    const visible = (d: typeof seed) =>
      JSON.stringify([
        d.users.users.map((u) => u.name),
        d.boards.posts.map((p) => [p.title, p.content, p.authorName]),
        d.boards.comments.map((c) => [c.content, c.authorName]),
        d.contents.reviews,
        d.recruit.templates.map((t) => [t.subject, t.body]),
        d.recruit.criteria.items.map((c) => c.guide),
        d.recruit.form,
      ])
    expect(visible(seed)).not.toContain('예시')
    expect(visible(sampleSeed)).toContain('예시')
  })

  it('실제 사람 이름은 공개 홈 Interview 리뷰(content/story.ts)에서만 온다', () => {
    const voiceNames = new Set(voices.map((v) => v.name))
    expect(seed.contents.reviews.every((r) => voiceNames.has(r.name))).toBe(true)
    for (const p of seed.boards.posts) expect(p.authorName === '운영진' || teamsPeople.has(p.authorName), p.id).toBe(true)
    for (const c of seed.boards.comments) expect(teamsPeople.has(c.authorName), c.id).toBe(true)
    expect(seed.recruit.applicants).toEqual([])
  })

  it('예시 계정 버튼 3개는 seed 의 관리자 계정이고, 사용자 seed 맨 앞에 있다', () => {
    expect(EXAMPLE_ACCOUNTS).toHaveLength(3)
    for (const a of EXAMPLE_ACCOUNTS) expect(ADMIN_ACCOUNT_SEED.find((u) => u.id === a.userId)?.loginId).toBe(a.loginId)
    expect(seed.users.users.slice(0, ADMIN_ACCOUNT_SEED.length).map((u) => u.id)).toEqual(ADMIN_ACCOUNT_SEED.map((u) => u.id))
    expect(seed.users.users.find((u) => u.loginId === 'core-c')?.adminLogin?.temporaryPassword).toBe(true)
  })
})
