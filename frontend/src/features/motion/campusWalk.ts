/**
 * 스크롤 이야기의 '캠퍼스로 걸어 들어가기' 진행 상황을 지도 그림(SVG 든 3D 든)에 알리는 작은 창구.
 * GSAP 를 부르지 않는 가벼운 파일이라, 3D 지도가 이야기 코드(homeStory)를 받지 않고도 구독할 수 있다.
 */
export interface CampusWalk {
  /** 0 = 첫 화면 자리, 1 = 프로젝트 건물에 도착 (부드럽게 한 값) */
  e: number
  /** 건물을 데려다 놓을 자리 (지도 틀 기준 px) */
  tx: number
  ty: number
  /** 도착 배율 (넓은 화면 1.9, 좁은 화면 2.25) */
  k: number
}

let state: CampusWalk = { e: 0, tx: 0, ty: 0, k: 1 }
const subs = new Set<(w: CampusWalk) => void>()

export const campusWalk = {
  get: (): CampusWalk => state,
  set(next: CampusWalk) {
    state = next
    for (const f of subs) f(state)
  },
  subscribe(f: (w: CampusWalk) => void): () => void {
    subs.add(f)
    return () => {
      subs.delete(f)
    }
  },
}
