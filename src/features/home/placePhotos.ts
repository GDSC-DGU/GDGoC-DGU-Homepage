import { PHOTOS } from '@/content'
import type { PlaceId } from '@/domain/types'

/**
 * 지도 미리보기 맨 위 행사 사진 세 장 (4기 Organizer 2026-11-06: 글만 있는 미리보기가 비어 보인다 → 드라이브 활동 사진).
 * 첫 장이 크게. content/photos.json 의 id 만 쓴다 (없는 id 는 건너뛴다). 지금은 모두 1기(2023~24) 사진이다.
 */
const PICK: Readonly<Record<PlaceId, readonly string[]>> = {
  community: ['2023-09-15-welcome-group', '2023-11-24-part-seminar', '2023-12-22-closing-room'],
  projects: ['2024-05-16-open-seminar-talk', '2023-12-01-camping-seminar-5', '2023-10-06-camping-seminar-2-talk'],
  teams: ['2023-12-22-closing-teams', '2023-09-15-welcome-room', '2023-12-22-closing-sharing'],
  recruits: ['2024-05-16-open-seminar-group', '2023-09-22-camping-seminar-1', '2023-12-01-camping-seminar-5-hall'],
  about: ['2023-12-22-closing-group', '2023-10-06-camping-seminar-2', '2024-05-16-open-seminar-group'],
}

export const placePhotos = (id: PlaceId) => (PICK[id] ?? []).map((pid) => PHOTOS.find((p) => p.id === pid)).filter((p): p is (typeof PHOTOS)[number] => Boolean(p))
