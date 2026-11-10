import { isPublicProject } from '@/content'
import type { LanguageShare, Project, ProjectImage } from '@/domain/types'
import { OTHER_PROGRAMS, projectLinks, type ProjectGroup } from '../projectGroups'

/**
 * 프로젝트 전시 계산: 그림 고르기, 대표 작품 무대(화면 둘 겹치기), 언어 비율 막대, 전시실(프로그램 · 연도 묶음).
 * 화면과 상관없는 계산만 둔다. exhibit.test.ts 에 테스트.
 */

/* ───────────── 그림 ───────────── */

/**
 * 팀 확인(teamCleared) 전 그림도 보여 줄지.
 * 시안 단계라 true. 공개 전에 false 로 바꾸면 teamCleared: true 인 그림만 나오고, 나머지 프로젝트는 글자 표지로 바뀐다.
 */
export const SHOW_UNCLEARED_IMAGES = true

export const isShownImage = (img: ProjectImage | undefined, showUncleared = SHOW_UNCLEARED_IMAGES): img is ProjectImage =>
  Boolean(img && (img.teamCleared || showUncleared))

/** 표지: 보여 줄 수 있는 cover. 없으면 화면이 글자 표지를 그린다 */
export const projectCover = (p: Pick<Project, 'cover'>, showUncleared = SHOW_UNCLEARED_IMAGES): ProjectImage | undefined =>
  isShownImage(p.cover, showUncleared) ? p.cover : undefined

/** 자세히 보기 창의 그림: 표지 → 나머지 (같은 파일은 한 번만) */
export function projectGallery(p: Pick<Project, 'cover' | 'images'>, showUncleared = SHOW_UNCLEARED_IMAGES): ProjectImage[] {
  const all = [p.cover, ...(p.images ?? [])].filter((img): img is ProjectImage => isShownImage(img, showUncleared))
  return all.filter((img, i) => all.findIndex((x) => x.src === img.src) === i)
}

/** 그림 원본을 '원본' 으로 걸어도 되는지: 누구나 열 수 있는 GitHub 주소만 (노션 '전 기수 데이터 모음집'은 챕터 안 문서라 걸지 않는다) */
export const isOpenSource = (url: string): boolean => /^https:\/\/(github\.com|raw\.githubusercontent\.com)\//.test(url)

/** 화면 캡처 · 소개 이미지처럼 그 자체로 작업을 보여 주는 그림인지 (로고 · 구조도가 아닌 것) */
export const isWorkImage = (img: ProjectImage | undefined) => img?.kind === 'screen' || img?.kind === 'promo' || img?.kind === 'mobile'

/** 지금 열리는 서비스가 있는지 (projects.json 의 url 은 실제로 열리는 웹 · 스토어 주소만 적는다: docs/CONTENT.md) */
export const isLive = (p: Pick<Project, 'url'>): boolean => Boolean(p.url)

/**
 * 전시실 안 순서: 실제 화면 그림 + 지금 열리는 서비스(0) → 둘 중 하나(1) → 로고 · 구조도 표지(2) → 글자 표지(3).
 * 처음 보는 사람이 '정말 만들었나'를 먼저 확인할 수 있는 작품부터 건다. 같은 순위 안은 받은 순서(이름순)를 지킨다.
 */
export function exhibitRank(p: Pick<Project, 'cover' | 'url'>, showUncleared = SHOW_UNCLEARED_IMAGES): number {
  const cover = projectCover(p, showUncleared)
  const work = isWorkImage(cover)
  const live = isLive(p)
  if (work && live) return 0
  if (work || live) return 1
  return cover ? 2 : 3
}

/**
 * 대표 작품 무대에 걸 그림: 넓은 화면(데스크톱 캡처)과 폰 화면이 둘 다 있으면 겹쳐 건다 (약조심).
 * 둘 중 하나라도 없으면 null 이고, 무대는 표지 한 장(소개 그림 · 화면)을 크게 건다 (Greenap).
 * 갤러리 순서(표지 → 나머지)에서 처음 나오는 것을 쓴다.
 */
export function stageShots(gallery: readonly ProjectImage[]): { wide: ProjectImage; tall: ProjectImage } | null {
  const wide = gallery.find((img) => img.kind === 'screen')
  const tall = gallery.find((img) => img.kind === 'mobile')
  return wide && tall ? { wide, tall } : null
}

