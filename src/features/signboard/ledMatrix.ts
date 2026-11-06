/**
 * LED 전광판 그리기 (canvas 하나, 의존성 없음).
 * 글자는 Galmuri11 Bold(12px 비트맵 글꼴, OFL)를 1점 = 1px 로 찍어 점 격자로 옮긴다. 한글 버스 도착 안내판과 같은 12점 높이.
 * - 줄 = 왼쪽 고정 조각 + 가운데 본문 + 오른쪽 고정 조각. 본문이 칸보다 길면 흐르고(marquee), 움직임을 줄이면 낱말 단위로 다음 줄에 이어 쓴다.
 * - 꺼진 점 · 고정 조각은 한 번만 그려 두고(정적 층), 흐르는 본문만 한 칸 움직일 때마다 다시 찍는다 (초당 최대 ~24번, 매 프레임이 아님).
 * - 화면 밖 · 탭이 숨으면 멈춘다 (LedBoard 가 알려 준다).
 */

export const FONT_FAMILY = 'Galmuri11 LED'
/** 줄 높이 (점): 위 1 + 글자 몸통 11 + 아래 내림(g · y) 2. Galmuri11 은 12px 에서 몸통이 11점 */
export const FONT_ROWS = 14
const CAP_TOP = 1
const CAP_H = 11

export type LedTone = 'lit' | 'soft' | 'mark' | 'invert'

export interface LedSeg {
  text?: string
  tone?: LedTone
  /** tone='mark': 장소색 네모 (점 수) */
  size?: number
  /** 이 조각 뒤에 둘 빈 칸 (점) */
  after?: number
}

export interface LedLine {
  left?: LedSeg[]
  body?: LedSeg[]
  right?: LedSeg[]
}

export interface LedPalette {
  /** 바탕 (판 안쪽) */
  back: string
  /** 꺼진 점 */
  off: string
  lit: string
  soft: string
  /** 장소색 네모 */
  mark: string
}

export interface LedLayout {
  /** 점 사이 거리 (CSS px) */
  pitch: number
  /** 줄 사이 (점) */
  lineGap: number
  /** 판 안쪽 여백 (점) */
  padX: number
  padY: number
  /** 흐르는 속도 (점/초) */
  speed: number
  /** 한 바퀴 돌 때마다 처음에서 멈추는 시간 (ms) */
  hold: number
}

interface Bitmap {
  w: number
  /** 0 = 꺼짐, 1 = lit, 2 = soft, 3 = mark */
  cells: Uint8Array
}

const TONE_INDEX: Record<LedTone, number> = { lit: 1, soft: 2, mark: 3, invert: 1 }

let measureCtx: CanvasRenderingContext2D | null = null
function ctx2d(): CanvasRenderingContext2D {
  if (!measureCtx) {
    const c = document.createElement('canvas')
    c.width = 2048
    c.height = FONT_ROWS + 4
    measureCtx = c.getContext('2d', { willReadFrequently: true })!
  }
  return measureCtx
}

const FONT = `12px "${FONT_FAMILY}"`
/** 기준선: 몸통이 1~11 행, 내림이 12~13 행에 오도록 (12px 에서 몸통 꼭대기 = 기준선 − 11) */
const BASELINE_Y = CAP_TOP + CAP_H

function textWidth(text: string): number {
  const c = ctx2d()
  c.font = FONT
  return Math.round(c.measureText(text).width)
}

function segWidth(seg: LedSeg): number {
  if (seg.tone === 'mark') return (seg.size ?? 8) + (seg.after ?? 0)
  const pad = seg.tone === 'invert' ? 4 : 0
  return textWidth(seg.text ?? '') + pad + (seg.after ?? 0)
}

