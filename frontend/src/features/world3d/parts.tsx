import { forwardRef, memo, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import { AdditiveBlending, CanvasTexture, DoubleSide, PlaneGeometry, SRGBColorSpace, type BufferGeometry, type Group } from 'three'
import { PLACES } from '@/config/places'
import type { Footprint, Place, PlaceId } from '@/domain/types'
import { shade } from '@/lib/iso'
import { entryPath, FLAG_BASE, FLAG_CLOTH, FLAG_POLE, FLOOR, PAD } from '@/features/campus/geometry'
import { BENCHES, FLAG_AT, GRID as N, GROUND_FAR as F, LAWNS, PLAZA, WALK_BAND } from '@/features/campus/layout'
import { ROOF_RISE, SAW_TEETH, SCREEN } from '@/features/campus/roofs/heights'
import type { Season } from '@/features/campus/trees/season'
import { treesGeometry } from './treesGeometry'
import { halfEllipse, halfShell, prismXZ, prismYZ } from './geometry3d'
import { LIT, LIT_GLOW, type Palette } from './palette'

/*
 * 3D 캠퍼스 부품. 모두 '눌린 그룹'(Y 배율 Z_SCALE) 안에서 격자 단위로 놓는다: X = 격자 x, Y = 높이 z, Z = 격자 y.
 * 모양 · 자리 · 색은 SVG 지도(campus/*)와 같은 값을 쓴다.
 */

/* ── 기본 조각 ─────────────────────────────────────────── */

interface BlockProps {
  x: number
  y: number
  w: number
  d: number
  z0: number
  h: number
  color: string
  /** 1px 테두리 (벽처럼 바닥과 색이 비슷한 면을 또렷하게) */
  edge?: string
  cast?: boolean
  /** 빛을 받지 않는 평평한 색 (땅 · 길 · 잔디 윗면) */
  flat?: boolean
  emissive?: string
}

/** 격자 상자 (x, y 바닥 · w, d 크기 · z0 에서 h 높이) */
export function Block({ x, y, w, d, z0, h, color, edge, cast = false, flat = false, emissive }: BlockProps) {
  return (
    <mesh position={[x + w / 2, z0 + h / 2, y + d / 2]} castShadow={cast}>
      <boxGeometry args={[w, h, d]} />
      {flat ? <meshBasicMaterial color={color} /> : <meshLambertMaterial color={color} emissive={emissive ?? '#000000'} />}
      {edge && <Edges color={edge} threshold={20} />}
    </mesh>
  )
}

function Shape({ geometry, color, edge, cast = false, double = false }: { geometry: BufferGeometry; color: string; edge?: string; cast?: boolean; double?: boolean }) {
  return (
    <mesh geometry={geometry} castShadow={cast}>
      <meshLambertMaterial color={color} side={double ? DoubleSide : undefined} />
      {edge && <Edges color={edge} threshold={20} />}
    </mesh>
  )
}

/* ── 땅 ─────────────────────────────────────────────── */

/** 땅 + 보행로 + 잔디판 + 문 앞 길 + 광장. 빛을 받지 않는 평평한 색이라 SVG 지도와 같은 색이 그대로 나온다 */
export const Ground3D = memo(function Ground3D({ pal }: { pal: Palette }) {
  const [w0, w1] = WALK_BAND
  const [px0, py0, px1, py1] = PLAZA
  const entries = PLACES.flatMap((p) => (p.footprint ? [entryPath(p.footprint)] : []))
  return (
    <group>
      <Block x={-F} y={-F} w={N + 2 * F} d={N + 2 * F} z0={-0.05} h={0.05} color={pal.ground} flat />
      <Block x={-F} y={w0} w={N + 2 * F} d={w1 - w0} z0={0} h={0.004} color={pal.walk} flat />
      <Block x={w0} y={-F} w={w1 - w0} d={N + 2 * F} z0={0} h={0.004} color={pal.walk} flat />
      {LAWNS.map(([a, b, c, d]) => (
        <Block key={`${a}-${b}`} x={a} y={b} w={c - a} d={d - b} z0={0} h={0.03} color={pal.grass} edge={pal.grassEdge} flat />
      ))}
      {entries.map(([a, b, c, d]) => (
        <Block key={`e-${a}-${b}`} x={a} y={b} w={c - a} d={d - b} z0={0} h={0.034} color={pal.walk} flat />
      ))}
      <Block x={px0} y={py0} w={px1 - px0} d={py1 - py0} z0={0} h={0.025} color={pal.plaza} edge={pal.plazaEdge} flat />
      {[1.45, 0.42].map((r) => (
        <mesh key={r} position={[FLAG_AT[0], 0.026, FLAG_AT[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r - 0.012, r + 0.012, 72]} />
          <meshBasicMaterial color={r > 1 ? pal.plazaRing : pal.plazaLine} />
        </mesh>
      ))}
    </group>
  )
})

/* ── 건물 ─────────────────────────────────────────────── */

const DOOR_HALF = 0.28
const DOOR_H = 0.62
const STOREY = 0.62
const RIBBON = 0.3
const MULLION = 0.85
const T = 0.012

/** 층마다 유리 띠 + 창살 + 문 (anatomy shell 의 Openings 와 같은 자리) */
function Openings3D({ fp, color, pal }: { fp: Footprint; color: string; pal: Palette }) {
  const { x, y, w, d, h, door } = fp
  const top = FLOOR + h
  const dc = door === 'L' ? x + w / 2 : y + d / 2
  const items: ReactNode[] = []
  const slab = (key: string, f: 'L' | 'R', a0: number, a1: number, z0: number, z1: number, c: string, out = T) =>
    f === 'L' ? <Block key={key} x={a0} y={y + d} w={a1 - a0} d={out} z0={z0} h={z1 - z0} color={c} /> : <Block key={key} x={x + w} y={a0} w={out} d={a1 - a0} z0={z0} h={z1 - z0} color={c} />
  const ribbon = (f: 'L' | 'R', a0: number, a1: number, zz: number) => {
    if (a1 - a0 < 0.4) return
    const k = `${f}-${a0.toFixed(2)}-${zz.toFixed(2)}`
    items.push(slab(k, f, a0, a1, zz, zz + RIBBON, pal.glass))
    const n = Math.max(1, Math.round((a1 - a0) / MULLION))
    for (let m = 1; m < n; m++) {
      const a = a0 + ((a1 - a0) * m) / n
      items.push(slab(`${k}-${m}`, f, a - 0.025, a + 0.025, zz, zz + RIBBON, pal.wall, T * 2))
    }
  }
  for (let zz = FLOOR + 0.3; zz + RIBBON <= top - 0.16; zz += STOREY) {
    for (const f of ['L', 'R'] as const) {
      const a0 = (f === 'L' ? x : y) + 0.26
      const a1 = (f === 'L' ? x + w : y + d) - 0.26
      if (f === door && zz < FLOOR + DOOR_H + 0.1) {
        ribbon(f, a0, dc - DOOR_HALF - 0.24, zz)
        ribbon(f, dc + DOOR_HALF + 0.24, a1, zz)
      } else ribbon(f, a0, a1, zz)
    }
  }
  const fo = DOOR_HALF + 0.08
  items.push(slab('frame', door, dc - fo, dc + fo, FLOOR, FLOOR + DOOR_H + 0.08, color, T))
  items.push(slab('door', door, dc - DOOR_HALF, dc + DOOR_HALF, FLOOR, FLOOR + DOOR_H, pal.door, T * 2))
  return <>{items}</>
}

/** 평지붕 + 발표 화면 + 실외기 · 점검구 + 현관 (커뮤니티) */
function ScreenRoof3D({ fp, color, top, pal }: { fp: Footprint; color: string; top: number; pal: Palette }) {
  const { x, y, w, d } = fp
  const P = 0.1
  const rim = 0.12
  const z0 = top + P
  const frameZ = z0 + SCREEN.legs
  const frameH = top + ROOF_RISE.screen - frameZ
  const sx = x + SCREEN.dx
  const sy = y + SCREEN.dy
  const face = sy + SCREEN.d
  const dc = y + d / 2
  const ac = { x: x + w - 0.95, y: y + d - 0.95 }
  return (
    <>
      <Block x={x} y={y} w={w} d={d} z0={top} h={0.04} color={shade(color, 0.34)} />
      <Block x={x} y={y} w={w} d={rim} z0={top} h={P} color={color} cast />
      <Block x={x} y={y + d - rim} w={w} d={rim} z0={top} h={P} color={color} cast />
      <Block x={x} y={y + rim} w={rim} d={d - 2 * rim} z0={top} h={P} color={color} />
      <Block x={x + w - rim} y={y + rim} w={rim} d={d - 2 * rim} z0={top} h={P} color={color} />
      {/* 점검구 · 실외기(둥근 팬) */}
      <Block x={x + 0.45} y={y + d - 0.78} w={0.36} d={0.32} z0={top + 0.04} h={0.06} color={pal.wall} edge={pal.edge} />
      <Block x={ac.x} y={ac.y} w={0.62} d={0.5} z0={top + 0.04} h={0.24} color={pal.wall} edge={pal.edge} cast />
      <mesh position={[ac.x + 0.22, top + 0.285, ac.y + 0.25]}>
        <cylinderGeometry args={[0.17, 0.17, 0.01, 24]} />
        <meshLambertMaterial color={pal.faint} />
      </mesh>
      <Block x={sx + 0.3} y={sy + 0.02} w={0.08} d={0.08} z0={z0} h={SCREEN.legs} color={pal.wall} />
      <Block x={sx + SCREEN.w - 0.38} y={sy + 0.02} w={0.08} d={0.08} z0={z0} h={SCREEN.legs} color={pal.wall} />
      <Block x={sx} y={sy} w={SCREEN.w} d={SCREEN.d} z0={frameZ} h={frameH} color={color} cast />
      {/* 흰 화면 + 슬라이드 줄 (제목 한 줄 + 본문 두 줄, 실제 글자는 쓰지 않는다) */}
      <Block x={sx + 0.09} y={face} w={SCREEN.w - 0.18} d={0.01} z0={frameZ + 0.09} h={frameH - 0.18} color={pal.night ? '#cfd5de' : '#ffffff'} flat />
      <Block x={sx + 0.3} y={face + 0.01} w={0.95} d={0.006} z0={frameZ + frameH - 0.3} h={0.075} color={pal.ink500} flat />
      <Block x={sx + 0.3} y={face + 0.01} w={1.6} d={0.006} z0={frameZ + frameH - 0.55} h={0.075} color={pal.edge} flat />
      <Block x={sx + 0.3} y={face + 0.01} w={1.3} d={0.006} z0={frameZ + frameH - 0.75} h={0.075} color={pal.edge} flat />
      {fp.door === 'R' && (
        <>
          {[-0.62, 0.54].map((o) => (
            <mesh key={o} position={[x + w + 0.48, FLOOR + 0.37, dc + o + 0.04]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 0.74, 10]} />
              <meshLambertMaterial color={pal.wall} />
            </mesh>
          ))}
          <Block x={x + w} y={dc - 0.78} w={0.62} d={1.56} z0={FLOOR + 0.74} h={0.08} color={color} cast />
        </>
      )}
    </>
  )
}

/** 톱니 지붕 (프로젝트). live(G-Sprint 기간)면 톱니창에 따뜻한 불, 밤이면 둘레로 번진다 */
function SawRoof3D({ fp, color, top, live, pal }: { fp: Footprint; color: string; top: number; live: boolean; pal: Palette }) {
  const { x, y, w, d } = fp
  const p = d / SAW_TEETH
  const R = ROOF_RISE.saw
  const geos = useMemo(
    () =>
      Array.from({ length: SAW_TEETH }, (_, k) => {
        const a = y + k * p
        const e = a + p
        const tri: Array<[number, number]> = [
          [a, top],
          [e, top + R],
          [e, top],
        ]
        return { slope: prismYZ(tri, x, x + w - 0.012), cap: prismYZ(tri, x + w - 0.012, x + w + 0.002), a, e, k }
      }),
    [x, y, w, p, top, R],
  )
  const frame = shade(color, -0.12)
  const glow = useMemo(() => (pal.night && live ? glowTexture() : null), [pal.night, live])
  return (
    <>
      {geos.map(({ slope, cap, a, e, k }) => (
        <group key={k}>
          <Shape geometry={slope} color={shade(color, 0.08)} cast />
          <Shape geometry={cap} color={pal.wall} edge={pal.edge} />
          <Block x={x} y={e} w={w} d={0.008} z0={top} h={R} color={frame} />
          <Block x={x + 0.08} y={e + 0.008} w={w - 0.16} d={0.008} z0={top + 0.08} h={R - 0.15} color={live ? LIT : pal.glass} emissive={live ? (pal.night ? '#c98a2c' : '#8a5a10') : undefined} />
          {[1, 2].map((m) => (
            <Block key={m} x={x + (w * m) / 3 - 0.02} y={e + 0.016} w={0.04} d={0.008} z0={top + 0.08} h={R - 0.15} color={frame} />
          ))}
          {/* 환기구 (지붕 비탈 위, SVG 와 같은 자리) */}
          {(k === 1 || k === 2) && (
            <mesh position={[x + w * (k === 1 ? 0.2 : 0.55), top + R * 0.42 + 0.06, a + p * 0.42]}>
              <cylinderGeometry args={[0.07, 0.07, 0.14, 14]} />
              <meshLambertMaterial color={pal.wall} />
            </mesh>
          )}
          {glow && (
            <mesh position={[x + w / 2, top + R * 0.5, e + 0.05]}>
              <planeGeometry args={[w * 1.3, R * 2.6]} />
              <meshBasicMaterial map={glow} color={LIT_GLOW} transparent opacity={0.55} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}
    </>
  )
}

/** 밤 불빛 번짐 (가운데가 밝은 둥근 빛 하나, 한 번 만든다) */
let glowTex: CanvasTexture | null = null
function glowTexture(): CanvasTexture {
  if (glowTex) return glowTex
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,0.9)')
  grad.addColorStop(0.45, 'rgba(255,255,255,0.28)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  glowTex = new CanvasTexture(c)
  return glowTex
}

/** 아치 지붕 (팀원 찾기): 장소색 껍질 + 골 두 줄 + 중립색 끝 벽 + 아치 창 */
function ArchRoof3D({ fp, color, top, pal }: { fp: Footprint; color: string; top: number; pal: Palette }) {
  const { x, y, w, d } = fp
  const R = d / 2
  const rise = ROOF_RISE.arch
  const yc = y + R
  const g = useMemo(() => {
    const wall = halfEllipse(yc, R, top, rise)
    const win = halfEllipse(yc, 0.85, top + 0.08, 0.58)
    return {
      shell: halfShell(R + 0.01, rise + 0.01, w + 0.04, x + w / 2, top, yc),
      ribs: [1 / 3, 2 / 3].map((f) => halfShell(R + 0.035, rise + 0.035, 0.05, x + w * f, top, yc)),
      back: prismYZ(wall, x, x + 0.02),
      front: prismYZ(wall, x + w - 0.02, x + w),
      win: prismYZ(win, x + w, x + w + 0.012),
    }
  }, [x, w, R, rise, top, yc])
  return (
    <>
      <Shape geometry={g.shell} color={color} cast double />
      {g.ribs.map((r, i) => (
        <Shape key={i} geometry={r} color={shade(color, -0.2)} double />
      ))}
      <Shape geometry={g.back} color={pal.wall} />
      <Shape geometry={g.front} color={pal.wall} edge={pal.edge} />
      <Shape geometry={g.win} color={pal.glass} />
    </>
  )
}

/** 박공지붕 집 (지원 안내): 앞 박공 벽 + 지붕 판 둘 + 둥근 창 + 굴뚝 + 문 위 차양 */
function GableRoof3D({ fp, color, top, pal }: { fp: Footprint; color: string; top: number; pal: Palette }) {
  const { x, y, w, d } = fp
  const R = ROOF_RISE.gable
  const o = 0.14
  const th = 0.07
  const xc = x + w / 2
  const lo = top - th
  const dc = x + w / 2
  // 오른쪽 지붕판 윗면 높이 (굴뚝 밑동)
  const roofZ = (cx: number) => top + R - ((cx - xc) / (x + w + o - xc)) * (top + R - lo)
  const cx0 = x + w - 0.62
  const g = useMemo(
    () => ({
      gable: prismXZ([[x, top], [x + w, top], [xc, top + R]], y, y + d),
      left: prismXZ([[x - o, lo - th], [x - o, lo], [xc, top + R], [xc, top + R - th]], y - o, y + d + o),
      right: prismXZ([[xc, top + R - th], [xc, top + R], [x + w + o, lo], [x + w + o, lo - th]], y - o, y + d + o),
      canopy: prismXZ([[dc - 0.5, 0], [dc + 0.5, 0], [dc + 0.5, 0.06], [dc - 0.5, 0.06]], 0, 0.36),
    }),
    [x, y, w, d, R, top, lo, xc, dc],
  )
  const zt = roofZ(cx0) + 0.32
  const zb = roofZ(cx0 + 0.22) - 0.04
  return (
    <>
      <Shape geometry={g.gable} color={pal.wall} edge={pal.edge} cast />
      <Shape geometry={g.left} color={color} cast />
      <Shape geometry={g.right} color={color} cast />
      <Block x={cx0} y={y + d - 0.75} w={0.22} d={0.22} z0={zb} h={zt - zb} color={pal.wall} edge={pal.edge} cast />
      <mesh position={[xc, top + 0.36, y + d + 0.006]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.012, 24]} />
        <meshLambertMaterial color={pal.glass} />
      </mesh>
      {fp.door === 'L' && (
        <mesh geometry={g.canopy} position={[0, 0.8, y + d]} rotation={[0.32, 0, 0]} castShadow>
          <meshLambertMaterial color={shade(color, 0.1)} />
        </mesh>
      )}
    </>
  )
}

export interface BuildingInput {
  place: Place
  fp: Footprint
  active: boolean
  /** 지붕 장소색 (밤이면 어둡게) */
  color: string
  /** 창에 불 (G-Sprint 기간 작업실) */
  live: boolean
  pal: Palette
  onOver: (id: PlaceId) => void
  onOut: (id: PlaceId) => void
  onPick: (id: PlaceId) => void
}

/** 마우스를 올리거나 고르면 몸체가 살짝 떠오른다 (그림자는 땅에 남는다) */
function Lift({ on, children }: { on: boolean; children: ReactNode }) {
  const ref = useRef<Group>(null)
  const invalidate = useThree((s) => s.invalidate)
  useFrame((_, delta) => {
    const g = ref.current
    if (!g) return
    const dt = Math.min(delta, 1 / 20)
    const goal = on ? 0.16 : 0
    const next = g.position.y + (goal - g.position.y) * (1 - Math.exp(-dt * 14))
    g.position.y = Math.abs(goal - next) < 0.0005 ? goal : next
    if (g.position.y !== goal) invalidate()
  })
  return <group ref={ref}>{children}</group>
}

export const Building3D = memo(
  forwardRef<Group, BuildingInput>(function Building3D({ place, fp, active, color, live, pal, onOver, onOut, onPick }, ref) {
    const { x, y, w, d, h } = fp
    const top = FLOOR + h
    return (
      <group
        ref={ref}
        onPointerOver={(e) => {
          e.stopPropagation()
          onOver(place.id)
        }}
        onPointerOut={() => onOut(place.id)}
        onClick={(e) => {
          e.stopPropagation()
          onPick(place.id)
        }}
      >
        <Lift on={active}>
          <Block x={x - PAD} y={y - PAD} w={w + PAD * 2} d={d + PAD * 2} z0={0} h={FLOOR} color={pal.plaza} edge={pal.edge} />
          <Block x={x} y={y} w={w} d={d} z0={FLOOR} h={h} color={pal.wall} edge={pal.edge} cast />
          <Openings3D fp={fp} color={color} pal={pal} />
          {fp.roof === 'screen' && <ScreenRoof3D fp={fp} color={color} top={top} pal={pal} />}
          {fp.roof === 'saw' && <SawRoof3D fp={fp} color={color} top={top} live={live} pal={pal} />}
          {fp.roof === 'arch' && <ArchRoof3D fp={fp} color={color} top={top} pal={pal} />}
          {fp.roof === 'gable' && <GableRoof3D fp={fp} color={color} top={top} pal={pal} />}
        </Lift>
      </group>
    )
  }),
)

/* ── 광장 깃발 ─────────────────────────────────────────── */

/** 기수 숫자를 그린 깃발 천 무늬 (글자가 아니라 FlagPlaza 의 숫자 그림을 그대로) */
/** 깃발 천의 GDG 로고 (public/brand/gdg-logo.png) */
const FLAG_LOGO = `${import.meta.env.BASE_URL}brand/gdg-logo.png`

/** 흰 천 + GDG 로고 (4기 Organizer 요청 2026-11). 로고 그림을 받으면 그려 넣고 loaded 를 부른다 (다시 그리기) */
function flagTexture(loaded: () => void): CanvasTexture {
  const W = 290
  const H = 184
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, W, H)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  const img = new Image()
  img.onload = () => {
    const w = W * 0.72
    const h = (w * img.naturalHeight) / img.naturalWidth
    g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h)
    t.needsUpdate = true
    loaded()
  }
  img.src = FLAG_LOGO
  return t
}

/** 깃발 천: 깃대 쪽은 묶이고 끝으로 갈수록 살짝 굽은 모양 (움직이지 않는다) */
function clothGeometry(len: number, ch: number): PlaneGeometry {
  const g = new PlaneGeometry(len, ch, 14, 4)
  g.rotateY(Math.PI / 2)
  g.translate(0, 0, -len / 2)
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const u = -pos.getZ(i) / len
    pos.setX(i, Math.sin(u * 4.6 - 0.6) * 0.06 * u)
  }
  g.computeVertexNormals()
  return g
}

export const Flag3D = memo(function Flag3D({ pal, onOver, onOut, onPick, active }: { gen: string; pal: Palette; active: boolean; onOver: (id: PlaceId) => void; onOut: (id: PlaceId) => void; onPick: (id: PlaceId) => void }) {
  const [fx, fy] = FLAG_AT
  const pole = FLAG_POLE / 32
  const top = FLAG_BASE + pole
  const ch = FLAG_CLOTH.h
  const invalidate = useThree((st) => st.invalidate)
  const tex = useMemo(() => flagTexture(() => invalidate()), [invalidate])
  const geo = useMemo(() => clothGeometry(FLAG_CLOTH.len, ch), [ch])
  const poleColor = pal.night ? '#8a909a' : pal.ink500
  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation()
        onOver('about')
      }}
      onPointerOut={() => onOut('about')}
      onClick={(e) => {
        e.stopPropagation()
        onPick('about')
      }}
    >
      {/* 깃대가 가늘어 누르기 어렵다: 보이지 않는 넓은 자리 */}
      <mesh position={[fx + 0.1, top * 0.55, fy - 0.6]} visible={false}>
        <boxGeometry args={[1, top * 1.1, 1.9]} />
      </mesh>
      <Lift on={active}>
        <Block x={fx - 0.22} y={fy - 0.22} w={0.44} d={0.44} z0={0} h={FLAG_BASE} color={pal.plaza} edge={pal.edge} />
        <mesh position={[fx, FLAG_BASE + pole / 2, fy]} castShadow>
          <cylinderGeometry args={[0.022, 0.026, pole, 10]} />
          <meshLambertMaterial color={poleColor} />
        </mesh>
        <mesh position={[fx, top + 0.04, fy]}>
          <sphereGeometry args={[0.05, 12, 8]} />
          <meshLambertMaterial color={poleColor} />
        </mesh>
        <mesh geometry={geo} position={[fx + 0.02, top - 0.1 - ch / 2, fy - 0.02]} castShadow>
          {/* 빛을 받지 않는 재질: 깃발이 빛을 등져도 흰 천 · 로고 색이 그대로 (밤에만 조금 어둡게) */}
          <meshBasicMaterial map={tex} side={DoubleSide} color={pal.night ? '#c9ccd2' : '#ffffff'} toneMapped={false} />
        </mesh>
      </Lift>
    </group>
  )
})

