import { useEffect, useState } from 'react'

/** 지금 시각 (밀리초). '3분 전' 같은 경과 시간이 1분마다 바뀌게 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
