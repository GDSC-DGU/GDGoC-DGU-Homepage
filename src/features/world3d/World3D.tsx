import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { advance, Canvas, useFrame, useThree, type RootState } from '@react-three/fiber'
import { AccumulativeShadows, RandomizedLight } from '@react-three/drei'
import { Color, type Group, type Material, type Mesh, type OrthographicCamera } from 'three'
import { PLACE_BY_ID, PLACES } from '@/config/places'
import type { PlaceId } from '@/domain/types'
import { useReducedMotion } from '@/hooks/useMediaQuery'
import { shade } from '@/lib/iso'
import { FLOOR } from '@/features/campus/geometry'
import { FLAG_AT } from '@/features/campus/layout'
import type { Season } from '@/features/campus/trees/season'
import { campusWalk, type CampusWalk } from '@/features/motion/campusWalk'
import { Labels3D } from './Labels3D'
import { readPalette, type Palette } from './palette'
import { Benches3D, Building3D, Flag3D, Ground3D, Trees3D } from './parts'
import { PenNotes3D } from './PenNotes3D'
import { Peeps3D } from './Peeps3D'
import { aimAt, basis, easeInOut, ISO_AZ, ISO_EL, mixPose, parseViewBox, poseFromViewBox, project, world, Z_SCALE, type Pose } from './projection'
import s from './world3d.module.css'

