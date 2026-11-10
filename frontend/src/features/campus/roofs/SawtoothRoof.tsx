import { shade } from '@/lib/iso'
import { cyl, faceRect, line3, prismX, slab, type V3 } from '../anatomy/kit'
import { Line, MixedSolid, Solid, type Paint } from '../anatomy/draw'
import { placePaint } from '../anatomy/paint'
import { ROOF_RISE, SAW_TEETH } from './heights'
import { GLASS, LIT, type RoofProps } from './types'

const RISE = ROOF_RISE.saw
/** 비탈 골함석 줄 간격 (격자) */
const RIB = 0.3

const flatPaint = (c: string): Paint => ({ top: c, shades: [c, c, c, c] })

/**
 * 톱니 지붕 (anatomy 방식): 톱니 하나 = 삼각 단면을 x 로 민 입체.
 * 비탈(장소색, 골 줄이 처마에서 용마루까지) · 톱니창(장소색 틀 + 유리 + 창살) · 끝벽(중립색) 이 한 입체의 면이다.
 * 골마다 빗물받이, 비탈에 환기통 둘. live(G-Sprint 진행 중)면 톱니창에 불이 켜진다.
 */
export function SawtoothRoof({ fp, color, top, live, glass: off = GLASS }: RoofProps) {
  const { x, y, w, d } = fp
  const p = d / SAW_TEETH
  const glass = live ? LIT.L : off.L
  const roof = placePaint(color)
  const frame = shade(color, -0.12)
  const paints = { roof, glazing: flatPaint(frame) }
  return (
    <>
      {Array.from({ length: SAW_TEETH }, (_, k) => {
        const a = y + k * p
        const e = a + p
        const ribs: string[] = []
        for (let xx = x + RIB / 2; xx < x + w - 0.05; xx += RIB) ribs.push(line3([[xx, a, top], [xx, e, top + RISE]]))
        const gx0 = x + 0.08
        const gx1 = x + w - 0.08
        const glassD = faceRect('L', e + 0.004, gx0, gx1, top + 0.08, top + RISE - 0.07)
        const bars = [1, 2, 3, 4, 5].map((m) => {
          const u = gx0 + ((gx1 - gx0) * m) / 6
          return line3([[u, e + 0.004, top + 0.08], [u, e + 0.004, top + RISE - 0.07]])
        })
        // 환기통: 가운데 · 앞 톱니에 하나씩 (뒤 톱니 자리는 안내판이 덮는다)
        const vent = k === 1 ? 0.2 : k === 2 ? 0.55 : null
        return (
          <g key={k}>
            <MixedSolid
              faces={prismX([[a, top], [e, top + RISE], [e, top]], x, x + w, { sides: (i) => (i === 0 ? 'roof' : i === 1 ? 'glazing' : undefined) })}
              paints={paints}
              edge={roof.edge}
              crease={roof.crease}
              inner={
                <>
                  <Line d={ribs.join('')} color={roof.crease} />
                  <path d={glassD} style={{ fill: glass }} data-lit={live || undefined} data-glass="L" />
                  <Line d={bars.join('')} color={frame} width={1.1} />
                  <Line d={glassD} color={roof.edge} />
                </>
              }
            />
            {vent !== null && <Vent cx={x + w * vent} cy={a + p * 0.42} z={top + RISE * 0.42} />}
            {/* 골 빗물받이 (앞 톱니는 처마 끝) */}
            <Solid paths={slab({ x: x - 0.02, y: e - 0.03, w: w + 0.07, d: 0.06, r: 0.015 }, top - 0.02, 0.045, 2, 0.01)} tone="mid" />
          </g>
        )
      })}
    </>
  )
}

/** 지붕 환기통: 몸통(세로 루버) + 갓 + 꼭지 */
function Vent({ cx, cy, z }: { cx: number; cy: number; z: number }) {
  const r = 0.075
  const louvres: string[] = []
  for (let i = 0; i < 14; i++) {
    const t = (i / 14) * Math.PI * 2
    const nx = Math.cos(t)
    const ny = Math.sin(t)
    if (nx * 0.707 + ny * 0.707 < 0.2) continue
    louvres.push(line3([[cx + r * nx, cy + r * ny, z + 0.02] as V3, [cx + r * nx, cy + r * ny, z + 0.1] as V3]))
  }
  return (
    <g>
      <Solid paths={cyl(cx, cy, r, z - 0.03, 0.14, 18)} tone="mid" crease="faint" inner={<Line d={louvres.join('')} tone="lo" />} />
      <Solid paths={cyl(cx, cy, r + 0.025, z + 0.11, 0.03, 18, 0.01)} tone="mid" />
      <Solid paths={cyl(cx, cy, 0.018, z + 0.14, 0.04, 8)} tone="mid" crease="none" />
    </g>
  )
}
