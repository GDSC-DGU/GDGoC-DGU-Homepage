import { shade } from '@/lib/iso'
import { FLOOR } from '../geometry'
import { arc, corners, cyl, dots, faceRect, inset, planOutline, radialTicks, ring, seam, slab, type Plan } from '../anatomy/kit'
import { Dots, Line, Solid } from '../anatomy/draw'
import { placePaint } from '../anatomy/paint'
import { ROOF_RISE, SCREEN } from './heights'
import type { RoofProps } from './types'
import s from '../campus.module.css'

/** 지붕 가장자리 턱 높이 */
const PARAPET = 0.1

/**
 * 평지붕 강당 (anatomy 방식): 장소색 턱(둥근 모서리 + 깎은 윗선) 안에 방수층 홈 줄,
 * 지붕 위 실외기(팬 그릴 눈금 · 루버 줄) · 점검구 · 환기관, 다리 위 발표 화면(장소색 틀 + 볼트 넷), 현관(둥근 기둥 둘 + 장소색 차양).
 */
export function ScreenRoof({ fp, color, top, doorCenter }: RoofProps) {
  const { x, y, w, d } = fp
  const z0 = top + PARAPET
  const frameZ = z0 + SCREEN.legs
  const frameH = top + ROOF_RISE.screen - frameZ
  const roof = placePaint(color)
  const plan: Plan = { x, y, w, d, r: 0.05 }
  const deck = inset(plan, 0.12)
  const sy = y + SCREEN.dy + SCREEN.d + 0.004
  const sx = x + SCREEN.dx
  const slide = (u0: number, u1: number, z: number, cls: string) => <path key={`${u0}-${z}`} className={cls} d={faceRect('L', sy, sx + u0, sx + u1, frameZ + z, frameZ + z + 0.075)} />
  // 실외기
  const ac: Plan = { x: x + w - 0.95, y: y + d - 0.95, w: 0.62, d: 0.5, r: 0.04 }
  const fan = { cx: ac.x + 0.22, cy: ac.y + 0.25 }
  const acTop = z0 + 0.24
  const louvres = [0.06, 0.1, 0.14, 0.18].map((dz) => seam(ac, z0 + dz, 3)).join('')
  const fanTicks = radialTicks(fan.cx, fan.cy, 0.17, 16, 4, acTop, [0.05, 0.08])
  // 점검구
  const hatch: Plan = { x: x + 0.45, y: y + d - 0.78, w: 0.36, d: 0.32, r: 0.03 }
  // 화면 다리 · 틀
  const leg = (lx: number): Plan => ({ x: lx, y: y + SCREEN.dy + 0.02, w: 0.08, d: 0.08, r: 0.015 })
  const frame: Plan = { x: sx, y: y + SCREEN.dy, w: SCREEN.w, d: SCREEN.d, r: 0.02 }
  const bolts = dots([
    [sx + 0.05, sy, frameZ + 0.045],
    [sx + SCREEN.w - 0.05, sy, frameZ + 0.045],
    [sx + 0.05, sy, frameZ + frameH - 0.045],
    [sx + SCREEN.w - 0.05, sy, frameZ + frameH - 0.045],
  ])
  return (
    <>
      {/* 턱 (장소색) + 방수층 */}
      <Solid paths={slab(plan, top, PARAPET, 3, 0.02)} paint={roof} tone="lo" />
      <path d={planOutline(deck, z0, 3)} style={{ fill: shade(color, 0.42) }} />
      <Line d={planOutline(deck, z0, 3)} color={roof.crease} />
      <Line d={planOutline(inset(deck, 0.1), z0, 3)} color={shade(color, 0.2)} />
      {/* 점검구 + 환기관 둘 (뒤 → 앞) */}
      <Solid paths={slab(hatch, z0, 0.06, 2, 0.015)} tone="mid" />
      <Line d={planOutline(inset(hatch, 0.05), z0 + 0.06, 2)} tone="faint" />
      {[
        [x + 0.42, y + 0.45],
        [x + 0.62, y + 0.62],
      ].map(([px, py]) => (
        <g key={px}>
          <Solid paths={cyl(px, py, 0.04, z0, 0.16, 12)} tone="mid" crease="none" inner={<Line d={arc(px, py, 0.04, z0 + 0.1, 8)} tone="lo" />} />
          <Solid paths={cyl(px, py, 0.055, z0 + 0.16, 0.025, 12)} tone="mid" />
        </g>
      ))}
      {/* 발표 화면: 다리 둘 + 장소색 틀 + 흰 화면 + 볼트 */}
      <Solid paths={slab(leg(sx + 0.3), z0, SCREEN.legs, 2, 0.01)} tone="mid" />
      <Solid paths={slab(leg(sx + SCREEN.w - 0.38), z0, SCREEN.legs, 2, 0.01)} tone="mid" />
      <Solid paths={slab(frame, frameZ, frameH, 2, 0.015)} paint={roof} tone="lo" />
      <path className={s.screen} d={faceRect('L', sy, sx + 0.09, sx + SCREEN.w - 0.09, frameZ + 0.09, frameZ + frameH - 0.09, 0.02)} />
      {slide(0.3, 1.25, frameH - 0.3, s.slideTitle)}
      {slide(0.3, 1.9, frameH - 0.55, s.slideLine)}
      {slide(0.3, 1.6, frameH - 0.75, s.slideLine)}
      <Line d={faceRect('L', sy, sx + 0.09, sx + SCREEN.w - 0.09, frameZ + 0.09, frameZ + frameH - 0.09, 0.02)} color={roof.edge} />
      <Dots points={bolts} size={0.6} tone="hi" />
      {/* 실외기: 상자 + 둘레 루버 + 팬 그릴 */}
      <Solid paths={slab(ac, z0, 0.24, 3, 0.015)} tone="mid" inner={<Line d={louvres} tone="lo" />} />
      <Line d={ring(fan.cx, fan.cy, 0.17, acTop, 28)} tone="mid" />
      <Line d={fanTicks.minor + fanTicks.major} tone="lo" />
      <Line d={ring(fan.cx, fan.cy, 0.04, acTop, 12)} tone="mid" />
      <Line d={planOutline({ x: ac.x + 0.44, y: ac.y + 0.08, w: 0.12, d: 0.34, r: 0.02 }, acTop, 2)} tone="lo" />
      <Dots points={dots(corners(ac, 0.04).map(([cx, cy]) => [cx, cy, acTop] as const))} size={0.45} />
      {/* 현관 (문이 오른쪽 면에 있을 때): 둥근 기둥 둘 + 장소색 차양 */}
      {fp.door === 'R' && (
        <>
          {[-0.58, 0.58].map((o) => (
            <g key={o}>
              <Solid paths={cyl(x + w + 0.48, doorCenter + o, 0.065, 0, FLOOR, 14)} tone="lo" />
              <Solid paths={cyl(x + w + 0.48, doorCenter + o, 0.04, FLOOR, 0.74, 12)} tone="mid" crease="none" />
            </g>
          ))}
          <Solid
            paths={slab({ x: x + w, y: doorCenter - 0.78, w: 0.62, d: 1.56, r: 0.04 }, FLOOR + 0.74, 0.08, 3, 0.02)}
            paint={roof}
            tone="lo"
            inner={<Line d={seam({ x: x + w, y: doorCenter - 0.78, w: 0.62, d: 1.56, r: 0.04 }, FLOOR + 0.78, 3)} color={roof.crease} />}
          />
        </>
      )}
    </>
  )
}
