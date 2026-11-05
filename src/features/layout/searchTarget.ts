import { PLACE_BY_ID } from '@/config/places'
import { EVENTS } from '@/content'
import type { ScheduleEvent, SearchHit } from '@/domain/types'
import { seminarHref } from '@/features/pages/archive/seminars'

/**
 * 검색 결과 id → 그 항목이 바로 보이는 주소 (QA 2026-11-05: 장소 페이지 맨 위로만 가던 것을 고침).
 * - 'project-<id>' → 아카이브 자세히 보기 창
 * - 'seminar-<id>' → 아카이브 세미나의 그 기수 탭에서 그 제목으로 찾은 화면 (기수는 meta '2025.04.03 · 2기 · 발표자' 에서)
 * - 'faq-<id>' → 지원 안내의 그 질문 (답이 펼쳐진다)
 * - 'event-<id>' → 소개: 다가오는 일정이면 #upcoming, 지난 행사면 그 기수의 기수별 기록
 */
export function targetOf(doc: Pick<SearchHit['doc'], 'id' | 'title' | 'meta'>, today: string, events: readonly Pick<ScheduleEvent, 'id' | 'date' | 'endDate' | 'generation'>[] = EVENTS): string | undefined {
  const archive = PLACE_BY_ID.projects.path
  if (doc.id.startsWith('project-')) return `${archive}?p=${encodeURIComponent(doc.id.slice('project-'.length))}`
  if (doc.id.startsWith('seminar-')) {
    const gen = Number(doc.meta?.match(/(?:^| )(\d+)기(?: |$)/)?.[1])
    return gen ? seminarHref({ generation: gen, title: doc.title }) : `${archive}?view=seminars#archive-views`
  }
  if (doc.id.startsWith('faq-')) return `${PLACE_BY_ID.recruits.path}#faq-${doc.id.slice('faq-'.length)}`
  if (doc.id.startsWith('event-')) {
    const about = PLACE_BY_ID.community.path
    const e = events.find((x) => `event-${x.id}` === doc.id)
    if (!e) return about
    if ((e.endDate ?? e.date) >= today) return `${about}#upcoming`
    return e.generation ? `${about}?gen=${e.generation}#records` : `${about}#records`
  }
  return undefined
}
