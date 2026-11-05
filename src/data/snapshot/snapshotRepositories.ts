import { KIND_LABEL } from '@/config/kinds'
import { CHAPTER, EVENTS, FAQS, PROJECTS, RECRUITING, SEMINARS } from '@/content'
import type { PreviewPlace, Repositories } from '@/data/repositories'
import { REVIEWS, TEAMS_STATUS } from '@/data/mock/fixtures'
import type { ArchiveDoc, Faq, PreviewItem, Project, ScheduleEvent, Seminar } from '@/domain/types'
import { kstToday } from '@/lib/date'
import { withoutStalePlans } from '@/content/plan'
import { PROTOTYPE } from '@/config/site'
import { createSampleSeed } from '@/features/teams/data/sampleSeed'
import { createKeywordSearch } from '@/services/search/keywordSearch'
import { expandKeywords } from '@/services/search/synonyms'

const dotDate = (ymd: string) => ymd.replaceAll('-', '.')

function eventDateLabel(e: Pick<ScheduleEvent, 'date' | 'endDate'>): string {
  if (!e.endDate || e.endDate === e.date) return dotDate(e.date)
  return `${dotDate(e.date)}–${e.endDate.slice(0, 4) === e.date.slice(0, 4) ? dotDate(e.endDate.slice(5)) : dotDate(e.endDate)}`
}

/** 검색 대상: 행사 · 프로젝트 · 자주 묻는 질문. id 는 'event-' · 'project-' · 'faq-' 로 나눠 겹치지 않게 한다 */
export function buildArchive(
  events: readonly ScheduleEvent[] = EVENTS,
  projects: readonly Project[] = PROJECTS,
  faqs: readonly Faq[] = FAQS,
  seminars: readonly Seminar[] = SEMINARS,
): ArchiveDoc[] {
  const eventDocs = events
    .filter((e) => e.kind !== 'rest')
    .map(
      (e): ArchiveDoc => ({
        id: `event-${e.id}`,
        place: e.place,
        title: e.title,
        meta: [eventDateLabel(e), e.generation ? `${e.generation}기` : '', e.venue ?? ''].filter(Boolean).join(' · '),
        keywords: expandKeywords(e.title, e.originalTitle, e.series, KIND_LABEL[e.kind], e.venue, e.generation ? `${e.generation}기` : '', e.date.slice(0, 4)),
      }),
    )
  // 자세히 보기 창이 열리는 완성 프로젝트만 (진행 중인 줄은 아카이브에 보이지 않는다: QA 2026-11-05)
  const projectDocs = projects.filter((p) => p.status === 'done').map(
    (p): ArchiveDoc => ({
      id: `project-${p.id}`,
      place: 'projects',
      title: p.name,
      meta: [p.program, p.program.includes(String(p.year)) ? '' : String(p.year), p.generation ? `${p.generation}기` : '', p.status === 'in-progress' ? '진행 중' : '']
        .filter(Boolean)
        .join(' · '),
      keywords: expandKeywords(p.name, p.summary, p.program, ...(p.stack ?? []), String(p.year), p.generation ? `${p.generation}기` : '', '프로젝트 project'),
    }),
  )
  const faqDocs = faqs.map(
    (f): ArchiveDoc => ({
      id: `faq-${f.id}`,
      place: 'recruits',
      title: f.q,
      meta: '자주 묻는 질문',
      keywords: expandKeywords(f.a, '질문 faq 지원 안내'),
    }),
  )
  // 세미나 발표: 제목 · 발표자 · 기수로 찾는다 (아카이브 '세미나'로 이어진다)
  const seminarDocs = seminars.map(
    (s): ArchiveDoc => ({
      id: `seminar-${s.id}`,
      place: 'projects',
      title: s.title,
      meta: [s.date.replaceAll('-', '.'), `${s.generation}기`, s.speaker].filter(Boolean).join(' · '),
      keywords: expandKeywords(s.title, s.speaker, `${s.generation}기`, s.date.slice(0, 4), '세미나 발표 자료 seminar'),
    }),
  )
  return [...eventDocs, ...projectDocs, ...seminarDocs, ...faqDocs]
}

/** 커뮤니티: 가장 가까운 다음 일정 하나 → 최근 지난 행사. 모자라면 다음 일정을 더 채운다. 휴회는 뺀다 */
export function communityPreview(events: readonly ScheduleEvent[], today: string, limit: number): PreviewItem[] {
  // 날짜가 지났는데 계획으로만 남은 일정(열렸는지 확인되지 않음)은 지난 기록으로 보이지 않게 뺀다 (커뮤니티 페이지와 같은 규칙)
  const list = withoutStalePlans(events, today).filter((e) => e.place === 'community' && e.kind !== 'rest')
  const upcoming = list.filter((e) => (e.endDate ?? e.date) >= today).sort((a, b) => a.date.localeCompare(b.date))
  const past = list.filter((e) => (e.endDate ?? e.date) < today).sort((a, b) => b.date.localeCompare(a.date))
  const picked = [...upcoming.slice(0, 1), ...past, ...upcoming.slice(1)].slice(0, limit)
  return picked.map((e): PreviewItem => {
    const tag = KIND_LABEL[e.kind]
    return { id: e.id, title: e.title, date: e.date, ...(tag ? { tag } : {}) }
  })
}

