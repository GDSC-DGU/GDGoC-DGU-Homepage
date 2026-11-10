import type { ReactNode } from 'react'
import { FAQS } from '@/content'

/** 판 하나: 작은 이름 → 값 → 한 줄 */
export interface Fact {
  id: string
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
}

const faq = (id: string) => FAQS.find((f) => f.id === id)

/**
 * 지원 자격: 세 판 (학적 · 전공과 학년 · 정기 모임). 지원 안내 페이지의 옅은 회색 이야기 섹션에 들어간다 (그리기: Intro.tsx Eligibility).
 * 값은 모두 4기 지원서 안내문에서 온 FAQ 답을 줄인 것이고, 그 FAQ 가 없어지면 판도 빠진다.
 * 기준(4기 지원서)은 섹션 머리 한 줄이, 출처 주소는 페이지 끝 출처 줄이 말한다.
 */
export function eligibilityFacts(): Fact[] {
  const who = faq('who')
  const when = faq('when-sessions')
  const facts: Fact[] = []
  if (who) {
    facts.push({ id: 'campus', label: '학적', value: '동국대 서울캠퍼스', sub: '재학생, 휴학생, 수료생' })
    facts.push({ id: 'major', label: '전공과 학년', value: '상관없음', sub: '비전공자, 1학년도 지원할 수 있습니다.' })
  }
  if (when) {
    facts.push({
      id: 'when',
      label: '정기 모임',
      value: (
        <>
          매주 화요일 <span className="num">18:00</span>
        </>
      ),
    })
  }
  return facts
}
