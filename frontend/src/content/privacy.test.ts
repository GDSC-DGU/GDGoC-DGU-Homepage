import { describe, expect, it } from 'vitest'
import { CHAPTER } from '@/content'
import { koreanDate, PRIVACY_EFFECTIVE_DATE, PRIVACY_INTRO, PRIVACY_OFFICER, PRIVACY_PROCESSOR_SUMMARY, PRIVACY_PROCESSORS, PRIVACY_SECTIONS, type PolicyBlock } from './privacy'

const textOf = (b: PolicyBlock): string[] => (b.kind === 'p' ? [b.text] : b.kind === 'list' ? [...b.items] : [b.caption, ...b.head, ...b.rows.flat()])
const allText = [PRIVACY_INTRO, ...PRIVACY_SECTIONS.flatMap((s) => [s.title, ...s.blocks.flatMap(textOf)])]

describe('개인정보 처리방침 (F-COM-005)', () => {
  it('시행일은 2026년 12월 29일이고, 마지막 조항이 같은 날을 말한다', () => {
    expect(PRIVACY_EFFECTIVE_DATE).toBe('2026-12-29')
    expect(koreanDate(PRIVACY_EFFECTIVE_DATE)).toBe('2026년 12월 29일')
    expect(allText.some((t) => t.includes('2026년 12월 29일부터 적용'))).toBe(true)
  })

  it('작성지침의 필수 조항이 모두 있다', () => {
    const titles = PRIVACY_SECTIONS.map((s) => s.title)
    for (const t of ['처리 목적', '처리하는 개인정보 항목', '보유 기간', '파기', '제3자 제공', '위탁', '국외 이전', '정보주체의 권리', '안전성 확보', '자동으로 개인정보를 수집하는 장치', '보호책임자', '권익침해 구제', '변경']) {
      expect(titles.some((x) => x.includes(t)), t).toBe(true)
    }
  })

  it('조항 id 가 겹치지 않는다 (목차 링크)', () => {
    const ids = PRIVACY_SECTIONS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('보호책임자 연락처는 동아리 대표 이메일이다', () => {
    expect(PRIVACY_OFFICER.name).toBe('이도윤')
    expect(PRIVACY_OFFICER.email).toBe(CHAPTER.email)
    expect(allText.some((t) => t.includes(CHAPTER.email))).toBe(true)
  })

  it('처리 위탁: Google Cloud · Gemini · Gmail · Vercel', () => {
    expect(PRIVACY_PROCESSORS.map((p) => p.service)).toEqual(['Google Cloud', 'Gemini', 'Gmail', 'Vercel'])
    expect(PRIVACY_PROCESSOR_SUMMARY).toBe('Google LLC (Google Cloud · Gemini · Gmail), Vercel Inc. (Vercel)')
  })

  it('명세의 보유 기간과 같다 (지원서 제출 후 1년 · 회원 비활성화 후 1년)', () => {
    const t = allText.join('\n')
    for (const s of ['제출일로부터 1년', '비활성화) 뒤 1년']) expect(t, s).toContain(s)
  })

  it('내부 구현(토큰 · 해시 · 쿠키 종류 · 실행 시각)은 적지 않는다', () => {
    const t = allText.join('\n')
    for (const s of ['HttpOnly', '해시', '토큰', '오전 3시', 'PIN']) expect(t, s).not.toContain(s)
  })

  it('AI 에는 이름 · 학번 · 학과 · 이메일을 보내지 않는다고 적는다 (F-RCT-004 규칙 2)', () => {
    expect(allText.join('\n')).toContain('이름 · 학번 · 학과 · 이메일은 AI에 보내지 않습니다')
  })

  it('AI 에 보낸 응답은 학습 · 개선에 쓰이지 않는다고 적는다 (Gemini 유료)', () => {
    const ai = (PRIVACY_SECTIONS.find((sec) => sec.id === 'ai')?.blocks ?? []).flatMap(textOf).join('\n')
    expect(ai).toContain('AI 학습이나 서비스 개선에 쓰이지 않습니다')
  })

  it('글자는 모두 NFC', () => {
    for (const t of allText) expect(t.normalize('NFC')).toBe(t)
  })
})
