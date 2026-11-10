import { useEffect, useState } from 'react'
import { kstToday } from '@/lib/date'

/** 한국 날짜. 자정을 넘기면 알아서 바뀐다 (1분마다 확인) */
export function useToday(): string {
  const [today, setToday] = useState(kstToday)
  useEffect(() => {
    const id = window.setInterval(() => setToday(kstToday()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return today
}
