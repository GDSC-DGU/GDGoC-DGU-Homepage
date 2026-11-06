import { useState } from 'react'

/**
 * key 가 처음 값에서 한 번이라도 바뀌었으면 true.
 * 탭 패널 페이드(.fade-in)를 '바꿨을 때'만 걸 때 쓴다: 페이지를 처음 열 때는 움직이지 않는다.
 */
export function useChanged(key: unknown): boolean {
  const [initial] = useState(key)
  const [changed, setChanged] = useState(false)
  if (!changed && !Object.is(key, initial)) setChanged(true) // 그리는 동안 고친다 (effect 를 한 번 더 돌지 않게)
  return changed
}
