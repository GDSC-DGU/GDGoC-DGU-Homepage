import { useEffect, useState } from 'react'

/** 웹 글꼴을 다 받았는지. 글자 폭을 다시 재야 할 때 쓴다 */
export function useFontsReady(): boolean {
  const [ready, setReady] = useState(() => typeof document !== 'undefined' && document.fonts?.status === 'loaded')
  useEffect(() => {
    if (ready || !document.fonts) return
    let alive = true
    document.fonts.ready.then(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [ready])
  return ready
}