/**
 * 자세히 보기 창의 바깥 링크 줄: GitHub 저장소 · 데모 영상 (개인 저장소는 걸지 않는다: 공개 기준을 통과한 저장소만).
 * 지금 열리는 서비스(지금 써 보기)는 따로 주 버튼으로 건다.
 */
export function outLinks(p: Pick<Project, 'repo' | 'url' | 'demo'>, isPublicRepo: (p: Pick<Project, 'repo'>) => boolean = isPublicProject): { href: string; label: string }[] {
  const { repo } = projectLinks(p, isPublicRepo)
  const demos = p.demo ?? []
  return [
    ...(repo ? [{ href: repo, label: 'GitHub 저장소' }] : []),
    ...demos.map((d, i) => ({ href: d, label: demos.length > 1 ? `데모 영상 ${i + 1}` : '데모 영상' })),
  ]
}

/** public/ 기준 경로 → 실제 주소 (VITE_BASE=./ 로 하위 경로에 올린 미리보기에서도 맞게) */
export const assetUrl = (src: string) => `${import.meta.env.BASE_URL}${src}`

/** 'https://github.com/GDSC-DGU/2026-SDGs-Project-TodAi' → 'GDSC-DGU/2026-SDGs-Project-TodAi' */
export const repoPath = (repo: string) => repo.replace(/^https:\/\/github\.com\//, '').replace(/\/+$/, '')

/* ───────────── 언어 비율 ───────────── */

export interface LanguageSegment {
  name: string
  /** % (소수 한 자리) */
  share: number
  /** 작은 언어를 모은 '기타' */
  rest?: boolean
}

export const OTHER_LANGUAGES = '기타'
const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * GitHub 언어 비율 → 막대 조각. 큰 것부터 max 개, minShare % 미만은 '기타' 하나로 합친다.
 * 합이 100 이 안 되면(반올림 · 0.1% 미만 언어) 남는 몫도 기타에 넣는다.
 */
export function languageSegments(languages: readonly LanguageShare[] | undefined, { max = 3, minShare = 3 } = {}): LanguageSegment[] {
  if (!languages?.length) return []
  const sorted = [...languages].sort((a, b) => b.share - a.share)
  const main = sorted.filter((l, i) => i < max && l.share >= minShare).map((l) => ({ name: l.name, share: round1(l.share) }))
  const kept = main.reduce((s, l) => s + l.share, 0)
  const rest = round1(Math.max(0, 100 - kept))
  // 첫 언어가 minShare 보다 작아도 막대는 비우지 않는다
  if (main.length === 0) return [{ name: sorted[0].name, share: round1(sorted[0].share) }]
  return rest >= 0.5 ? [...main, { name: OTHER_LANGUAGES, share: rest, rest: true }] : main
}

/** '언어 비율: TypeScript 88.6%, CSS 10.4%, 기타 1%' (화면 읽기 프로그램용) */
export const languageSummary = (segs: readonly LanguageSegment[]) => `언어 비율: ${segs.map((s) => `${s.name} ${s.share}%`).join(', ')}`

/* ───────────── 작은 표지 글자 ───────────── */

/**
 * 그림이 없는 작품의 아이콘 표지 글자: 이름의 첫 낱말(숫자뿐인 연도는 건너뜀)에서 뗀다.
 * - 다섯 글자 이하면 낱말 그대로 ('E&I' · 'sMiLe' · 'GDGoC' · 'GDSC' · '동국대'): 비슷한 이름끼리 구별되게
 * - 더 길고 낱말 안에 대문자가 둘 이상이면 대문자만 ('SmileLens' → 'SL')
 * - 그 밖에는 앞 두 글자, 한글이면 한 글자 ('harang' → 'ha', 'Circulo' → 'Ci')
 */
export function monogram(name: string): string {
  const word = name.split(/\s+/).find((w) => w && !/^\d+$/.test(w)) ?? name
  const chars = [...word]
  if (chars.length <= 5) return word
  const caps = chars.filter((ch) => /[A-Z]/.test(ch))
  if (caps.length >= 2) return caps.slice(0, 3).join('')
  if (/^[\u3131-\uD79D]/.test(word)) return chars[0]
  return chars.slice(0, 2).join('')
}

/* ───────────── 날짜 ───────────── */

/**
 * 커밋 기간을 달 단위로: '2026.05~06' · 해를 넘으면 '2024.12~2025.02' · 한 달이면 '2024.02'.
 * 하루하루 날짜(요일)가 아니라 '언제 만들었나'를 보여 주는 값이라 달까지만 쓴다.
 */
export function monthSpan(first: string | undefined, last: string | undefined): string | null {
  if (!first && !last) return null
  const a = (first ?? last)!.slice(0, 7)
  const b = (last ?? first)!.slice(0, 7)
  const dot = (ym: string) => ym.replace('-', '.')
  if (a === b) return dot(a)
  if (a.slice(0, 4) === b.slice(0, 4)) return `${dot(a)}~${b.slice(5, 7)}`
  return `${dot(a)}~${dot(b)}`
}

/* ───────────── 전시실 (프로그램 · 연도 묶음) ───────────── */

export interface Room {
  /** 같은 페이지 안 주소 '#solution-challenge-apac-2025' 에 쓰는 id */
  id: string
  title: string
  /** '2026' 또는 여러 해가 섞이면 '2024~2025' */
  yearLabel: string
  /** 묶음 안 기수 (겹치지 않게, 작은 것부터) */
  generations: number[]
  projects: Project[]
  /** 전시실 맨 앞에 크게 거는 작품: 화면 캡처가 있는 첫 프로젝트 (3개 이상인 방에서만). 나머지는 exhibitRank 순 */
  featured?: Project
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** 묶음 → 전시실. id 는 영문 소문자 · 숫자 · '-' (한글 프로그램 이름이면 순서 번호로) */
export function toRooms(groups: readonly ProjectGroup[], showUncleared = SHOW_UNCLEARED_IMAGES): Room[] {
  const used = new Set<string>()
  return groups.map((g, i) => {
    const base = g.program === OTHER_PROGRAMS ? 'other-projects' : [slug(g.program), g.year].filter(Boolean).join('-')
    let id = base && !/^\d+$/.test(base) ? base : `room-${i + 1}`
    while (used.has(id)) id = `${id}-${i + 1}`
    used.add(id)
    const years = g.projects.map((p) => p.year)
    const lo = Math.min(...years)
    const hi = Math.max(...years)
    const generations = [...new Set(g.projects.map((p) => p.generation).filter((n): n is number => typeof n === 'number'))].sort((a, b) => a - b)
    // 화면 · 서비스 → 로고 → 글자 표지 순 (sort 는 안정 정렬이라 같은 순위는 받은 순서 그대로)
    const ranked = [...g.projects].sort((a, b) => exhibitRank(a, showUncleared) - exhibitRank(b, showUncleared))
    // 대표 작품: 작업 그림이 표지인 것 중 앞 순위, 같은 순위면 그림이 더 많은 것 (같으면 이름순). 세 작품 이상인 방에만
    const candidates = ranked.length >= 3 ? ranked.filter((p) => isWorkImage(projectCover(p, showUncleared))) : []
    const richness = (p: Project) => projectGallery(p, showUncleared).length
    const featured = candidates.reduce<Project | undefined>((top, p) => {
      if (!top) return p
      const d = exhibitRank(p, showUncleared) - exhibitRank(top, showUncleared)
      return d < 0 || (d === 0 && richness(p) > richness(top)) ? p : top
    }, undefined)
    const projects = featured ? [featured, ...ranked.filter((p) => p !== featured)] : ranked
    return { id, title: g.program, yearLabel: lo === hi ? String(lo) : `${lo}~${hi}`, generations, projects, featured }
  })
}

/* ───────────── 자세히 보기 순서 ───────────── */

/** 전시 순서(전시실 순 → 방 안 순)에서 앞 · 뒤 프로젝트 */
export function neighbors(rooms: readonly Room[], id: string): { prev?: Project; next?: Project } {
  const list = rooms.flatMap((r) => r.projects)
  const i = list.findIndex((p) => p.id === id)
  if (i < 0) return {}
  return { prev: list[i - 1], next: list[i + 1] }
}
