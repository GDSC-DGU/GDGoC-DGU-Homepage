import { shade } from '@/lib/iso'
import { dots, line3, polySolid, prismX, prismY, slab, type PolyFace, type V3 } from '../anatomy/kit'
import { Dots, Line, MixedSolid, Solid } from '../anatomy/draw'
import { placePaint } from '../anatomy/paint'
import { ROOF_RISE } from './heights'
import { GLASS, type RoofProps } from './types'

const RISE = ROOF_RISE.gable
/** 처마가 벽 밖으로 나온 길이 */
const EAVE = 0.14
/** 지붕 판 두께 */
const THICK = 0.07
/** 지붕 이음 줄 간격 */
const SEAM = 0.27

/**
 * 박공지붕 집 (anatomy 방식): 박공 벽(중립색 삼각 기둥) → 왼쪽 · 오른쪽 지붕판(장소색, 두께 있는 판) → 용마루 덮개 → 굴뚝 → 처마 빗물받이.
 * 지붕판 이음 줄은 처마에서 용마루까지 끝에서 끝으로. 둥근 창은 창틀 고리 + 십자 창살.
 */
export function GableRoof({ fp, color, top, doorCenter, glass = GLASS }: RoofProps) {
  const { x, y, w, d } = fp
  const xc = x + w / 2
  const o = EAVE
  const lo = top - THICK
  const apex = top + RISE
  const y0 = y - o
  const y1 = y + d + o
  const roof = placePaint(color)
  const ridgePaint = placePaint(shade(color, -0.12))
  // 오른쪽 지붕판 윗면 높이 (굴뚝 밑면이 지붕을 따라가게)
  const roofZ = (xx: number) => apex - ((xx - xc) / (x + w + o - xc)) * (apex - lo)
  const seamsL: string[] = []
  const seamsR: string[] = []
  for (let yy = y0 + SEAM / 2; yy < y1 - 0.05; yy += SEAM) {
    seamsL.push(line3([[x - o, yy, lo], [xc, yy, apex]]))
    seamsR.push(line3([[xc, yy, apex], [x + w + o, yy, lo]]))
  }
  // 둥근 창 (박공 벽 앞면)
  const wc: V3 = [xc, y + d + 0.006, top + 0.36]
  const circle = (r: number) => line3(Array.from({ length: 24 }, (_, i) => {
    const f = (Math.PI * 2 * i) / 24
    return [xc + r * Math.cos(f), wc[1], wc[2] + r * 0.82 * Math.sin(f)] as V3
  }), true)
  const cross = line3([[xc - 0.19, wc[1], wc[2]], [xc + 0.19, wc[1], wc[2]]]) + line3([[xc, wc[1], wc[2] - 0.156], [xc, wc[1], wc[2] + 0.156]])
  // 굴뚝: 오른쪽 지붕판 앞쪽, 밑면이 지붕 비탈을 따라 잘린 상자
  const cx0 = x + w - 0.62
  const cx1 = cx0 + 0.22
  const cy0 = y + d - 0.75
  const cy1 = cy0 + 0.22
  const zt = roofZ(cx0) + 0.32
  const chimney: PolyFace[] = [
    { pts: [[cx0, cy0, zt], [cx1, cy0, zt], [cx1, cy1, zt], [cx0, cy1, zt]] },
    { pts: [[cx0, cy0, roofZ(cx0)], [cx1, cy0, roofZ(cx1)], [cx1, cy1, roofZ(cx1)], [cx0, cy1, roofZ(cx0)]] },
    { pts: [[cx0, cy0, roofZ(cx0)], [cx1, cy0, roofZ(cx1)], [cx1, cy0, zt], [cx0, cy0, zt]] },
    { pts: [[cx1, cy0, roofZ(cx1)], [cx1, cy1, roofZ(cx1)], [cx1, cy1, zt], [cx1, cy0, zt]] },
    { pts: [[cx0, cy1, roofZ(cx0)], [cx1, cy1, roofZ(cx1)], [cx1, cy1, zt], [cx0, cy1, zt]] },
    { pts: [[cx0, cy0, roofZ(cx0)], [cx0, cy1, roofZ(cx0)], [cx0, cy1, zt], [cx0, cy0, zt]] },
  ]
  return (
    <>
      {/* 박공 벽 (중립색) + 둥근 창 */}
      <MixedSolid
        faces={prismY([[x, top], [x + w, top], [xc, apex]], y, y + d)}
        inner={
          <>
            <path d={circle(0.19)} style={{ fill: glass.L }} data-glass="L" />
            <Line d={cross} tone="lo" />
            <Line d={circle(0.19)} tone="mid" />
            <Line d={circle(0.235)} tone="faint" />
          </>
        }
      />
      {/* 지붕판 둘 (장소색) */}
      <MixedSolid faces={prismY([[x - o, lo - THICK], [x - o, lo], [xc, apex], [xc, apex - THICK]], y0, y1, { sides: 'roof', caps: 'roof' })} paints={{ roof }} edge={roof.edge} crease={roof.crease} inner={<Line d={seamsL.join('')} color={roof.crease} />} />
      <MixedSolid faces={prismY([[xc, apex - THICK], [xc, apex], [x + w + o, lo], [x + w + o, lo - THICK]], y0, y1, { sides: 'roof', caps: 'roof' })} paints={{ roof }} edge={roof.edge} crease={roof.crease} inner={<Line d={seamsR.join('')} color={roof.crease} />} />
      {/* 용마루 덮개 */}
      <MixedSolid faces={prismY([[xc - 0.06, apex - 0.015], [xc, apex + 0.035], [xc + 0.06, apex - 0.015]], y0 - 0.01, y1 + 0.01, { sides: 'ridge', caps: 'ridge' })} paints={{ ridge: ridgePaint }} edge={roof.edge} crease={roof.crease} />
      {/* 굴뚝 + 갓 */}
      <Solid paths={polySolid(chimney)} tone="mid" />
      <Solid paths={slab({ x: cx0 - 0.025, y: cy0 - 0.025, w: 0.27, d: 0.27, r: 0.01 }, zt, 0.04, 2, 0.01)} tone="mid" />
      {/* 오른쪽 처마 빗물받이 */}
      <Solid paths={slab({ x: x + w + o - 0.015, y: y0, w: 0.07, d: y1 - y0, r: 0.02 }, lo - THICK - 0.035, 0.05, 2, 0.01)} tone="mid" />
      {/* 문 위 차양 (문이 왼쪽 면에 있을 때): 기운 판 + 받침 둘 */}
      {fp.door === 'L' && (
        <>
          <Line d={[-0.42, 0.42].map((dx) => line3([[doorCenter + dx, y + d, 0.64], [doorCenter + dx, y + d + 0.27, 0.775]])).join('')} tone="mid" />
          <Dots points={dots([[doorCenter - 0.42, y + d, 0.64], [doorCenter + 0.42, y + d, 0.64]])} size={0.7} tone="hi" />
          <MixedSolid
            faces={prismX([[y + d, 0.86], [y + d, 0.92], [y + d + 0.34, 0.8], [y + d + 0.34, 0.74]], doorCenter - 0.5, doorCenter + 0.5, { sides: 'roof', caps: 'roof' })}
            paints={{ roof }}
            edge={roof.edge}
            crease={roof.crease}
          />
        </>
      )}
    </>
  )
}
