/**
 * 홈 스크롤 이야기 (GSAP 3 + ScrollTrigger, 'Standard No Charge' 라이선스). HomePage 가 첫 그림 뒤에 나눠 불러온다.
 *
 * 1. 캠퍼스로 걸어 들어가기: 첫 화면을 내리면 지도는 천천히(배경), 프로젝트 섹션은 제 속도로 올라와 지도를 덮는다.
 *    그 사이 카메라가 빨간 프로젝트 건물로 다가가고(확대 + 가운데로), 나머지 건물 · 안내판은 회색으로 물러난다.
 *    도착하면 프로젝트 안내판이 먹색으로 뒤집혀 '지금 여기'. 이어 올라오는 섹션의 이름표도 같은 빨간 네모다.
 * 2. 큰 타일의 겹친 폰 화면은 데스크톱 화면보다 조금 빨리 움직인다.
 * (낱말 올라오기 · 낱말 켜짐 · 숫자 굴림은 쓰지 않는다: 템플릿 티, 중간에 멈추면 반쯤 회색, 굴러가는 중 실제와 다른 숫자)
 *
 * 지키는 것: 스크롤을 가로채지 않는다(고정 · 부드러운 스크롤 없음, 위치 바꾸기는 transform 만 → 앵커 · 키보드 그대로).
 * '동작 줄이기'가 켜지면(도중에 켜도) 모두 되돌린다 (gsap.matchMedia).
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { PLACE_PANEL_ID } from '@/config/ui'
import { campusWalk } from './campusWalk'

gsap.registerPlugin(ScrollTrigger)

const q = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel)
/** 지도에서 미리보기를 여는 것 (건물 · 광장 깃발 · 안내판). PlacePopover 의 PLACE_TRIGGER 와 같다 */
const TRIGGER = `[aria-controls="${PLACE_PANEL_ID}"], [data-place-label]`
/** 카메라가 바뀌었음을 미리보기 창에 알린다 (창이 자리를 다시 잡는다) */
const CAMERA_EVENT = 'campus-camera'
const qa = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)]

export function startHomeStory(): () => void {
  const mm = gsap.matchMedia()
  mm.add({ wide: '(min-width: 1024px)', ok: '(prefers-reduced-motion: no-preference)' }, (ctx) => {
    const { wide, ok } = ctx.conditions as { wide: boolean; ok: boolean }
    if (!ok) return
    document.documentElement.dataset.story = ''
    const undoWalk = walkIn(wide)
    tileFloat()
    // 데이터를 받아 목록 길이가 바뀌면 시작 · 끝 위치를 다시 잰다
    const main = q('main') ?? document.body
    let t = 0
    const ro = new ResizeObserver(() => {
      clearTimeout(t)
      t = window.setTimeout(() => ScrollTrigger.refresh(), 120)
    })
    ro.observe(main)
    return () => {
      ro.disconnect()
      clearTimeout(t)
      undoWalk?.()
      delete document.documentElement.dataset.story
    }
  })
  return () => mm.revert()
}

