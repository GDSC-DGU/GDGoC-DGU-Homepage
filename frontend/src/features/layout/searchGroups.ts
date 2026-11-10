import type { PlaceId, SearchHit } from '@/domain/types'

/**
 * 검색 결과를 장소별로 묶는다 (DOM 없음, searchGroups.test.ts).
 * 묶음 순서는 '가장 잘 맞는 결과가 있는 장소'부터, 묶음 안은 점수 순서 그대로.
 * 결과가 수십 건이어도 창이 길어지지 않게 전체 · 장소별 개수를 자른다.
 */
export interface HitGroup {
  place: PlaceId
  hits: SearchHit[]
  /** 잘려서 보이지 않는 건수 */
  more: number
}

export function groupHits(hits: readonly SearchHit[], { total = 12, perPlace = 5 } = {}): HitGroup[] {
  const groups = new Map<PlaceId, HitGroup>()
  let shown = 0
  for (const hit of hits) {
    const place = hit.doc.place
    const g = groups.get(place) ?? { place, hits: [], more: 0 }
    groups.set(place, g)
    if (shown < total && g.hits.length < perPlace) {
      g.hits.push(hit)
      shown += 1
    } else {
      g.more += 1
    }
  }
  return [...groups.values()].filter((g) => g.hits.length > 0)
}

/** 장소별 건수 (지도 이름표에 띄울 숫자) */
export function countByPlace(hits: readonly SearchHit[]): Partial<Record<PlaceId, number>> {
  const out: Partial<Record<PlaceId, number>> = {}
  for (const h of hits) out[h.doc.place] = (out[h.doc.place] ?? 0) + 1
  return out
}
