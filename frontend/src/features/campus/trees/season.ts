import { useState } from 'react'
import { kstToday } from '@/lib/date'

/**
 * 계절: 한국 날짜로 정한다 (서울 캠퍼스 나무 기준, 대략).
 * - 봄 3.20–4.30: 벚꽃 · 연둣빛 새잎
 * - 여름 5.1–10.19: 짙은 초록
 * - 가을 10.20–11.30: 은행 노랑 · 느티 주황 · 벚 빨강
 * - 겨울 12.1–3.19: 잎 진 가지, 소나무에 눈
 * 주소 뒤 ?season=spring|summer|autumn|winter 로 고정해 볼 수 있다 (확인용).
 */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter']

export function seasonOf(ymd: string): Season {
  const md = Number(ymd.slice(5, 7)) * 100 + Number(ymd.slice(8, 10))
  if (md >= 1201 || md < 320) return 'winter'
  if (md < 501) return 'spring'
  if (md < 1020) return 'summer'
  return 'autumn'
}

/** 지금 계절 (?season 이 있으면 그 값) */
export function currentSeason(search: string = typeof window === 'undefined' ? '' : window.location.search, today: string = kstToday()): Season {
  const forced = new URLSearchParams(search).get('season')
  return SEASONS.includes(forced as Season) ? (forced as Season) : seasonOf(today)
}

/** 장면을 처음 그릴 때 한 번 정한다 (계절은 하루에 바뀌지 않으니 다시 보지 않는다) */
export function useSeason(): Season {
  const [season] = useState(() => currentSeason())
  return season
}
