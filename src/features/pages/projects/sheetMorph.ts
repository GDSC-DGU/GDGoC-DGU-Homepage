/**
 * 작품 → 자세히 보기 창 '이어지는 열림' (View Transitions 같은 문서 전환, 의존성 없음).
 * '무엇이 어디서 열렸는지'를 보여 준다: 누른 작품의 그림(대표 작품 무대) 또는 작품 상자(줄 목록)가 창의 그 자리로 옮겨 가며 커진다.
 * 닫을 때는 거꾸로 제자리로 돌아간다. 페이지 이동의 좌우 밀기(app/viewTransitions.ts)와 같은 API. 420ms 열림 · 280ms 닫힘 (tokens.css --dur-long · --dur-long-exit).
 *
 * 켜지는 조건: 브라우저가 startViewTransition 을 지원 · '동작 줄이기'가 아님 · 넓은 화면(768↑, 폰은 아래에서 올라오는 시트 그대로).
 * 조건이 안 맞으면 false 를 돌려주고, 부른 쪽이 원래대로 연다 · 닫는다.
 *
 * 이름(view-transition-name)은 찍는 순간에만 붙였다가 바로 뗀다: 같은 이름이 화면에 둘이면 전환이 취소되기 때문.
 *  - 'sheet-media': 대표 작품 무대([data-morph-media]) ↔ 창의 첫 그림 틀([data-morph-target='media']). 이때 창 판은 'sheet-panel' 로 따로 나타남 · 사라짐
 *  - 'sheet-box'  : 줄 목록 작품 상자([data-morph='box']) ↔ 창(dialog)
 * 움직임 모양은 styles/global.css 의 html[data-vt^='sheet'] 규칙이 그린다.
 */

type Kind = 'media' | 'box'
type Part = readonly [el: HTMLElement, name: string]

export function canMorph(): boolean {
  if (typeof document === 'undefined' || typeof document.startViewTransition !== 'function') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return window.matchMedia('(min-width: 768px)').matches
}

function name(parts: readonly Part[], on: boolean) {
  for (const [el, n] of parts) el.style.viewTransitionName = on ? n : ''
}

/** 작품 쪽 이름 붙일 곳 (카드: [data-morph]). mediaOk=false 면(창에 첫 그림이 없음) 상자끼리 잇는다 */
function cardParts(card: HTMLElement, mediaOk = true): { kind: Kind; parts: Part[] } {
  const media = card.querySelector<HTMLElement>('[data-morph-media]')
  if (mediaOk && card.dataset.morph === 'media' && media) return { kind: 'media', parts: [[media, 'sheet-media']] }
  return { kind: 'box', parts: [[card, 'sheet-box']] }
}

/** 창 쪽 이름 붙일 곳 */
function sheetParts(dialog: HTMLDialogElement, kind: Kind): Part[] {
  if (kind === 'media') {
    const frame = dialog.querySelector<HTMLElement>("[data-morph-target='media']")
    // 창에 첫 그림이 없으면 상자끼리 잇는다 (이름이 한쪽에만 있으면 그냥 나타남 · 사라짐이 된다)
    // 창 판(sheet-panel)은 따로 찍어 빨리 나타나게 한다: 페이지 위로 반투명 창 글자가 겹쳐 보이는 시간을 줄인다
    if (frame) return [[dialog, 'sheet-panel'], [frame, 'sheet-media']]
  }
  return [[dialog, 'sheet-box']]
}

function inView(el: Element) {
  const r = el.getBoundingClientRect()
  return r.bottom > 0 && r.top < window.innerHeight && r.width > 0
}

function run(kind: 'sheet-open' | 'sheet-close', update: () => Promise<void> | void, cleanup: () => void) {
  const root = document.documentElement
  root.dataset.vt = kind
  const t = document.startViewTransition(update)
  t.finished.finally(() => {
    cleanup()
    if (root.dataset.vt === kind) delete root.dataset.vt
  })
}

/**
 * 작품을 눌러 창을 열 때. open() 은 주소를 ?p=<id> 로 바꾸는 navigate(..., { flushSync: true }):
 * 상태가 동기로 그려지고 그 안의 showModal(useModalDialog 의 effect)도 같은 틱에 끝나야 새 화면을 찍을 수 있다.
 */
