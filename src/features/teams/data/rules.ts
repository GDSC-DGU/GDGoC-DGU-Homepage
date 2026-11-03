import { daysUntil, isYmd } from '@/lib/date'
import { RECRUIT_STATUSES, SORTS, TEAMS_CATEGORIES, TEAM_PARTS, type Author, type Credentials, type ListQuery, type PostInput, type RecruitStatus, type SortId, type TeamPartId, type TeamsCategory, type Ymd } from './types'

/**
 * 팀원 찾기 규칙 (화면 · 예시 저장소가 같이 쓴다. 서버도 같은 규칙으로 막아야 한다).
 * 명세: P-TEM-001 · 002 · 003, P-COM-03. '미정'으로 적힌 값은 명세의 예시 값을 쓴다.
 */

/** 한 쪽에 10개 (F-TEM-001 1) */
export const PAGE_SIZE = 10
/** 첨부: PDF · JPG · PNG, 파일당 10MB, 최대 3개 (F-TEM-002 3, 미정 → 명세 예시 값) */
export const FILE_MAX = 3
export const FILE_MAX_BYTES = 10 * 1024 * 1024
export const FILE_TYPES: Readonly<Record<string, string>> = { 'application/pdf': 'PDF', 'image/jpeg': 'JPG', 'image/png': 'PNG' }
export const FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'
/** 글자 수 (명세 없음, 넉넉히) */
export const TITLE_MAX = 100
export const CONTENT_MAX = 5000
export const COMMENT_MAX = 1000
/** 모집 인원 고르기 (1 ~ 20명) */
export const HEADCOUNT_MAX = 20
/** 본인 확인 실패 제한: 5번 틀리면 15분, 그 뒤 다시 5번 틀리면 잠김 (F-TEM-002 2, P-COM-03 3) */
export const AUTH_TRIES = 5
export const AUTH_WAIT_MS = 15 * 60_000

export const isStudentId = (s: string) => /^\d{10}$/.test(s)
export const isPin = (s: string) => /^\d{4}$/.test(s)
export const credReady = (c: Credentials) => isStudentId(c.studentId) && isPin(c.pin)
export const EMPTY_CRED: Credentials = { studentId: '', pin: '' }
export const isCategory = (s: string | null): s is TeamsCategory => (TEAMS_CATEGORIES as readonly string[]).includes(s ?? '')
export const isStatus = (s: string | null): s is RecruitStatus => (RECRUIT_STATUSES as readonly string[]).includes(s ?? '')
export const isPart = (s: string | null): s is TeamPartId => TEAM_PARTS.some((p) => p.id === s)
export const partShort = (id: TeamPartId) => TEAM_PARTS.find((p) => p.id === id)?.short ?? id
export const isSort = (s: string | null): s is Exclude<SortId, 'latest'> => s !== 'latest' && SORTS.some((x) => x.id === s)

/** 모집 상태: 작성자가 마감했거나, 종료일이 지났으면(종료일 다음 날 0시) 마감 */
export function statusOf(endDate: Ymd, closedByAuthor: boolean, today: Ymd): RecruitStatus {
  return closedByAuthor || daysUntil(endDate, today) < 0 ? '마감' : '모집중'
}

/** '예시 멤버 01 · 4기' */
export const authorLabel = (a: Author) => `${a.name} · ${a.generation}기`

/** 연락 링크: http(s) 주소만 (javascript: 등은 받지 않는다) */
export function contactUrlError(s: string): string | null {
  if (!s.trim()) return null
  try {
    const u = new URL(s.trim())
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('protocol')
    if (!u.hostname.includes('.')) throw new Error('host')
    return null
  } catch {
    return 'https:// 로 시작하는 주소로 적어 주세요.'
  }
}

export type FieldErrors = Partial<Record<keyof PostInput | 'status', string>>

/** 글 입력 확인 (분류 · 제목 · 기간 · 내용 필수, 종료일 ≥ 시작일). 빈 객체면 통과 */
export function validatePost(input: PostInput): FieldErrors {
  const e: FieldErrors = {}
  if (!isCategory(input.category)) e.category = '분류를 골라 주세요.'
  const title = input.title.trim()
  if (!title) e.title = '제목을 적어 주세요.'
  else if (title.length > TITLE_MAX) e.title = `제목은 ${TITLE_MAX}자까지 적을 수 있습니다.`
  if (!isYmd(input.startDate) || !isYmd(input.endDate)) e.startDate = '모집 기간을 골라 주세요.'
  else if (daysUntil(input.endDate, input.startDate) < 0) e.startDate = '종료일은 시작일과 같거나 그 뒤여야 합니다.'
  const content = input.content.trim()
  if (!content) e.content = '내용을 적어 주세요.'
  else if (content.length > CONTENT_MAX) e.content = `내용은 ${CONTENT_MAX.toLocaleString()}자까지 적을 수 있습니다.`
  if (input.headcount !== null && (!Number.isInteger(input.headcount) || input.headcount < 1 || input.headcount > HEADCOUNT_MAX)) e.headcount = `1 ~ ${HEADCOUNT_MAX}명 중에서 골라 주세요.`
  if (input.parts.some((p) => !isPart(p))) e.parts = '파트를 다시 골라 주세요.'
  const urlError = input.contactUrl ? contactUrlError(input.contactUrl) : null
  if (urlError) e.contactUrl = urlError
  if (input.attachmentIds.length > FILE_MAX) e.attachmentIds = `첨부파일은 ${FILE_MAX}개까지 올릴 수 있습니다.`
  return e
}

