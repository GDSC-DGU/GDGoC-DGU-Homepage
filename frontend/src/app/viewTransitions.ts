import { resolvePath, type createBrowserRouter } from 'react-router-dom'
import { PLACES } from '@/config/places'
import type { PlaceId } from '@/domain/types'

type AppRouter = ReturnType<typeof createBrowserRouter>

/**
 * data-vt 를 지우는 시간. 새 페이지를 그리는 시간(느린 폰에서 1초 가까이) + 전환(약 300ms)보다 넉넉하게.
 * 다음 이동이 오면 그때 다시 정하므로 늦게 지워져도 문제없다 (일찍 지워지면 그 전환만 기본 페이드로 바뀐다)
 */
const CLEAR_AFTER_MS = 2500

/**
 * 좌우 밀기의 기준 순서 = 머리말에 보이는 왼쪽 → 오른쪽 순서
 * (홈 로고 · 소개 · 아카이브 · 팀원 찾기 · 지원 안내).
 * 오른쪽 메뉴로 가면 화면이 왼쪽으로 밀리고(forward), 왼쪽 메뉴로 가면 오른쪽으로 밀린다(back).
 */
export const SLIDE_ORDER: readonly PlaceId[] = ['about', 'community', 'projects', 'teams', 'recruits']

const isAdminPath = (path: string) => path === '/admin' || path.startsWith('/admin/')

/** '/projects' → 'projects', '/' → 'about'. 장소가 아닌 주소(/admin, 없는 주소)는 null */
export function placeOfPath(pathname: string): PlaceId | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return 'about'
  return PLACES.find((p) => p.path !== '/' && (path === p.path || path.startsWith(`${p.path}/`)))?.id ?? null
}

/**
 * 어떤 전환을 쓸지. 모든 메뉴 이동이 같은 규칙(좌우 밀기)을 따른다:
 * 머리말 순서에서 오른쪽으로 가면 'forward', 왼쪽으로 가면 'back', 장소가 아닌 주소가 끼면 'fade'.
 * 관리자 화면끼리(/admin/…)는 전환하지 않는다(null).
 * 주소 이름(pathname)이 같으면(?p= 로 자세히 보기 창만 여닫기 등) 전환하지 않는다(null).
 */
export function transitionKind(from: string, to: string): 'forward' | 'back' | 'fade' | null {
  const a = from.replace(/\/+$/, '') || '/'
  const b = to.replace(/\/+$/, '') || '/'
  if (a === b) return null
  // 관리자 화면 안에서는 전환 없이 바로 바꾼다 (도구 화면: 사이드바는 그대로, 본문만 즉시)
  if (isAdminPath(a) && isAdminPath(b)) return null
  const i = SLIDE_ORDER.indexOf(placeOfPath(a) as PlaceId)
  const j = SLIDE_ORDER.indexOf(placeOfPath(b) as PlaceId)
  if (i < 0 || j < 0 || i === j) return 'fade'
  return j > i ? 'forward' : 'back'
}

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 페이지를 옮길 때 View Transitions 를 켠다 (지원하지 않는 브라우저 · '동작 줄이기'는 그대로 바로 바뀐다).
 * - 모든 링크(Link · NavLink · navigate)가 router.navigate 를 거치므로 여기서 한 번에 켠다: 링크마다 viewTransition 을 달지 않아도 된다.
 *   링크가 viewTransition 을 직접 정했으면(true/false) 그 값을 따른다.
 * - 뒤로 · 앞으로 가기도 같은 규칙으로 방향을 정한다 (예: 프로젝트 → 뒤로 가기 → 홈 은 오른쪽으로 밀림).
 * - 방향은 <html data-vt="forward|back|fade"> 로 넘기고, 움직임은 styles/global.css 가 그린다. 머리말은 움직이지 않는다.
 */
export function enableViewTransitions(router: AppRouter) {
  if (typeof document === 'undefined' || typeof document.startViewTransition !== 'function') return
  const root = document.documentElement
  let timer = 0

  const mark = (from: string, to: string) => {
    const kind = transitionKind(from, to)
    if (!kind) return
    root.dataset.vt = kind
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      delete root.dataset.vt
    }, CLEAR_AFTER_MS)
  }

  // 새 상태를 그리기 직전(옛 화면이 아직 있을 때) 불린다: 전환이 켜진 이동만 표시한다
  router.subscribe((state, { viewTransitionOpts }) => {
    if (!viewTransitionOpts) return
    mark(viewTransitionOpts.currentLocation.pathname, state.location.pathname)
  })

  const navigate = router.navigate
  router.navigate = ((to: Parameters<AppRouter['navigate']>[0], opts?: Parameters<AppRouter['navigate']>[1]) => {
    if (typeof to === 'number') return navigate(to)
    if (opts?.viewTransition !== undefined || reduceMotion() || to === null) return navigate(to, opts)
    const from = router.state.location.pathname
    const next = resolvePath(to, from).pathname
    return navigate(to, next === from ? opts : { ...opts, viewTransition: true })
  }) as AppRouter['navigate']
}