export function morphOpen(card: HTMLElement | null, open: () => Promise<void> | void): boolean {
  if (!card || !canMorph()) return false
  const { kind, parts } = cardParts(card)
  let after: Part[] = []
  name(parts, true)
  run(
    'sheet-open',
    async () => {
      name(parts, false)
      await open()
      const dialog = document.querySelector<HTMLDialogElement>('dialog[data-project-sheet][open]')
      if (!dialog) return
      after = sheetParts(dialog, kind)
      name(after, true)
    },
    () => name(after, false),
  )
  return true
}

/** 닫기 버튼 · 바깥 누름 · Esc 로 닫을 때. 연 작품이 화면에 보일 때만 제자리로 돌아간다 (아니면 false → 그냥 닫기) */
export function morphClose(dialog: HTMLDialogElement, projectId: string, close: () => void): boolean {
  if (!canMorph()) return false
  const link = document.querySelector(`[data-sheet-card="${CSS.escape(projectId)}"]`)
  const card = link?.closest<HTMLElement>('[data-morph]')
  if (!card || !inView(card)) return false
  const { kind, parts } = cardParts(card, dialog.querySelector("[data-morph-target='media']") !== null)
  const before = sheetParts(dialog, kind)
  name(before, true)
  run(
    'sheet-close',
    () => {
      name(before, false)
      close()
      name(parts, true)
    },
    () => name(parts, false),
  )
  return true
}

/** View Transitions 가 없는 넓은 화면: 확대 전환만 따로 그릴 수 있는지 (Web Animations) */
export function canFlip(): boolean {
  if (typeof document === 'undefined' || typeof document.startViewTransition === 'function') return false
  if (typeof Element === 'undefined' || typeof Element.prototype.animate !== 'function') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return window.matchMedia('(min-width: 768px)').matches
}

/** 처음 상자(from)를 끝 상자(to)에 겹치게 하는 변형: 왼쪽 위를 맞추고 너비 비율로 고르게 줄인다 */
export function flipFrom(from: { left: number; top: number; width: number }, to: { left: number; top: number; width: number }): string {
  const scale = to.width > 0 ? from.width / to.width : 1
  return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${scale})`
}

/** CSS 시간 값을 ms 로: '420ms' · '.42s' (빌드가 줄여 쓴 모양) 모두. 읽지 못하면 fallback */
export function cssMs(value: string, fallback: number): number {
  const v = value.trim()
  const n = parseFloat(v)
  if (!Number.isFinite(n)) return fallback
  return v.endsWith('ms') ? n : v.endsWith('s') ? n * 1000 : fallback
}

/** 누른 작품 자리 (flipOpen 이 적어 두고, 창이 열린 뒤 runFlip 이 쓴다) */
let pending: { rect: DOMRect; at: number } | null = null

/**
 * View Transitions 를 못 쓰는 브라우저의 확대 전환 (FLIP): 창이 누른 작품 자리 · 크기에서 창 자리로 커진다.
 * 여기서는 작품 자리만 적고 창을 연다. 창(showModal)은 ProjectSheet 의 effect 에서 열리므로, 그 뒤 runFlip 이 움직임을 건다.
 * 쓸 수 없으면 false 를 돌려주고, 부른 쪽이 원래대로 연다.
 */
export function flipOpen(card: HTMLElement | null, open: () => void): boolean {
  if (!card || !canFlip()) return false
  pending = { rect: card.getBoundingClientRect(), at: performance.now() }
  open()
  return true
}

/**
 * 창이 막 열렸을 때 부른다 (ProjectSheet). 적어 둔 작품 자리가 있으면 그 자리에서 커진다.
 * 시간 · 곡선은 tokens.css 의 --dur-long · --ease-out. 창의 CSS 떠오름(sheet.module.css)은 그동안 끈다(data-flip).
 */
export function runFlip(dialog: HTMLDialogElement) {
  const p = pending
  pending = null
  if (!p || !dialog.open || performance.now() - p.at > 1000) return
  const root = getComputedStyle(document.documentElement)
  const duration = cssMs(root.getPropertyValue('--dur-long'), 420)
  const easing = root.getPropertyValue('--ease-out').trim() || 'ease-out'
  dialog.dataset.flip = ''
  const anim = dialog.animate(
    [
      { transformOrigin: '0 0', transform: flipFrom(p.rect, dialog.getBoundingClientRect()), opacity: 0 },
      { transformOrigin: '0 0', transform: 'none', opacity: 1 },
    ],
    { duration, easing },
  )
  const done = () => delete dialog.dataset.flip
  anim.finished.then(done, done)
}