export interface Area {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface World3DProps {
  /** SVG 지도가 쓰는 viewBox (useSceneFit). 3D 첫 그림이 SVG 와 같은 자리에 오게 한다 */
  viewBox: string
  phone: boolean
  /** 좁은 화면: 오른쪽 장소 안내판을 왼쪽으로, 작은 안내판 */
  narrow: boolean
  /** 손글씨 메모 배율 (SVG 지도와 같은 값) */
  penScale: number
  night: boolean
  season: Season
  /** G-Sprint 기간: 작업실(프로젝트 건물) 톱니창에 불 */
  sprint: boolean
  selected: PlaceId
  hovered: PlaceId | null
  hits: Partial<Record<PlaceId, number>> | null
  previewOpen: boolean
  /** 고른 건물을 데려다 놓을 빈 자리 (틀 기준 px). 글자 판을 피한 자리 */
  focusArea: () => Area | null
  genLabel: string
  genNumber: string
  onSelect: (id: PlaceId) => void
  onHover: (id: PlaceId | null) => void
  /** 카메라가 고른 건물에 도착했을 때 (미리보기를 연다) */
  onArrive: () => void
  onHide: () => void
  onReady: () => void
}

const HINT_KEY = 'gdgoc-dgu:world-hint'
const CAM_DIST = 100
/** 마우스 · 첫 연출로 카메라가 돌 때의 축: 광장 가운데 (깃대 발치) */
const PIVOT = world(FLAG_AT[0], FLAG_AT[1], 0)

function applyPose(cam: OrthographicCamera, p: Pose) {
  const { back } = basis(p.az, p.el)
  cam.position.set(p.tx + back[0] * CAM_DIST, back[1] * CAM_DIST, p.tz + back[2] * CAM_DIST)
  cam.up.set(0, 1, 0)
  cam.lookAt(p.tx, 0, p.tz)
  if (cam.zoom !== p.zoom) {
    cam.zoom = p.zoom
    cam.updateProjectionMatrix()
  }
}

/** 고른 장소로 날아갈 때의 카메라: 건물을 빈 자리 가운데에, 조금 돌아서 · 조금 더 위에서 · 1.5배쯤 가까이 */
function flyPose(id: PlaceId, home: Pose, frame: { w: number; h: number }, area: Area): Pose {
  const fp = PLACE_BY_ID[id].footprint
  const center = fp ? world(fp.x + fp.w / 2, fp.y + fp.d / 2, (FLOOR + fp.h) * 0.7) : world(FLAG_AT[0] - 0.5, FLAG_AT[1] - 0.2, 1.3)
  const aw = area.x1 - area.x0
  const ah = area.y1 - area.y0
  const zoom = Math.max(home.zoom * 1.1, Math.min(home.zoom * 1.45, aw / 6.4, ah / 4.6))
  const offset: [number, number] = [(area.x0 + area.x1) / 2 - frame.w / 2, (area.y0 + area.y1) / 2 - frame.h / 2 + ah * 0.08]
  return aimAt(center, offset, { az: ISO_AZ + 0.24, el: ISO_EL + 0.07, zoom })
}

/**
 * 스크롤 이야기 '캠퍼스로 걸어 들어가기'의 카메라: 프로젝트 건물(+ 안내판)을 이야기가 정한 자리(tx, ty)로,
 * 이야기 배율(k)만큼 가까이, 조금 돌아 들어가며 조금 낮게 (SVG 는 확대만 했다).
 */
function walkPose(w: CampusWalk, home: Pose, frame: { w: number; h: number }): Pose {
  const fp = PLACE_BY_ID.projects.footprint!
  const c = world(fp.x + fp.w / 2, fp.y + fp.d / 2, FLOOR + fp.h + 0.35)
  return aimAt(c, [w.tx - frame.w / 2, w.ty - frame.h / 2], { az: ISO_AZ - 0.16, el: ISO_EL - 0.04, zoom: home.zoom * w.k })
}

interface Anim {
  from: Pose
  to: Pose | 'rest'
  /** 시작 시각 (장면 시계). 다음 그림을 그릴 때 정한다: 쉬다가 다시 그리는 첫 장은 시계가 크게 뛰므로 */
  t0: number | null
  dur: number
  arrive?: () => void
}

/**
 * 그림자: 처음 40장(폰 24장)을 한 장씩 쌓아 부드러운 그림자를 한 번 굽고, 다 쌓으면 다시 그리지 않는다
 * (건물이 떠올라도 그림자는 땅에 남는다). 한 번에 다 구우면 그동안 메인 스레드가 멈춰서 그림마다 나눠 쌓는다.
 */
const bakeFrames = (phone: boolean) => (phone || window.location.search.includes('bake=lite') ? 24 : 40)

const BakedShadows = memo(function BakedShadows({ phone, night }: { phone: boolean; night: boolean }) {
  const lite = bakeFrames(phone) < 40
  return (
    <AccumulativeShadows
      key={night ? 'n' : 'd'}
      frames={bakeFrames(phone)}
      temporal
      scale={36}
      position={[7, 0.036, 7]}
      color={night ? '#000000' : '#22304a'}
      colorBlend={1.6}
      opacity={night ? 0.55 : 0.8}
      alphaTest={0.86}
      resolution={lite ? 1024 : 2048}
      toneMapped={false}
    >
      <RandomizedLight amount={lite ? 4 : 6} radius={5} ambient={0.3} intensity={Math.PI} position={[-20, 10, -9]} bias={0.0004} mapSize={lite ? 1024 : 2048} size={56} far={120} />
    </AccumulativeShadows>
  )
})

/** useFrame 은 먼저 등록된 것부터 돈다. 장면의 첫 자식으로 두어 카메라를 안내판(Html)보다 먼저 옮긴다 */
function FirstEachFrame({ fn }: { fn: (state: RootState, delta: number) => void }) {
  useFrame(fn)
  return null
}

/** 다른 건물이 물러나는 정도(0~1)만큼 색을 회색 · 땅색 쪽으로 (SVG 이야기의 opacity + grayscale 대신) */
function fadeGroup(g: Group | null | undefined, back: number, ground: Color) {
  g?.traverse((o) => {
    const mat = (o as Mesh).material as (Material & { color?: Color }) | undefined
    if (!mat || Array.isArray(mat) || !mat.color) return
    const base: Color = (o.userData.base ??= mat.color.clone())
    if (back <= 0) {
      mat.color.copy(base)
      return
    }
    const l = base.r * 0.3 + base.g * 0.59 + base.b * 0.11
    mat.color.setRGB(l, l, l).lerp(ground, 0.55).lerp(base, 1 - back * 0.85)
  })
}

/** 캔버스 위 마우스 모양 (누를 수 있는 건물 위에서 손가락) */
function setCursor(c: string) {
  const el = document.querySelector<HTMLElement>('[data-world] canvas')
  if (el) el.style.cursor = c
}

function Scene(
  props: World3DProps & {
    onPick: (id: PlaceId) => void
    focus: PlaceId | null
    portal: RefObject<HTMLDivElement | null>
    probe: HTMLSpanElement | null
  },
) {
  const { viewBox, phone, narrow, penScale, night, season, sprint, selected, hovered, hits, previewOpen, genLabel, genNumber, onHover, onReady, onPick, focus, focusArea, portal, probe } = props
  const camera = useThree((st) => st.camera) as OrthographicCamera
  const size = useThree((st) => st.size)
  const reduceMotion = useReducedMotion()
  const invalidate = useThree((st) => st.invalidate)
  const gl = useThree((st) => st.gl)
  const vb = useMemo(() => parseViewBox(viewBox), [viewBox])
  const home = useMemo(() => poseFromViewBox(vb, { w: size.width, h: size.height }), [vb, size.width, size.height])
  // 색: 첫 화면 안의 '.campus-iso' 견본에서 (밤이 바뀌면 다시)
  const pal = useMemo<Palette>(() => readPalette(probe, night), [probe, night])

  const homeRef = useRef(home)
  const base = useRef<Pose>(home)
  const anim = useRef<Anim | null>(null)
  const goal = useRef<PlaceId | 'home'>('home')
  const flyGoal = useRef<Pose>(home)
  const par = useRef({ az: 0, el: 0 })
  const parGoal = useRef({ az: 0, el: 0 })
  const hint = useRef<number | 'wait' | null>(null)
  const walk = useRef<CampusWalk>(campusWalk.get())
  const buildings = useRef<Partial<Record<PlaceId, Group | null>>>({})
  const sizeRef = useRef({ w: size.width, h: size.height })
  // 그림자를 다 구운 뒤에 사람(납작한 그림)을 세운다: 굽는 동안 있으면 그림자 판에 그 모양이 얼룩으로 찍힌다
  const frames = useRef(0)
  const [baked, setBaked] = useState(false)
  // 다 구웠음을 층에 표시한다 (그 뒤로는 움직일 때만 그린다. 시험 · 캡처가 이 표시를 기다린다)
  useEffect(() => {
    if (baked) portal.current?.closest('[data-world]')?.setAttribute('data-baked', '')
  }, [baked, portal])

  useEffect(() => {
    homeRef.current = home
    sizeRef.current = { w: size.width, h: size.height }
    invalidate()
  }, [home, size.width, size.height, invalidate])

  /** 쉬는 자리: 첫 화면 자리, 스크롤로 걸어 들어갔으면 그만큼 프로젝트 쪽 */
  const rest = useCallback((): Pose => {
    const w = walk.current
    return w.e > 0 ? mixPose(homeRef.current, walkPose(w, homeRef.current, sizeRef.current), w.e) : homeRef.current
  }, [])

  // 스크롤 이야기: 카메라가 프로젝트 건물로 다가가고, 나머지 건물 · 안내판은 물러난다
  const ground = useMemo(() => new Color(pal.ground), [pal.ground])
  const applyWalk = useCallback(
    (w: CampusWalk) => {
      const back = Math.min(1, w.e * 1.25)
      for (const p of PLACES) if (p.id !== 'projects') fadeGroup(buildings.current[p.id], back, ground)
      const fade = String(1 - Math.min(1, w.e * 1.6))
      portal.current?.querySelectorAll<HTMLElement>('[data-pin]').forEach((el) => {
        el.style.opacity = el.dataset.pin === 'projects' ? '' : w.e > 0 ? fade : ''
      })
    },
    [ground, portal],
  )
  useEffect(
    () =>
      campusWalk.subscribe((w) => {
        walk.current = w
        applyWalk(w)
        invalidate()
      }),
    [applyWalk, invalidate],
  )
  // 색이 바뀌면(밤) 물러난 색을 새 색에서 다시 계산한다
  useEffect(() => {
    for (const g of Object.values(buildings.current)) g?.traverse((o) => delete o.userData.base)
    applyWalk(walk.current)
    invalidate()
  }, [pal, applyWalk, invalidate])

  // 건물을 고르면: 나머지 건물 · 깃발은 회색 · 땅색 쪽으로 물러나고(0.42초), 닫으면 돌아온다
  const focusDim = useRef<{ v: number; keep: PlaceId | null }>({ v: 0, keep: null })
  useEffect(() => {
    const st = focusDim.current
    if (focus) {
      st.keep = focus
      fadeGroup(buildings.current[focus], 0, ground)
    }
    const from = st.v
    const to = focus ? 1 : 0
    let t0: number | null = null
    let raf = 0
    const step = (t: number) => {
      t0 ??= t
      const k = Math.min(1, (t - t0) / 420)
      st.v = from + (to - from) * easeInOut(k)
      for (const p of PLACES) if (p.id !== st.keep) fadeGroup(buildings.current[p.id], st.v * 0.8, ground)
      invalidate()
      if (k < 1) raf = requestAnimationFrame(step)
      else if (to === 0) st.keep = null
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [focus, ground, invalidate])

  // 고른 장소로 날아가기 / 돌아오기
  const flyTo = useCallback(
    (to: PlaceId | 'home', arrive?: () => void) => {
      const area = focusArea() ?? { x0: 0, y0: 0, x1: size.width, y1: size.height }
      const target = to === 'home' ? 'rest' : flyPose(to, homeRef.current, { w: size.width, h: size.height }, area)
      if (target !== 'rest') flyGoal.current = target
      goal.current = to
      anim.current = { from: { ...base.current }, to: target, t0: null, dur: to === 'home' ? 0.75 : 0.95, arrive }
      invalidate()
    },
    [focusArea, size.width, size.height, invalidate],
  )

  // onArrive 가 바뀌어도 다시 날지 않게 ref 로 읽는다
  const arrive = useRef(props.onArrive)
  useEffect(() => {
    arrive.current = props.onArrive
  }, [props.onArrive])
  useEffect(() => {
    if (focus === null) {
      if (goal.current !== 'home') flyTo('home')
    } else if (goal.current !== focus) {
      flyTo(focus, () => arrive.current())
    }
  }, [focus, flyTo])

  // 마우스 위치에 따라 카메라가 조금 돈다 (폰 · 펜 · 터치는 없음)
  useEffect(() => {
    if (phone) return
    const el = gl.domElement
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const r = el.getBoundingClientRect()
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
      // 고른 건물을 보고 있거나 스크롤로 걸어 들어간 동안은 돌지 않는다
      const k = goal.current === 'home' && walk.current.e < 0.02 ? 1 : 0
      parGoal.current = inside ? { az: ((e.clientX - r.left) / r.width - 0.5) * 0.2 * k, el: -((e.clientY - r.top) / r.height - 0.5) * 0.07 * k } : { az: 0, el: 0 }
      invalidate()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [phone, gl, invalidate])

  // 첫 그림이 그려지면 알린다. 세션 첫 방문이면 한 번 살짝 돌아 '입체'임을 보여 준다
  useEffect(() => {
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        onReady()
        try {
          if (window.sessionStorage.getItem(HINT_KEY) !== '1') {
            window.sessionStorage.setItem(HINT_KEY, '1')
            hint.current = 'wait'
          }
        } catch {
          // 저장하지 못해도 돌지 않을 뿐
        }
        invalidate()
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [onReady, invalidate])

  const tick = (state: RootState, delta: number) => {
    // 시간은 모두 장면 시계로 (영상 캡처 때 한 장씩 앞으로 돌릴 수 있게). 쉬다가 다시 그리는 첫 장의 큰 delta 는 자른다
    const now = state.clock.elapsedTime
    const dt = Math.min(delta, 1 / 20)
    let moving = false
    if (!baked) {
      // 다 구울 때까지(+2장) 계속 그린다. 그 뒤로는 움직일 때만
      if (++frames.current > bakeFrames(phone) + 2) setBaked(true)
      else moving = true
    }
    const a = anim.current
    if (a) {
      if (a.t0 === null) a.t0 = now
      const k = Math.min(1, (now - a.t0) / a.dur)
      base.current = mixPose(a.from, a.to === 'rest' ? rest() : a.to, easeInOut(k))
      moving = true
      if (k >= 1) {
        anim.current = null
        a.arrive?.()
      }
    } else {
      base.current = goal.current === 'home' ? rest() : flyGoal.current
    }
    const p = par.current
    const g = parGoal.current
    const f = 1 - Math.exp(-dt * 4.5)
    p.az += (g.az - p.az) * f
    p.el += (g.el - p.el) * f
    if (Math.abs(g.az - p.az) > 1e-4 || Math.abs(g.el - p.el) > 1e-4) moving = true
    let swing = 0
    if (hint.current === 'wait') hint.current = now + 0.5
    if (hint.current !== null) {
      const u = (now - hint.current) / 2.4
      if (u >= 1) hint.current = null
      else if (u > 0) swing = Math.sin(u * Math.PI) ** 2 * 0.22
      moving = true
    }
    const b = base.current
    const daz = p.az + swing
    // 광장 가운데를 축으로 돈다 (화면 가운데가 아니라): 캠퍼스가 옆으로 밀리지 않고 제자리에서 돈다
    const turned = daz === 0 && p.el === 0 ? b : aimAt(PIVOT, project(PIVOT, b), { az: b.az + daz, el: b.el + p.el, zoom: b.zoom })
    applyPose(camera, turned)
    if (moving) invalidate()
  }

  const over = useCallback(
    (id: PlaceId) => {
      onHover(id)
      setCursor('pointer')
    },
    [onHover],
  )
  const out = useCallback(() => {
    onHover(null)
    setCursor('')
  }, [onHover])

  const isActive = (id: PlaceId) => hovered === id || focus === id || (previewOpen && selected === id)
  const labelActive = PLACES.find((p) => isActive(p.id))?.id ?? null

  return (
    <>
      {/* 카메라를 가장 먼저 옮긴다 (안내판이 한 장 늦게 따라오지 않게) */}
      <FirstEachFrame fn={tick} />
      <ambientLight intensity={night ? 1.9 : 2.2} />
      <directionalLight position={[-3.5, 9, -2.5]} intensity={night ? 0.8 : 1.15} />
      <directionalLight position={[0, 3, 10]} intensity={0.52} />
      <BakedShadows phone={phone} night={night} />
      <group scale={[1, Z_SCALE, 1]}>
        <Ground3D pal={pal} />
        <Trees3D season={season} night={night} />
        <Benches3D pal={pal} />
        {PLACES.map((place) =>
          place.footprint ? (
            <Building3D
              key={place.id}
              ref={(g) => void (buildings.current[place.id] = g)}
              place={place}
              fp={place.footprint}
              active={isActive(place.id)}
              color={night ? shade(place.color, -0.5) : place.color}
              live={place.live === true && sprint}
              pal={pal}
              onOver={over}
              onOut={out}
              onPick={onPick}
            />
          ) : (
            <group key={place.id} ref={(g) => void (buildings.current[place.id] = g)}>
              <Flag3D gen={genNumber} pal={pal} active={isActive('about')} onOver={over} onOut={out} onPick={onPick} />
            </group>
          ),
        )}
        <Labels3D active={labelActive} hits={hits} compact={narrow} flip={narrow} genLabel={genLabel} onPick={onPick} onOver={over} onOut={out} portal={portal} />
        <PenNotes3D compact={narrow} scale={penScale} portal={portal} />
      </group>
      {/* 말뚝 사람 (그림자를 다 구운 뒤에 둔다: 굽는 동안 움직이는 것이 있으면 바닥에 얼룩이 남는다) */}
      {baked && <Peeps3D night={night} phone={phone} moving={!reduceMotion} />}
    </>
  )
}

/**
 * 3D 캠퍼스 (three.js + react-three-fiber). 홈 첫 화면에서만 쓰고, 이 파일은 따로 나눠 늦게 받는다 (React.lazy).
 * 처음 그림은 SVG 지도와 같은 자리 · 같은 각도라서, SVG 를 먼저 보여 주다가 이 장면이 준비되면 그 위로 겹쳐 바꾼다.
 * 움직이는 것이 없으면 다시 그리지 않는다 (frameloop demand): 가만히 두면 그리는 일이 0.
 * - 마우스: 카메라가 조금 돈다 · 건물에 올리면 떠오르고 안내판이 뒤집힌다
 * - 누르기: 카메라가 그 건물로 날아간 뒤 미리보기가 열린다 (닫으면 돌아온다)
 * - 스크롤: 이야기(homeStory)가 알려 주는 만큼 프로젝트 건물로 걸어 들어간다
 * - 키보드 · 화면 읽기: 안내판 버튼(HTML)으로 같은 일을 한다
 */
export default function World3D(props: World3DProps) {
  const { onSelect, onHide, previewOpen, phone } = props
  const [focus, setFocus] = useState<PlaceId | null>(null)
  const wasOpen = useRef(previewOpen)

  // 미리보기가 닫히면 (Esc · 닫기 · 바깥 누르기) 카메라가 돌아온다
  useEffect(() => {
    if (wasOpen.current && !previewOpen) setFocus(null)
    wasOpen.current = previewOpen
  }, [previewOpen])

  const onPick = useCallback(
    (id: PlaceId) => {
      if (previewOpen) onHide()
      onSelect(id)
      setFocus(id)
    },
    [previewOpen, onHide, onSelect],
  )

  const labelsRef = useRef<HTMLDivElement>(null)
  const [probe, setProbe] = useState<HTMLSpanElement | null>(null)
  // ?capture: 영상 캡처용. 스스로 그리지 않고 window.__step(초) 로 한 장씩 앞으로 돌린다
  const [capture] = useState(() => window.location.search.includes('capture'))
  return (
    <>
      {/* 색 견본: SVG 지도와 같은 토큰(.campus-iso, 밤 값 포함)을 읽는 자리 */}
      <span ref={setProbe} className={`campus-iso ${s.probe}`} aria-hidden="true" />
      <Canvas
        className={s.canvas}
        orthographic
        flat
        shadows="percentage"
        frameloop={capture ? 'never' : 'demand'}
        dpr={[1, phone ? 1.75 : 2]}
        camera={{ near: 0.1, far: 400, zoom: 1, position: [60, 50, 60] }}
        gl={{ antialias: true, alpha: true, powerPreference: phone ? 'low-power' : 'high-performance' }}
        onCreated={({ gl, scene, camera }) => {
          gl.setClearColor(0xffffff, 0)
          // ?debug: 그리기 횟수 · 삼각형 수를 재려고 렌더러를 꺼내 둔다 (시험용)
          if (window.location.search.includes('debug')) Object.assign(window, { __gl: gl, __scene: scene, __camera: camera })
          if (capture) {
            let t = 0
            Object.assign(window, { __step: (sec: number) => advance((t += sec)) })
          }
        }}
        onPointerMissed={() => setFocus(null)}
      >
        {probe && <Scene {...props} onPick={onPick} focus={focus} portal={labelsRef} probe={probe} />}
      </Canvas>
      {/* 안내판 · 손글씨(HTML) 층: 캔버스와 같은 자리. 빈 곳은 눌러도 캔버스로 통한다.
          건물을 고르면(data-focus) 다른 안내판은 옅어지고 손글씨 메모는 사라진다 */}
      <div ref={labelsRef} className={s.labels} data-focus={focus ?? undefined} />
    </>
  )
}
