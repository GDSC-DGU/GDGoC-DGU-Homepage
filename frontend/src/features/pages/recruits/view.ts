import { applyTarget, type RecruitStatus } from '@/content/recruitingStatus'

/**
 * 지원하기 페이지가 '모집 중' 화면인지 (recruits.test.ts · apply.test.ts 에 테스트).
 *  - form: 사이트 안 지원서가 첫 화면 아래(#apply)에 열리고, '지원하기' 버튼이 켜진다
 *  - closed: 지원서 없이 '지원하기' 버튼이 꺼진다 (모집 전 · 마감 · 지원서 API 전)
 *    바깥 지원서(applyUrl)로 모집 중이면 '지원하기'가 그 주소(새 창)로 간다
 * 개발 화면(config/site.ts SHOW_PLAN: npm run dev)에서는 화면 아래 '개발' 버튼(DevSwitch)으로 ?preview=open · closed 를 오간다.
 */
export type ApplyView = 'form' | 'closed'

export type Preview = 'open' | 'closed' | null

export const readPreview = (v: string | null, allowed: boolean): Preview => (allowed && (v === 'open' || v === 'closed') ? v : null)

export function applyView(st: Pick<RecruitStatus, 'state' | 'applyUrl'>, preview: Preview, live?: boolean): ApplyView {
  if (preview === 'open') return 'form'
  if (preview === 'closed') return 'closed'
  const target = applyTarget(st, live)
  return target && !target.external ? 'form' : 'closed'
}
