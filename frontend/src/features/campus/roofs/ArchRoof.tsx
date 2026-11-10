import { line3, prismX, slab, ZK, type V3 } from '../anatomy/kit'
import { Line, MixedSolid, Solid } from '../anatomy/draw'
import { placePaint } from '../anatomy/paint'
import { ROOF_RISE } from './heights'
import { GLASS, type RoofProps } from './types'

const RISE = ROOF_RISE.arch
const SEGMENTS = 18
/** 지붕을 가로지르는 골(띠) 수 */
const RIBS = 5

/**
 * 아치 지붕 (anatomy 방식): 반타원 단면을 x 로 민 곡면 하나. 곡면 조각은 빛 방향대로 네 단으로 칠하고(원기둥과 같은 규칙),
 * 조각 사이 접힌 선은 긋지 않는다. 골 띠는 처마에서 실루엣까지 끝에서 끝으로, 앞 처마에 빗물받이.
 * 끝벽은 중립색, 아치 창은 부채꼴 창살.
 */
export function ArchRoof({ fp, color, top, glass = GLASS }: RoofProps) {
  const { x, y, w, d } = fp
  const R = d / 2
  const yc = y + R
  const at = (th: number): [number, number] => [yc - R * Math.cos(th), top + RISE * Math.sin(th)]
  const section = Array.from({ length: SEGMENTS + 1 }, (_, i) => at((Math.PI * i) / SEGMENTS))
  const roof = placePaint(color)
  // 보는 쪽을 향한 곡면만 (anatomy 카메라: 높이를 ZK 배 해서 법선을 잰다)
  const facing = (th: number) => -Math.cos(th) * RISE * ZK * 0.612 + Math.sin(th) * R * 0.5 > 0
  const ribs = Array.from({ length: RIBS }, (_, i) => {
    const xx = x + (w * (i + 1)) / (RIBS + 1)
    const pts: V3[] = []
    for (let j = 0; j <= 48; j++) {
      const th = (Math.PI * j) / 48
      if (!facing(th)) continue
      const [yy, zz] = at(th)
      pts.push([xx, yy, zz])
    }
    return line3(pts)
  })
  const win = (th: number, r = 0.85): V3 => [x + w + 0.006, yc - r * Math.cos(th), top + 0.08 + 0.62 * (r / 0.85) * Math.sin(th)]
  const windowD = line3(Array.from({ length: 17 }, (_, i) => win((Math.PI * i) / 16)), true)
  const spokes = [0.25, 0.5, 0.75].map((f) => line3([[x + w + 0.006, yc, top + 0.08], win(Math.PI * f)])).join('') + line3(Array.from({ length: 9 }, (_, i) => win((Math.PI * i) / 8, 0.36)))
  return (
    <>
      <MixedSolid
        faces={prismX(section, x, x + w, { smooth: true, sides: (i) => (i < SEGMENTS ? 'roof' : undefined) })}
        paints={{ roof }}
        edge={roof.edge}
        inner={
          <>
            <Line d={ribs.join('')} color={roof.crease} />
            <path d={windowD} style={{ fill: glass.R }} data-glass="R" />
            <Line d={spokes} tone="lo" />
            <Line d={windowD} tone="mid" />
          </>
        }
      />
      {/* 앞 처마 빗물받이 */}
      <Solid paths={slab({ x: x - 0.03, y: y + d - 0.03, w: w + 0.06, d: 0.07, r: 0.02 }, top - 0.035, 0.05, 2, 0.01)} tone="mid" />
    </>
  )
}
