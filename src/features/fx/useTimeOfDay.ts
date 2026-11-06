import { useEffect, useState } from 'react'

export type TimeOfDay = 'day' | 'night'

/** 한국 시간 몇 시인지 (0~23) */
function kstHour(d = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Seoul' }).format(d))
}

/** 19시부터 다음 날 6시 전까지 밤. ?tod=night|day 로 고정해 볼 수 있다 (확인용). 1분마다 다시 본다 */
export function useTimeOfDay(): TimeOfDay {
  const pick = (): TimeOfDay => {
    const forced = new URLSearchParams(window.location.search).get('tod')
    if (forced === 'night' || forced === 'day') return forced
    const h = kstHour()
    return h >= 19 || h < 6 ? 'night' : 'day'
  }
  const [tod, setTod] = useState<TimeOfDay>(pick)
  useEffect(() => {
    const id = window.setInterval(() => setTod(pick()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return tod
}
