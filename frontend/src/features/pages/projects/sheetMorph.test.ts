import { describe, expect, it } from 'vitest'
import { canFlip, cssMs, flipFrom } from './sheetMorph'

describe('확대 전환 (View Transitions 가 없을 때의 FLIP)', () => {
  it('누른 작품의 왼쪽 위로 옮기고, 너비 비율로 고르게 줄인 데서 시작한다', () => {
    expect(flipFrom({ left: 100, top: 300, width: 280 }, { left: 160, top: 32, width: 1120 })).toBe('translate(-60px, 268px) scale(0.25)')
  })

  it('끝 상자 너비가 0 이면 줄이지 않는다', () => {
    expect(flipFrom({ left: 0, top: 0, width: 100 }, { left: 0, top: 0, width: 0 })).toBe('translate(0px, 0px) scale(1)')
  })

  it('시간 토큰은 ms 로 읽는다 (빌드가 420ms 를 .42s 로 줄여도)', () => {
    expect(cssMs('420ms', 0)).toBe(420)
    expect(cssMs(' .42s', 0)).toBe(420)
    expect(cssMs('', 300)).toBe(300)
    expect(cssMs('abc', 300)).toBe(300)
  })

  it('브라우저가 아닌 곳(테스트 · 서버)에서는 쓰지 않는다', () => {
    expect(canFlip()).toBe(false)
  })
})
