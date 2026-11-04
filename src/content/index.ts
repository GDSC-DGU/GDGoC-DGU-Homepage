import { adaptList, toScheduleEvent } from '@/data/http/adapters'
import type { Faq, Generation, Project, ScheduleEvent, Seminar } from '@/domain/types'
import chapterJson from './chapter.json'
import eventsJson from './events.json'
import faqJson from './faq.json'
import generationsJson from './generations.json'
import projectsJson from './projects.json'
import recruitingJson from './recruiting.json'
import seminarsJson from './seminars.json'
import { checkEvents, checkFaqs, checkGenerations, checkProjects, checkSeminars, type ContentIssue } from './validate'

/**
 * 사이트 콘텐츠 (JSON 스냅샷).
 * 운영진은 이 폴더의 JSON 만 고치면 된다. 화면 코드는 여기서 꺼내 쓴다. 고치는 법: docs/CONTENT.md
 * 모양이 틀린 줄은 화면에서 빠지고 CONTENT_ISSUES 에 남는다. content.test.ts 가 이를 잡는다 (npm test).
 */
export const CONTENT_UPDATED_AT = eventsJson.updatedAt

const projects = checkProjects(projectsJson.projects)
const generations = checkGenerations(generationsJson.generations)
const faqs = checkFaqs(faqJson.faqs)
const seminars = checkSeminars(seminarsJson.seminars)

export const EVENTS: ScheduleEvent[] = adaptList(eventsJson.events, toScheduleEvent)
export const PROJECTS: Project[] = projects.items
export const GENERATIONS: Generation[] = generations.items
export const FAQS: Faq[] = faqs.items
/** 세미나 발표 기록 (오래된 순) */
export const SEMINARS: Seminar[] = seminars.items
export const SEMINARS_UPDATED_AT = seminarsJson.updatedAt
export const CHAPTER = chapterJson

/** 공개 프로젝트를 세는 기준 조직 ('https://github.com/GDSC-DGU' → 'GDSC-DGU') */
const PUBLIC_ORG = chapterJson.github.replace(/\/+$/, '').split('/').pop() ?? 'GDSC-DGU'
const PUBLIC_REPO_PREFIX = `https://github.com/${PUBLIC_ORG}/`.toLowerCase()

/** 챕터 GitHub 조직(GDSC-DGU)에 저장소가 있는 프로젝트인지. 개인 저장소 · 주소 없는 진행 중 프로젝트는 아니다 */
export const isPublicProject = (p: Pick<Project, 'repo'>): boolean => Boolean(p.repo?.toLowerCase().startsWith(PUBLIC_REPO_PREFIX))

/** '공개 프로젝트' 숫자는 이 목록으로 센다 (진행 중인 홈페이지 리뉴얼처럼 공개 저장소가 없는 줄은 빠진다) */
export const PUBLIC_PROJECTS: Project[] = PROJECTS.filter(isPublicProject)

/** 공개 프로젝트 숫자 옆에 붙이는 기준 */
/** 화면에 쓰는 기준 줄. 조직 이름(GDSC-DGU)은 지금 쓰지 않는 이름이라 보이지 않는다 */
export const projectsBasis = 'GitHub 공개 저장소 기준'

/** 모집 상태와 지난 모집 기록 */
export const RECRUITING = recruitingJson

/** JSON 에서 틀린 곳. 비어 있어야 정상이다 */
export const CONTENT_ISSUES: readonly ContentIssue[] = [...checkEvents(eventsJson.events), ...projects.issues, ...generations.issues, ...faqs.issues, ...seminars.issues]

if (import.meta.env?.DEV && CONTENT_ISSUES.length > 0) {
  console.warn('[content] JSON 에 틀린 곳이 있습니다. npm test 로 자세히 보세요.', CONTENT_ISSUES)
}