/** 프로젝트: 진행 중 → 최근 끝난 프로젝트(해가 늦은 순, 같은 해면 설명이 있는 것 먼저). 프로젝트가 없으면 G-Sprint 일정으로 채운다 */
export function projectsPreview(projects: readonly Project[], events: readonly ScheduleEvent[], today: string, limit: number): PreviewItem[] {
  if (projects.length > 0) {
    const inProgress = projects.filter((p) => p.status === 'in-progress')
    const done = projects.filter((p) => p.status === 'done').sort((a, b) => b.year - a.year || Number(Boolean(b.summary)) - Number(Boolean(a.summary)))
    return [...inProgress, ...done].slice(0, limit).map(
      (p): PreviewItem => ({
        id: p.id,
        title: p.name,
        label: p.status === 'in-progress' ? '진행 중' : String(p.year),
        tag: p.program,
      }),
    )
  }
  const sprint = events.filter((e) => e.kind === 'sprint')
  const upcoming = sprint.filter((e) => (e.endDate ?? e.date) >= today).sort((a, b) => a.date.localeCompare(b.date))
  const past = sprint.filter((e) => (e.endDate ?? e.date) < today).sort((a, b) => b.date.localeCompare(a.date))
  return [...upcoming, ...past].slice(0, limit).map((e): PreviewItem => ({ id: e.id, title: e.title, date: e.date, tag: 'G-Sprint' }))
}

interface RecruitingData {
  current: { generation: number; status: string; message?: string }
  history: Array<{ generation: number; steps: Array<{ id: string; label: string; start: string; end?: string }> }>
}

/** 지원 안내: 지금 모집 상태 한 줄 → 가장 최근 기수의 모집 단계 (일어난 순서대로) */
export function recruitsPreview(data: RecruitingData, limit: number): PreviewItem[] {
  const { current } = data
  const open = current.status === 'open'
  const items: PreviewItem[] = [{ id: `r-${current.generation}th`, label: open ? '모집 중' : '공지 예정', title: `${current.generation}기 모집 일정`, tag: '모집' }]
  const last = [...data.history].sort((a, b) => b.generation - a.generation)[0]
  if (last) {
    for (const step of [...last.steps].sort((a, b) => a.start.localeCompare(b.start))) {
      items.push({ id: `r-${last.generation}-${step.id}`, date: step.start, title: `${last.generation}기 ${step.label.replace(new RegExp(`^${last.generation}기\\s*`), '')}`, tag: '지난 모집' })
    }
  }
  return items.slice(0, limit)
}

export interface SnapshotOptions {
  /** 오늘 날짜 (한국 시간 'YYYY-MM-DD'). 테스트에서 날짜를 고정할 때 넣는다 */
  today?: () => string
}

/**
 * 공개 페이지용 구현: 저장소에 들어 있는 JSON 스냅샷(src/content)을 읽는다.
 * 서버가 꺼져 있어도 사이트가 보이게 하는 기본값이다. 서버 API 는 http 구현이 맡는다.
 * 팀원 모집(teams) 게시판은 아직 열지 않아서, 지어낸 글 대신 날짜 없는 상태 줄(TEAMS_STATUS)을 보여 준다.
 * 프로토타입 보기(config/site.ts PROTOTYPE)에서는 게시판과 같은 프로토타입 글의 최근 몇 개를 보여 준다.
 */
function teamsPreview(today: string, limit: number): PreviewItem[] {
  if (!PROTOTYPE) return TEAMS_STATUS.slice(0, limit).map((p) => ({ ...p }))
  return createSampleSeed(today, Date.now())
    .posts.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    // 게시판과 같은 예시 글이라 줄마다 '예시' 표시를 단다 (지도 미리보기에서 실제 모집 글로 읽히지 않게: 문구 검토 2026-11-05)
    .map((p) => ({ id: p.id, title: p.title, date: kstToday(new Date(p.createdAt)), tag: p.category, sample: true }))
}

export function createSnapshotRepositories({ today = () => kstToday() }: SnapshotOptions = {}): Repositories {
  const previews: Record<PreviewPlace, (limit: number) => PreviewItem[]> = {
    community: (limit) => communityPreview(EVENTS, today(), limit),
    projects: (limit) => projectsPreview(PROJECTS, EVENTS, today(), limit),
    recruits: (limit) => recruitsPreview(RECRUITING, limit),
    teams: (limit) => teamsPreview(today(), limit),
  }
  return {
    schedule: { list: async () => EVENTS.map((e) => ({ ...e })) },
    projects: { list: async () => PROJECTS.map((p) => ({ ...p, ...(p.stack ? { stack: [...p.stack] } : {}) })) },
    seminars: { list: async () => SEMINARS.map((s) => ({ ...s })) },
    stats: {
      list: async () => [
        {
          id: 'members',
          label: '그룹 멤버',
          value: CHAPTER.members.value,
          note: `gdg.community.dev 기준 ${CHAPTER.members.asOf.slice(0, 7).replace('-', '.')}`,
          source: CHAPTER.members.source,
        },
      ],
    },
    previews: { latest: async (place, limit) => previews[place](limit) },
    reviews: { list: async () => REVIEWS.map((r) => ({ ...r })) },
    search: createKeywordSearch(buildArchive()),
  }
}