/** 조각 여럿을 한 장의 점 지도로 */
export function rasterize(segs: readonly LedSeg[]): Bitmap {
  const w = Math.max(1, segs.reduce((n, s) => n + segWidth(s), 0))
  const cells = new Uint8Array(w * FONT_ROWS)
  const c = ctx2d()
  let x = 0
  for (const seg of segs) {
    const idx = TONE_INDEX[seg.tone ?? 'lit']
    if (seg.tone === 'mark') {
      const n = seg.size ?? 8
      const top = CAP_TOP + Math.floor((CAP_H - n) / 2)
      for (let yy = 0; yy < n; yy++) for (let xx = 0; xx < n; xx++) cells[(top + yy) * w + x + xx] = idx
      x += n + (seg.after ?? 0)
      continue
    }
    const text = seg.text ?? ''
    const tw = textWidth(text)
    const invert = seg.tone === 'invert'
    const pad = invert ? 2 : 0
    const bw = tw + pad * 2
    c.clearRect(0, 0, c.canvas.width, c.canvas.height)
    c.font = FONT
    c.fillStyle = '#fff'
    c.textBaseline = 'alphabetic'
    c.fillText(text, pad, BASELINE_Y)
    const img = c.getImageData(0, 0, bw, FONT_ROWS).data
    for (let yy = 0; yy < FONT_ROWS; yy++) {
      for (let xx = 0; xx < bw; xx++) {
        const on = img[(yy * bw + xx) * 4 + 3] > 110
        if (invert ? !on : on) cells[yy * w + x + xx] = idx
      }
    }
    x += bw + (seg.after ?? 0)
  }
  return { w, cells }
}

/** 움직임을 줄였을 때: 본문을 낱말 단위로 끊어 칸에 맞는 줄 여럿으로 */
export function wrapBody(body: readonly LedSeg[], width: number): LedSeg[][] {
  const words: LedSeg[] = []
  for (const seg of body) {
    if (seg.tone === 'mark' || !seg.text) {
      words.push(seg)
      continue
    }
    const parts = seg.text.split(/(?<= )/)
    parts.forEach((p, i) => words.push({ ...seg, text: p, after: i === parts.length - 1 ? seg.after : 0 }))
  }
  const lines: LedSeg[][] = [[]]
  let used = 0
  for (const wd of words) {
    const ww = segWidth(wd)
    if (used > 0 && used + ww > width) {
      lines.push([])
      used = 0
    }
    lines[lines.length - 1].push(used === 0 && wd.text ? { ...wd, text: wd.text.trimStart() } : wd)
    used += ww
  }
  return lines
}

interface PlacedLine {
  /** 줄 맨 위 행 (점) */
  row: number
  left: Bitmap | null
  right: Bitmap | null
  body: Bitmap | null
  /** 본문 칸 시작 열 · 폭 (점) */
  bodyX: number
  bodyW: number
  scroll: boolean
}

export interface LedScene {
  cols: number
  rows: number
  lines: PlacedLine[]
  /** 흐르는 줄이 하나라도 있는지 */
  moving: boolean
}

/** 줄 목록을 판 크기(점)에 맞게 놓는다. animate=false 면 넘치는 본문은 다음 줄로 */
export function layoutScene(input: readonly LedLine[], cols: number, layout: LedLayout, animate: boolean): LedScene {
  const inner = cols - layout.padX * 2
  const lines: PlacedLine[] = []
  let row = layout.padY
  const GAP = 6
  for (const line of input) {
    const left = line.left?.length ? rasterize(line.left) : null
    const right = line.right?.length ? rasterize(line.right) : null
    const bodyX = layout.padX + (left ? left.w + GAP : 0)
    const bodyW = Math.max(8, inner - (left ? left.w + GAP : 0) - (right ? right.w + GAP : 0))
    let bodies: (Bitmap | null)[] = [line.body?.length ? rasterize(line.body) : null]
    let scroll = false
    if (bodies[0] && bodies[0].w > bodyW) {
      if (animate) scroll = true
      else bodies = wrapBody(line.body!, bodyW).map((segs) => rasterize(segs))
    }
    bodies.forEach((body, i) => {
      lines.push({ row, left: i === 0 ? left : null, right: i === 0 ? right : null, body, bodyX, bodyW, scroll: i === 0 && scroll })
      row += FONT_ROWS + layout.lineGap
    })
  }
  const rows = row - layout.lineGap + layout.padY
  return { cols, rows, lines, moving: lines.some((l) => l.scroll) }
}

/** 점 하나 모양 (빛 번짐 포함)을 미리 그려 둔다 */
function dotSprite(color: string, pitchPx: number, glow: boolean): HTMLCanvasElement {
  const size = Math.ceil(pitchPx * (glow ? 2.6 : 1))
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const mid = size / 2
  if (glow) {
    const halo = g.createRadialGradient(mid, mid, 0, mid, mid, mid)
    halo.addColorStop(0, withAlpha(color, 0.42))
    halo.addColorStop(0.4, withAlpha(color, 0.12))
    halo.addColorStop(1, withAlpha(color, 0))
    g.fillStyle = halo
    g.fillRect(0, 0, size, size)
  }
  g.fillStyle = color
  g.beginPath()
  g.arc(mid, mid, pitchPx * 0.36, 0, Math.PI * 2)
  g.fill()
  return c
}