/** 1. 캠퍼스로 걸어 들어가기 */
function walkIn(wide: boolean) {
  const hero = q('[data-story="hero"]')
  const frame = q('[data-story="map"]')
  // SVG 지도 (3D 지도가 있으면 그 밑에 숨어 있다). 3D 층의 손글씨 SVG 와 헷갈리지 않게 class 로 찾는다
  const svg = frame && q<SVGSVGElement>('svg.campus-iso', frame)
  const sheet = q('#projects')
  if (!hero || !frame || !svg || !sheet) return
  const wash = q('[data-story="wash"]', frame)
  // 넓은 화면: 글자 판이 지도 위에 얹혀 있으므로, 카메라가 다가가는 동안 글자 판은 물러난다 (폰은 글자가 지도 위에 따로 있어 그대로)
  const panel = wide ? q('[data-story="panel"]', hero) : null
  const target = q<SVGGElement>('[data-place="projects"]', svg)
  const label = q<SVGGElement>('[data-place-label="projects"]', svg)
  if (!target) return
  const others = qa<SVGGElement>('[data-place]:not([data-place="projects"])', svg)
  const otherSigns = qa<SVGGElement>('[data-place-label]:not([data-place-label="projects"])', svg).map((g) => g.parentElement?.parentElement ?? g)
  // 손글씨 메모: 프로젝트 쪽(G-Sprint) 메모만 남기고 나머지는 안내판과 같이 물러난다
  // (글꼴을 받은 뒤 그려지고 3D 지도에도 따로 붙으므로 그때그때 지도 틀 전체에서 찾는다)
  const otherPens = () => qa<SVGGElement>('[data-pen]:not([data-pen="sprint"])', frame)
  /** 3D 지도가 그려져 있는지: 그러면 카메라 · 건물 물러나기는 3D 가 campusWalk 를 받아 맡는다 */
  const world3d = () => Boolean(frame.querySelector('[data-world="ready"]'))

  /** 카메라 도착 배율 */
  const K = wide ? 1.9 : 2.25
  const ease = gsap.parseEase('power2.inOut')

  if (wide) {
    // 넓은 화면: 지도는 첫 화면 전체 배경. 첫 화면이 나가는 동안 지도는 0.45배 속도로만 올라가고(배경), 프로젝트 섹션이 그 위를 덮는다
    gsap.fromTo(
      frame,
      { y: 0 },
      {
        y: () => hero.offsetHeight * 0.55,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: () => `top ${headerBottom(hero)}px`, end: () => `bottom ${headerBottom(hero)}px`, scrub: true, invalidateOnRefresh: true },
      },
    )
  }
  // 폰 · 태블릿: 지도는 글자 아래에 있다. 지도가 머리말 밑에 닿을 때까지 카메라가 다가가고,
  // 그 뒤로는 CSS sticky 가 지도를 지도 높이만큼 붙잡아 두고 프로젝트 섹션이 덮는다 (motion.module.css). JS 로 붙잡지 않아 흔들림이 없다

  /** 카메라가 도착하기까지 스크롤 거리: 넓은 화면 460px, 좁은 화면은 지도가 머리말 밑에 닿을 때까지 */
  const travel = () => {
    if (wide) return 460
    const hold = parseFloat(getComputedStyle(hero, '::after').height) || 0
    return Math.max(120, hero.offsetHeight - hold - frame.offsetHeight)
  }

  // 카메라: 건물 + 안내판의 가운데(bx, by)를 보이는 창(지도 판 중 머리말 · 프로젝트 섹션에 가리지 않은 곳)의 가운데로
  let bx = 0
  let by = 0
  let top0 = 64
  const measure = () => {
    const saved = svg.style.transform
    svg.style.transform = ''
    const f = frame.getBoundingClientRect()
    top0 = headerBottom(hero)
    const b = target.getBoundingClientRect()
    const l = label?.getBoundingClientRect()
    const x0 = Math.min(b.left, l?.left ?? b.left)
    const x1 = Math.max(b.right, l?.right ?? b.right)
    const y0 = Math.min(b.top, l?.top ?? b.top)
    bx = (x0 + x1) / 2 - f.left
    by = (y0 + b.bottom) / 2 - f.top
    svg.style.transform = saved
  }
  // 움직이는 동안만 지도를 합성 층으로 올려 확대를 GPU 가 맡게 하고(조금 흐려도 움직임에 묻힘),
  // 멈추고 0.2초 뒤 층을 내려 그 배율에서 다시 또렷하게 그린다 (매 프레임 SVG 를 새로 그리면 노트북에서 30fps 로 떨어졌다)
  let idle = 0
  const settle = () => {
    clearTimeout(idle)
    svg.style.willChange = 'transform'
    idle = window.setTimeout(() => (svg.style.willChange = ''), 200)
  }
  // 미리보기가 열려 있는 동안은 카메라를 처음 자리에 둔다 (고른 건물이 보여야 하고, 창이 건물 옆에 붙어 있어야 한다)
  let frozen = false
  const render = (p: number) => {
    if (!world3d()) settle()
    const e = frozen ? 0 : ease(p)
    const f = frame.getBoundingClientRect()
    const visTop = Math.max(top0, f.top)
    const visBot = Math.min(sheet.getBoundingClientRect().top, f.bottom, innerHeight)
    const ty = Math.max(visBot - visTop, 0) / 2 + visTop - f.top
    const tx = f.width / 2
    // 3D 지도에 알린다 (3D 는 카메라를 돌려 걸어 들어가고, 나머지 건물 · 안내판을 물린다)
    campusWalk.set({ e, tx, ty, k: K })
    if (!world3d()) {
      const k = 1 + (K - 1) * e
      const cx = bx + (tx - bx) * e
      const cy = by + (ty - by) * e
      svg.style.transformOrigin = '0 0'
      svg.style.transform = e === 0 ? '' : `translate(${(cx - k * bx).toFixed(1)}px, ${(cy - k * by).toFixed(1)}px) scale(${k.toFixed(4)})`
      const back = Math.min(1, e * 1.25)
      for (const g of others) {
        g.style.opacity = String(1 - 0.7 * back)
        g.style.filter = back > 0 ? `grayscale(${back.toFixed(2)})` : ''
      }
      for (const g of otherSigns) g.style.opacity = String(1 - Math.min(1, e * 1.6))
    }
    for (const g of otherPens()) g.style.opacity = String(1 - Math.min(1, e * 1.6))
    if (wash) wash.style.opacity = String(1 - Math.min(1, e * 1.8))
    if (panel) panel.style.opacity = String(1 - Math.min(1, e * 1.7))
    frame.toggleAttribute('data-arrive', e > 0.92)
  }
  const cam = { p: 0 }
  gsap.to(cam, {
    p: 1,
    ease: 'none',
    onUpdate: () => render(cam.p),
    scrollTrigger: {
      trigger: hero,
      start: () => `top ${headerBottom(hero)}px`,
      end: () => `+=${travel()}`,
      scrub: 0.7,
      invalidateOnRefresh: true,
      onRefresh: () => {
        measure()
        render(cam.p)
      },
    },
  })
  measure()

  const panelOpen = () => {
    const el = document.getElementById(PLACE_PANEL_ID)
    return Boolean(el && !el.hidden)
  }
  const freeze = (v: boolean) => {
    if (frozen === v) return
    frozen = v
    render(cam.p)
    window.dispatchEvent(new Event(CAMERA_EVENT))
  }
  // 누르는 순간(React 가 창을 열기 전)에 먼저 카메라를 돌려 둔다. 창이 닫히면 스크롤 위치대로 다시
  const onPick = (e: Event) => {
    const t = e.target as Element | null
    if (!t || !frame.contains(t) || !t.closest(TRIGGER)) return
    const walked = cam.p > 0.02
    freeze(true)
    // 넓은 화면: 걸어 들어가던 중에 골랐으면 첫 화면으로 돌아간다 (프로젝트 판이 지도 아래쪽을 덮고 있어서 창이 가려진다)
    if (wide && walked) window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') onPick(e)
  }
  document.addEventListener('click', onPick, true)
  document.addEventListener('keydown', onKey, true)
  const watch = new MutationObserver(() => freeze(panelOpen()))
  watch.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden'] })

  // 되돌릴 때(동작 줄이기 · 페이지 이동) 직접 쓴 style 도 지운다
  return () => {
    document.removeEventListener('click', onPick, true)
    document.removeEventListener('keydown', onKey, true)
    watch.disconnect()
    clearTimeout(idle)
    svg.style.willChange = ''
    svg.style.transform = ''
    svg.style.transformOrigin = ''
    for (const g of [...others, ...otherSigns, ...otherPens()]) {
      g.style.opacity = ''
      g.style.filter = ''
    }
    if (wash) wash.style.opacity = ''
    if (panel) panel.style.opacity = ''
    frame.removeAttribute('data-arrive')
    campusWalk.set({ e: 0, tx: 0, ty: 0, k: 1 })
  }
}

/** 첫 화면 위 머리말 아래 끝 (첫 화면은 머리말 바로 아래에서 시작한다) */
function headerBottom(hero: HTMLElement) {
  return Math.round(hero.getBoundingClientRect().top + scrollY)
}

/** 2. 큰 타일의 겹친 폰 화면: 조금 빨리 */
function tileFloat() {
  for (const el of qa('[data-float]')) {
    const tile = el.closest('li') ?? el
    gsap.fromTo(el, { '--float': '44px' }, { '--float': '-28px', ease: 'none', scrollTrigger: { trigger: tile, start: 'top bottom', end: 'bottom top', scrub: 0.4 } })
  }
}
