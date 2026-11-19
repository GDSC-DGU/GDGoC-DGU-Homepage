import type { RecruitStatus } from '@/content/recruitingStatus'
import { HOME_SLIDES } from '@/content/home'
import { isPublicProject } from '@/content'
import type { Project, ProjectImage, ScheduleEvent } from '@/domain/types'
import { exhibitRank, isShownImage, isWorkImage, projectGallery } from '@/features/pages/projects/exhibit'
import { fill } from './homeData'

/** 'YYYY-MM-DD' → 'YYYY.MM.DD' */
export const dotDate = (ymd: string) => ymd.replaceAll('-', '.')

/**
 * 첫 화면 '다음 행사' 슬라이드에 걸 일정: 오늘 이후에 시작하는 G-Sprint · 행사 중 가장 가까운 것.
 * 이미 시작한 여러 날 일정('팀별 개발 기간')은 '~에 열립니다'가 맞지 않아 뺀다. 매주 세션 · 휴회도 뺀다.
 * 같은 날이면 이름 순서. 없으면 undefined (슬라이드가 빠진다).
 */
export function nextHighlight<T extends Pick<ScheduleEvent, 'kind' | 'date' | 'title'>>(events: readonly T[], today: string): T | undefined {
  return events
    .filter((e) => (e.kind === 'sprint' || e.kind === 'event') && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'ko'))[0]
}

/** 첫 화면 모집 슬라이드의 제목 · 한 줄 (모집 상태는 recruitingStatus.ts 가 날짜로 계산) */
export function recruitSlideText(st: Pick<RecruitStatus, 'state' | 'generation' | 'opensAt' | 'deadline'>): { title: string; body: string } {
  const c = HOME_SLIDES.recruit
  const title = fill(st.state === 'open' ? c.titleOpen : c.title, { next: st.generation })
  const date = st.state === 'soon' ? st.opensAt : st.state === 'open' ? st.deadline : undefined
  // 날짜가 있어야 하는 상태인데 날짜가 비면 '정해지면 알린다'로 (지어낸 날짜를 쓰지 않는다)
  if ((st.state === 'soon' || st.state === 'open') && !date) return { title, body: c.body.unscheduled }
  return { title, body: fill(c.body[st.state], { date: date ? dotDate(date) : '' }) }
}

/** 프로젝트 카드의 그림: 실제 화면 · 소개 그림이 있으면 그것, 없으면 표지(로고) */
export function railImage(p: Pick<Project, 'cover' | 'images'>) {
  const gallery = projectGallery(p)
  return gallery.find((img) => isWorkImage(img)) ?? gallery[0]
}

/**
 * 홈 '팀 프로젝트' 넘기는 줄: 그림이 있는 것부터(아카이브 전시실과 같은 순서), 그 안에서 최근 것부터 limit 개.
 * 완성(done) 프로젝트만.
 */
export function railProjects(list: readonly Project[], limit: number): Project[] {
  const recent = (a: Project, b: Project) => b.year - a.year || (b.generation ?? 0) - (a.generation ?? 0) || a.name.localeCompare(b.name, 'ko')
  return list
    .filter((p) => p.status === 'done')
    .sort((a, b) => exhibitRank(a) - exhibitRank(b) || recent(a, b))
    .slice(0, limit)
}

/* ── 첫 화면 3D 원통 슬라이드 (슈어소프트테크 첫 화면) ── */

/** 원통의 면 수가 이보다 적으면 앞 장을 되풀이해 채운다 (면이 적으면 옆 장이 너무 꺾인다) */
export const CAROUSEL_MIN_FACES = 6

/** 면마다 몇 번째 원래 장인지: 3장이면 [0, 1, 2, 0, 1, 2] */
export function carouselFaces(count: number, min = CAROUSEL_MIN_FACES): number[] {
  if (count <= 0) return []
  const n = Math.max(count, count > 1 ? min : 1)
  return Array.from({ length: n }, (_, i) => i % count)
}

/** 면 한 장의 폭이 width 일 때 원통: 면 사이 각(theta, 라디안)과 원통 가운데까지 거리(apothem) */
export function cylinder(width: number, n: number): { theta: number; apothem: number } {
  if (n < 2) return { theta: 0, apothem: 0 }
  const theta = (Math.PI * 2) / n
  return { theta, apothem: width / (2 * Math.tan(Math.PI / n)) }
}

/** 음수 · n 넘는 번호를 0 ~ n-1 로 */
export const wrapIndex = (i: number, n: number) => (n > 0 ? ((i % n) + n) % n : 0)

/* ── 소개 아래 로고 흐름 ── */

export type LogoProject = Project & { cover: ProjectImage }

/** 로고 표지가 있는 공개 프로젝트 (화면 캡처 · 소개 그림 표지는 프로젝트 줄에서 이미 보인다) */
export function logoProjects(list: readonly Project[]): LogoProject[] {
  return list.filter((p): p is LogoProject => isPublicProject(p) && p.cover?.kind === 'logo' && isShownImage(p.cover))
}
