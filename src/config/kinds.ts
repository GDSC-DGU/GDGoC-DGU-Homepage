import type { EventKind } from '@/domain/types'

/** 일정 종류 이름 (화면 표기) */
export const KIND_LABEL: Record<EventKind, string> = {
  session: '세션',
  event: '행사',
  sprint: 'G-Sprint',
  project: '프로젝트',
  recruit: '모집, OT',
  notice: '공지',
  rest: '휴회',
}
