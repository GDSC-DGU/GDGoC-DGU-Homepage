import { describe, expect, it } from 'vitest'
import { canStagger, STAGGER_MAX_STEPS, staggerStep } from './useStaggerReveal'

const STAGGER_MS = 40 // tokens.css --stagger
const ENTER_MS = 220 // tokens.css --dur-short (투명도 · 이동 모두)

describe('순차 등장 늦춤', () => {
  it('칸마다 한 단계씩 늦추고, 음수는 0', () => {
    expect([0, 1, 2, 3].map(staggerStep)).toEqual([0, 1, 2, 3])
    expect(staggerStep(-2)).toBe(0)
  })

  it('칸이 많아도 다 나타나기까지 0.5초를 넘지 않는다 (hallmark craft 5)', () => {
    expect(staggerStep(30)).toBe(STAGGER_MAX_STEPS)
    expect(STAGGER_MAX_STEPS * STAGGER_MS + ENTER_MS).toBeLessThanOrEqual(500)
  })
})

describe('숨겨도 되는지 (처음부터 보이는 것이 기본)', () => {
  const base = { reducedMotion: false, hasObserver: true, inView: false }

  it('화면 아래에 있고, 움직임을 줄이지 않았고, 관찰기가 있을 때만 숨긴다', () => {
    expect(canStagger(base)).toBe(true)
  })

  it('동작 줄이기면 숨기지 않는다', () => {
    expect(canStagger({ ...base, reducedMotion: true })).toBe(false)
  })

  it('IntersectionObserver 가 없으면 숨기지 않는다 (다시 꺼낼 방법이 없다)', () => {
    expect(canStagger({ ...base, hasObserver: false })).toBe(false)
  })

  it('처음 그릴 때 이미 화면 안이면 숨기지 않는다 (보이던 것이 깜빡이지 않게)', () => {
    expect(canStagger({ ...base, inView: true })).toBe(false)
  })
})
