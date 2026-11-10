/**
 * 장소 이름표(호실 안내판) 계산. events.json 의 venue 는 '건물 + 호실' 한 줄이다 (docs/CONTENT.md).
 * venue.test.ts 에 테스트.
 */

export interface Venue {
  /** '정보문화관' · '건국대 공학관' · '홍익대' */
  building: string
  /** 'P301' · '4142' · 'PBL실'. 건물만 적힌 장소는 비운다 */
  room?: string
}

/**
 * '정보문화관 P301' → { building: '정보문화관', room: 'P301' }.
 * 마지막 낱말에 숫자가 있거나 '…실' 로 끝나면 호실로 본다. 아니면 전체가 건물 이름이다 ('동국대 신공학관').
 */
export function splitVenue(venue: string): Venue {
  const parts = venue.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return { building: parts.join(' ') }
  const last = parts[parts.length - 1]
  if (/\d/.test(last) || /실$/.test(last)) return { building: parts.slice(0, -1).join(' '), room: last }
  return { building: parts.join(' ') }
}

/** 호실이 영문 · 숫자 번호면 숫자 글꼴로 크게 쓴다 ('P301', '4142'). '미래융합세미나실' 은 한글 그대로 */
export const isRoomCode = (room: string) => /^[A-Z]?\d{2,5}[A-Z]?$/.test(room)