/** 수정에서 '모집중'으로 되돌리기: 종료일이 오늘이거나 그 뒤여야 한다 (F-TEM-002 4) */
export function reopenError(endDate: Ymd, today: Ymd): string | null {
  return daysUntil(endDate, today) < 0 ? "'모집중'으로 되돌리려면 종료일이 오늘이거나 그 뒤여야 합니다." : null
}

/** 첨부파일 하나 확인 */
export function fileError(file: { name: string; type: string; size: number }): string | null {
  const type = file.type || guessType(file.name)
  if (!FILE_TYPES[type]) return `${file.name}: PDF · JPG · PNG 파일만 올릴 수 있습니다.`
  if (file.size > FILE_MAX_BYTES) return `${file.name}: 파일 하나는 10MB까지 올릴 수 있습니다.`
  return null
}

export function guessType(name: string): string {
  const ext = name.toLowerCase().split('.').pop()
  return ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ''
}

/** 1.2MB · 320KB */
export function sizeLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')}MB`
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}

/** '2026.10.14' (ISO 시각 · 날짜 모두 한국 날짜로) */
export function dotDate(isoOrYmd: string): string {
  const ymd = isYmd(isoOrYmd) ? isoOrYmd : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(isoOrYmd))
  return ymd.replaceAll('-', '.')
}

/** 모집 기간: '2026.10.14 ~ 10.31' (해가 다르면 '2026.12.20 ~ 2027.01.10') */
export function periodLabel(start: Ymd, end: Ymd): string {
  const a = dotDate(start)
  const b = dotDate(end)
  return start.slice(0, 4) === end.slice(0, 4) ? `${a} ~ ${b.slice(5)}` : `${a} ~ ${b}`
}

/** 목록 주소 ?cat=스터디&status=모집중&part=frontend&q=…&page=2 ↔ ListQuery (뒤로 가기 · 목록으로 돌아올 때 그대로) */
export function parseListParams(p: URLSearchParams): ListQuery {
  const cat = p.get('cat')
  const status = p.get('status')
  const part = p.get('part')
  const page = Number(p.get('page'))
  return {
    ...(isCategory(cat) ? { category: cat } : {}),
    ...(isStatus(status) ? { status } : {}),
    ...(isPart(part) ? { part } : {}),
    ...(p.get('q')?.trim() ? { q: p.get('q')!.trim() } : {}),
    ...(isSort(p.get('sort')) ? { sort: p.get('sort') as Exclude<SortId, 'latest'> } : {}),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  }
}

export function listSearch(q: ListQuery): string {
  const p = new URLSearchParams()
  if (q.category) p.set('cat', q.category)
  if (q.status) p.set('status', q.status)
  if (q.part) p.set('part', q.part)
  if (q.q) p.set('q', q.q)
  if (q.sort) p.set('sort', q.sort)
  if (q.page > 1) p.set('page', String(q.page))
  const s = p.toString()
  return s ? `?${s}` : ''
}

/** 쪽 번호 줄: 지금 쪽을 가운데 두고 최대 5개 */
export function pageWindow(page: number, pageCount: number, size = 5): number[] {
  const n = Math.min(size, pageCount)
  const start = Math.min(Math.max(1, page - Math.floor(n / 2)), Math.max(1, pageCount - n + 1))
  return Array.from({ length: n }, (_, i) => start + i)
}

/** 마감까지 남은 날: '오늘 마감' · 'D-3'. 마감된 글은 null */
export function deadlineLabel(endDate: Ymd, status: RecruitStatus, today: Ymd): string | null {
  if (status === '마감') return null
  const n = daysUntil(endDate, today)
  if (n < 0) return null
  return n === 0 ? '오늘 마감' : `D-${n}`
}

/** 마감 임박 (3일 안) */
export const closingSoon = (endDate: Ymd, status: RecruitStatus, today: Ymd) => status === '모집중' && daysUntil(endDate, today) >= 0 && daysUntil(endDate, today) <= 3

/** 새 글 (24시간 안) */
export const isNew = (createdAt: string, now: number) => now - Date.parse(createdAt) < 24 * 3_600_000

/** '방금 전' · '12분 전' · '3시간 전' · 어제 이전은 날짜 */
export function timeAgo(iso: string, now: number): string {
  const min = Math.floor((now - Date.parse(iso)) / 60_000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  if (min < 24 * 60) return `${Math.floor(min / 60)}시간 전`
  const d = dotDate(iso)
  const thisYear = dotDate(new Date(now).toISOString()).slice(0, 4)
  return d.startsWith(thisYear) ? d.slice(5) : d
}

/** 연락 링크 이름: 오픈채팅 · 디스코드 · 그 밖에는 주소 */
export function contactLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (host === 'open.kakao.com') return '카카오톡 오픈채팅'
    if (host === 'discord.gg' || host.endsWith('discord.com')) return '디스코드'
    if (host === 'forms.gle' || host === 'docs.google.com') return '구글 폼'
    return host
  } catch {
    return url
  }
}

/** '로' · '으로': 끝 글자에 받침이 있으면 '으로' (ㄹ 받침은 '로') */
export function withRo(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  if (code < 0 || code > 11171) return `${word}(으)로`
  const jong = code % 28
  return `${word}${jong === 0 || jong === 8 ? '로' : '으로'}`
}

/** 연락 버튼 글: '카카오톡 오픈채팅으로 연락하기' · '디스코드로 연락하기' · 모르는 주소는 '연락 링크 열기' */
export function contactAction(url: string): string {
  const label = contactLabel(url)
  return /[가-힣]$/.test(label) ? `${withRo(label)} 연락하기` : '연락 링크 열기'
}

/** 이름 동그라미 글자: 이름 뒤 두 글자 ('김민준' → '민준') */
export const initials = (name: string) => [...name].slice(-2).join('')