function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}

export class LedRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private scene: LedScene | null = null
  private staticLayer: HTMLCanvasElement | null = null
  private sprites: HTMLCanvasElement[] = []
  private dpr = 1
  private lastOffset = -1
  private palette: LedPalette
  private layout: LedLayout
  /** 들어오기(글자가 오른쪽에서 흘러 들어와 멈춤) 시작 시각 (draw 의 t 기준). null 이면 들어오기 없음 */
  private introAt: number | null = null
  private offLayer: HTMLCanvasElement | null = null

  constructor(canvas: HTMLCanvasElement, palette: LedPalette, layout: LedLayout) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.palette = palette
    this.layout = layout
  }

  /** 판 폭(CSS px)에 맞춰 장면을 다시 놓는다. 높이(CSS px)를 돌려준다 */
  setScene(lines: readonly LedLine[], cssWidth: number, animate: boolean): number {
    const { pitch } = this.layout
    const cols = Math.max(24, Math.floor(cssWidth / pitch))
    this.scene = layoutScene(lines, cols, this.layout, animate)
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    const pxPitch = pitch * this.dpr
    this.canvas.width = Math.round(cols * pxPitch)
    this.canvas.height = Math.round(this.scene.rows * pxPitch)
    this.canvas.style.width = `${cols * pitch}px`
    this.canvas.style.height = `${this.scene.rows * pitch}px`
    const p = this.palette
    this.sprites = [dotSprite(p.off, pxPitch, false), dotSprite(p.lit, pxPitch, true), dotSprite(p.soft, pxPitch, true), dotSprite(p.mark, pxPitch, true)]
    this.buildStatic()
    this.lastOffset = -1
    this.draw(0, true)
    return this.scene.rows * pitch
  }

  get moving(): boolean {
    return this.scene?.moving ?? false
  }

  /** 들어오기 길이 (ms): 판 폭을 지나는 데 걸리는 시간, 0.9~1.6초 */
  private get introMs(): number {
    const cols = this.scene?.cols ?? 0
    return Math.min(1600, Math.max(900, cols * 6))
  }

  /** 실제 전광판처럼 글자가 오른쪽에서 흘러 들어와 멈춘다 (한 번). t 는 draw 에 넘기는 시각과 같은 기준 */
  startIntro(t: number) {
    this.introAt = t
    this.lastOffset = -1
  }

  /** t 시점에 아직 들어오는 중인지 */
  introActive(t: number): boolean {
    return this.introAt !== null && t - this.introAt < this.introMs
  }

  private dot(g: CanvasRenderingContext2D, idx: number, col: number, row: number) {
    const s = this.sprites[idx]
    const pxPitch = this.layout.pitch * this.dpr
    const cx = (col + 0.5) * pxPitch
    const cy = (row + 0.5) * pxPitch
    g.drawImage(s, cx - s.width / 2, cy - s.height / 2)
  }

  private stamp(g: CanvasRenderingContext2D, bm: Bitmap, x0: number, row: number) {
    for (let y = 0; y < FONT_ROWS; y++)
      for (let x = 0; x < bm.w; x++) {
        const v = bm.cells[y * bm.w + x]
        if (v) this.dot(g, v, x0 + x, row + y)
      }
  }

  /** 켜진 점만 찍되, 열 x 가 limit 이상이면 건너뛴다 (들어오기에서 판 밖 · 칸 밖) */
  private stampClip(g: CanvasRenderingContext2D, bm: Bitmap, x0: number, row: number, limit: number) {
    for (let y = 0; y < FONT_ROWS; y++)
      for (let x = 0; x < bm.w; x++) {
        const col = x0 + x
        if (col >= limit) break
        const v = bm.cells[y * bm.w + x]
        if (v) this.dot(g, v, col, row + y)
      }
  }

  /** 꺼진 점 전부 + 움직이지 않는 조각 (한 번만) */
  private buildStatic() {
    const sc = this.scene!
    const c = document.createElement('canvas')
    c.width = this.canvas.width
    c.height = this.canvas.height
    const g = c.getContext('2d')!
    if (this.palette.back !== 'transparent') {
      g.fillStyle = this.palette.back
      g.fillRect(0, 0, c.width, c.height)
    }
    for (let r = 0; r < sc.rows; r++) for (let col = 0; col < sc.cols; col++) this.dot(g, 0, col, r)
    // 꺼진 점만 있는 판 (들어오기 · 흐르는 칸을 다시 그릴 때 바탕)
    const off = document.createElement('canvas')
    off.width = c.width
    off.height = c.height
    off.getContext('2d')!.drawImage(c, 0, 0)
    this.offLayer = off
    for (const ln of sc.lines) {
      if (ln.left) this.stamp(g, ln.left, this.layout.padX, ln.row)
      if (ln.right) this.stamp(g, ln.right, sc.cols - this.layout.padX - ln.right.w, ln.row)
      if (ln.body && !ln.scroll) this.stamp(g, ln.body, ln.bodyX, ln.row)
    }
    this.staticLayer = c
  }

  /** t(ms) 시점의 화면. 흐르는 칸이 한 점 이상 움직였을 때만 다시 그린다 */
  draw(t: number, force = false) {
    const sc = this.scene
    if (!sc || !this.staticLayer) return
    const { speed, hold } = this.layout
    const g = this.ctx
    const scrolling = sc.lines.filter((l) => l.scroll && l.body)
    // 한 바퀴 = 처음에서 멈춤(hold) + 본문 길이 + 사이 간격 만큼 흐름
    let offset = 0
    if (scrolling.length) {
      const period = scrolling[0].body!.w + 36
      const cycle = hold + (period / speed) * 1000
      const tt = t % cycle
      offset = tt < hold ? 0 : Math.floor(((tt - hold) / 1000) * speed) % period
    }
    // 들어오기: 모든 글자 조각을 오른쪽으로 밀어 두었다가 제자리로 (감속). 끝나면 아래 평소 그리기로
    if (this.introAt !== null && t >= this.introAt) {
      const p = Math.min(1, (t - this.introAt) / this.introMs)
      if (p < 1) {
        const shift = Math.round((1 - (1 - (1 - p) ** 3)) * sc.cols)
        g.clearRect(0, 0, this.canvas.width, this.canvas.height)
        g.drawImage(this.offLayer!, 0, 0)
        for (const ln of sc.lines) {
          if (ln.left) this.stampClip(g, ln.left, this.layout.padX + shift, ln.row, sc.cols)
          if (ln.right) this.stampClip(g, ln.right, sc.cols - this.layout.padX - ln.right.w + shift, ln.row, sc.cols)
          if (ln.body) this.stampClip(g, ln.body, ln.bodyX + shift, ln.row, ln.scroll ? ln.bodyX + ln.bodyW : sc.cols)
        }
        this.lastOffset = -1
        return
      }
      this.introAt = null
      force = true
    }
    if (!force && offset === this.lastOffset) return
    this.lastOffset = offset
    g.clearRect(0, 0, this.canvas.width, this.canvas.height)
    g.drawImage(this.staticLayer, 0, 0)
    const pxPitch = this.layout.pitch * this.dpr
    for (const ln of scrolling) {
      const bm = ln.body!
      const period = bm.w + 36
      // 본문 칸만 꺼진 점으로 다시 덮고 그 위에 찍는다
      g.save()
      g.beginPath()
      g.rect(ln.bodyX * pxPitch, ln.row * pxPitch, ln.bodyW * pxPitch, FONT_ROWS * pxPitch)
      g.clip()
      g.clearRect(ln.bodyX * pxPitch, ln.row * pxPitch, ln.bodyW * pxPitch, FONT_ROWS * pxPitch)
      if (this.palette.back !== 'transparent') {
        g.fillStyle = this.palette.back
        g.fillRect(ln.bodyX * pxPitch, ln.row * pxPitch, ln.bodyW * pxPitch, FONT_ROWS * pxPitch)
      }
      for (let y = 0; y < FONT_ROWS; y++)
        for (let x = 0; x < ln.bodyW; x++) {
          const src = (x + offset) % period
          const v = src < bm.w ? bm.cells[y * bm.w + src] : 0
          this.dot(g, v, ln.bodyX + x, ln.row + y)
        }
      g.restore()
    }
  }
}
