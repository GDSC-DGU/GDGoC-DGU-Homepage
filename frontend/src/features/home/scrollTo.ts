const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 같은 페이지의 섹션으로 이동하고 키보드 초점도 그 섹션으로 옮긴다.
 * href="#now" 를 그대로 쓰면 hash 주소(#/…)로 빌드한 미리보기에서 라우터가 주소로 읽어서 직접 움직인다.
 */
export function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' })
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: true })
}

/** 요소가 화면(머리말 아래)에 충분히 보이지 않으면 보이게 스크롤한다. force 면 보여도 맞춘다 */
export function revealElement(el: HTMLElement, block: ScrollLogicalPosition, force = false) {
  const r = el.getBoundingClientRect()
  const top = 64
  const visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, top)
  if (!force && visible >= Math.min(r.height, window.innerHeight - top) * 0.85) return
  el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block })
}
