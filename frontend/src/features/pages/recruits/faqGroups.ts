import type { Faq } from '@/domain/types'

/**
 * 자주 묻는 질문 두 묶음: 지원하기 전에 묻는 것 / 들어와서 하는 것.
 * faq.json 은 홈과 같이 쓰므로 묶음은 여기서 id 로 정한다. 여기 없는 새 질문은 '활동' 으로 간다.
 */
export type FaqGroupId = 'apply' | 'activity'

export const FAQ_GROUP_LABEL: Record<FaqGroupId, string> = {
  apply: '지원',
  activity: '활동',
}

const APPLY_IDS = new Set(['who', 'when-recruit', 'how-to-apply', 'designer', 'contact'])

/** 지원 묶음 안에서 먼저 보일 순서 (지원자가 가장 먼저 묻는 것부터). 나머지는 faq.json 순서 */
const APPLY_ORDER = ['when-recruit', 'who', 'designer', 'how-to-apply', 'contact']

export const faqGroupOf = (id: string): FaqGroupId => (APPLY_IDS.has(id) ? 'apply' : 'activity')

export function groupFaqs(faqs: readonly Faq[]): Record<FaqGroupId, Faq[]> {
  const apply = faqs.filter((f) => faqGroupOf(f.id) === 'apply')
  const rank = (id: string) => {
    const i = APPLY_ORDER.indexOf(id)
    return i === -1 ? APPLY_ORDER.length : i
  }
  return {
    apply: [...apply].sort((a, b) => rank(a.id) - rank(b.id)),
    activity: faqs.filter((f) => faqGroupOf(f.id) === 'activity'),
  }
}

/** '#faq-who' 처럼 질문 하나를 가리키는 주소면 그 질문 id */
export function faqIdFromHash(hash: string): string | null {
  const m = /^#faq-(.+)$/.exec(decodeURIComponent(hash))
  return m ? m[1] : null
}
