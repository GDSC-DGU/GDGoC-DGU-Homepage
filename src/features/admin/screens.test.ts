import { describe, expect, it } from 'vitest'
import { ADMIN_ACCOUNT_SEED, EXAMPLE_ACCOUNTS } from './data/common/accounts'
import { createAdminSeed } from './data/seed'
import { ADMIN_SCREENS, adminPath } from './screens'
import { ADMIN_MENU, isGroup } from './shell/menu'

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

describe('예시 데이터 이름 규칙 (BRIEF: 지어낸 사람이 실제 사람처럼 보이지 않게)', () => {
  const seed = createAdminSeed({ now: Date.parse('2026-11-01T03:00:00Z') })
  const EXAMPLE_NAME = /^(운영진[A-Z]|운영진|예시 (멤버|지원자) \d{2})$/

  it('사용자 이름 · 이메일 · 학번', () => {
    for (const u of seed.users.users) {
      expect(u.name, u.id).toMatch(EXAMPLE_NAME)
      expect(u.email, u.id).toMatch(/@example\.com$/)
      expect(u.studentId, u.id).toMatch(/^\d{10}$/)
    }
  })

  it('게시글 · 댓글 작성자와 내용', () => {
    for (const p of seed.boards.posts) {
      expect(p.authorName, p.id).toMatch(EXAMPLE_NAME)
      expect(p.title, p.id).toContain('예시')
    }
    for (const c of seed.boards.comments) {
      expect(c.authorName, c.id).toMatch(EXAMPLE_NAME)
      expect(c.content, c.id).toContain('예시')
    }
  })

  it('리뷰 · 지원자 · 메일 템플릿도 예시 티', () => {
    for (const r of seed.contents.reviews) {
      expect(r.name).toMatch(EXAMPLE_NAME)
      expect(r.content).toContain('예시')
    }
    for (const a of seed.recruit.applicants) {
      expect(a.name).toMatch(EXAMPLE_NAME)
      expect(a.email).toMatch(/@example\.com$/)
    }
    for (const t of seed.recruit.templates) expect(`${t.subject}${t.body}`).toContain('예시')
  })

  it('예시 계정 버튼 3개는 seed 의 관리자 계정이고, 사용자 seed 맨 앞에 있다', () => {
    expect(EXAMPLE_ACCOUNTS).toHaveLength(3)
    for (const a of EXAMPLE_ACCOUNTS) expect(ADMIN_ACCOUNT_SEED.find((u) => u.id === a.userId)?.loginId).toBe(a.loginId)
    expect(seed.users.users.slice(0, ADMIN_ACCOUNT_SEED.length).map((u) => u.id)).toEqual(ADMIN_ACCOUNT_SEED.map((u) => u.id))
    expect(seed.users.users.find((u) => u.loginId === 'core-c')?.adminLogin?.temporaryPassword).toBe(true)
  })
})