/* ── 나무 · 벤치 ─────────────────────────────────────────── */

export const Trees3D = memo(function Trees3D({ season, night }: { season: Season; night: boolean }) {
  const geo = useMemo(() => treesGeometry(season, night), [season, night])
  return (
    <mesh geometry={geo} castShadow>
      <meshLambertMaterial vertexColors />
    </mesh>
  )
})

export const Benches3D = memo(function Benches3D({ pal }: { pal: Palette }) {
  const L = 0.7
  const D = 0.22
  return (
    <group>
      {BENCHES.map(([x, y, dir]) => {
        const [w, d] = dir === 'x' ? [L, D] : [D, L]
        const legs: Array<[number, number]> = dir === 'x' ? [[x + 0.06, y + 0.06], [x + L - 0.12, y + 0.06]] : [[x + 0.06, y + 0.06], [x + 0.06, y + L - 0.12]]
        return (
          <group key={`${x}-${y}`}>
            {legs.map(([lx, ly]) => (
              <Block key={`${lx}-${ly}`} x={lx} y={ly} w={dir === 'x' ? 0.06 : 0.12} d={dir === 'x' ? 0.12 : 0.06} z0={0} h={0.13} color={pal.iron} />
            ))}
            <Block x={x} y={y} w={dir === 'x' ? L : 0.05} d={dir === 'x' ? 0.05 : L} z0={0.13} h={0.24} color={pal.wood} cast />
            <Block x={x} y={y} w={w} d={d} z0={0.13} h={0.05} color={pal.wood} cast />
          </group>
        )
      })}
    </group>
  )
})
