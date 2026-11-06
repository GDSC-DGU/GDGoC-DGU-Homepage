/**
 * 글자 다듬기 (화면과 상관없는 계산). text.test.ts 에 테스트.
 */

/** 보이지 않는 낱말 이음표 (U+2060): 이 자리에서는 줄을 바꾸지 않는다 */
export const WORD_JOINER = '⁠'

/**
 * 영문 하이픈 낱말('G-Sprint' · 'GDSC-DGU')이 하이픈에서 줄이 바뀌어 'G-' 만 줄 끝에 남지 않게,
 * 하이픈 뒤에 낱말 이음표를 넣는다. 화면에 그리는 글자에만 쓴다 (검색 · 주소 · 데이터에는 쓰지 않는다).
 * 숫자 기간('2026.08~09')은 하이픈이 아니라 대시라 그대로다.
 */
export function keepHyphenated(text: string): string {
  return text.replace(/([A-Za-z0-9])-(?=[A-Za-z])/g, `$1-${WORD_JOINER}`)
}
