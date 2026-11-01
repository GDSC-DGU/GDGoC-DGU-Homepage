import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CapsuleGeometry, CircleGeometry, MeshBasicMaterial, MeshLambertMaterial, SphereGeometry, type Group } from 'three'
import { shade } from '@/lib/iso'
import { BODY_Y, GROUPS, HAIRS, HEAD_Y, PEEP, SHIRTS, SKIN, WALKERS, makeWalkers, stepWalkers, walkerAt } from './peeps'

/**
 * 말뚝 사람 (peeps.ts). 보행로를 오가는 사람 여덟 + 건물 문 앞에서 이야기하는 사람 다섯.
 * - 그림자 굽기에 끼지 않게 다른 층(layer 1)에만 둔다: 굽는 빛은 0층만 보고, 카메라는 1층도 본다.
 *   (누르기 판정도 0층만 보므로 사람을 눌러도 뒤의 건물이 눌린다)
 * - 계속 움직이므로 초당 30장(폰 20장)으로 줄여 그리고, 지도가 화면 밖이거나 탭이 가려져 있으면 그리지 않는다.
 * - '동작 줄이기' 설정이면 걷는 사람은 두지 않고, 문 앞 사람은 가만히 서 있다.
 */
const LAYER = 1
/** 발 높이 (잔디 · 보행로 위) */
const FOOT_Y = 0.03
/** 한 걸음 거리 (칸): 걸음마다 몸이 한 번 통통 뛴다 */
const STEP = 0.24

export const Peeps3D = memo(function Peeps3D({ night, phone, moving }: { night: boolean; phone: boolean; moving: boolean }) {
  const invalidate = useThree((s) => s.invalidate)
  const camera = useThree((s) => s.camera)
  const canvas = useThree((s) => s.gl.domElement)
  const root = useRef<Group>(null)
  const walkers = useMemo(() => makeWalkers(), [])
  const crossing = useRef<{ owner: number | null }>({ owner: null })
  const outer = useRef<Array<Group | null>>([])
  const inner = useRef<Array<Group | null>>([])
  const steps = useRef(walkers.map((_, i) => i * 0.7))

  // 모양 · 재질은 한 벌만 만들어 모두 같이 쓴다
  const geo = useMemo(
    () => ({
      body: new CapsuleGeometry(PEEP.bodyR, PEEP.bodyLen, 4, 12),
      head: new SphereGeometry(PEEP.headR, 16, 12),
      hair: new SphereGeometry(PEEP.hairR, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
      shadow: new CircleGeometry(0.115, 18),
    }),
    [],
  )
  const mat = useMemo(() => {
    const tone = (c: string) => (night ? shade(c, -0.4) : c)
    return {
      shirts: SHIRTS.map((c) => new MeshLambertMaterial({ color: tone(c) })),
      hairs: HAIRS.map((c) => new MeshLambertMaterial({ color: tone(c) })),
      skin: new MeshLambertMaterial({ color: tone(SKIN) }),
      shadow: new MeshBasicMaterial({ color: '#191b1f', transparent: true, opacity: night ? 0.22 : 0.16, depthWrite: false }),
    }
  }, [night])
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo])
  useEffect(
    () => () => {
      ;[...mat.shirts, ...mat.hairs, mat.skin, mat.shadow].forEach((m) => m.dispose())
    },
    [mat],
  )

  // 그림자 굽기에서 빼기: 사람은 1층에만, 카메라는 1층도 본다
  useLayoutEffect(() => {
    root.current?.traverse((o) => o.layers.set(LAYER))
    camera.layers.enable(LAYER)
    invalidate()
  }, [camera, invalidate, moving, night])

  // 초당 30장(폰 20장): 지도가 화면에 보이고 탭이 앞에 있을 때만
  useEffect(() => {
    if (!moving) return
    let onscreen = true
    const io = new IntersectionObserver(([e]) => {
      onscreen = e.isIntersecting
    })
    io.observe(canvas)
    const id = window.setInterval(() => {
      if (onscreen && !document.hidden) invalidate()
    }, 1000 / (phone ? 20 : 30))
    return () => {
      window.clearInterval(id)
      io.disconnect()
    }
  }, [moving, phone, canvas, invalidate])

  useFrame((state, delta) => {
    if (!moving) return
    // 오래 쉬었다 다시 그리는 첫 장의 큰 delta 는 자른다
    const dt = Math.min(delta, 0.1)
    const t = state.clock.elapsedTime
    stepWalkers(walkers, dt, crossing.current)
    walkers.forEach((w, i) => {
      const o = outer.current[i]
      const b = inner.current[i]
      if (!o || !b) return
      const [x, y] = walkerAt(w)
      o.position.set(x, FOOT_Y, y)
      if (!w.waiting) steps.current[i] += (w.speed * dt) / STEP
      const ph = steps.current[i] * Math.PI
      // 걸을 때: 걸음마다 통통, 좌우로 살짝 흔들. 기다릴 때: 천천히 제자리로
      const k = w.waiting ? 0 : 1
      b.position.y += (k * Math.abs(Math.sin(ph)) * 0.026 - b.position.y) * Math.min(1, dt * 12)
      b.rotation.z += (k * Math.sin(ph) * 0.08 - b.rotation.z) * Math.min(1, dt * 12)
    })
    // 문 앞 사람: 숨 쉬듯 아주 조금, 가끔 고개(몸)를 돌린다
    let n = walkers.length
    GROUPS.forEach((g, gi) =>
      g.forEach((_, pi) => {
        const b = inner.current[n]
        if (b) {
          b.position.y = Math.max(0, Math.sin(t * 1.6 + n)) * 0.006
          b.rotation.y = Math.sin(t * 0.45 + gi * 2 + pi * 1.3) * 0.35
        }
        n++
      }),
    )
  })

  // 걷는 사람(0 ~ 7) + 문 앞 사람(8 ~). 문 앞 사람은 무리 가운데를 본다
  const people = useMemo(() => {
    const walking = WALKERS.map(([, , , shirt, hair], i) => {
      const w = walkers[i]
      const [x, y] = walkerAt(w)
      return { key: i, x, y, shirt, hair, heading: Math.atan2(w.dir[0], w.dir[1]) }
    })
    let n = walkers.length
    const standing = GROUPS.flatMap((g) => {
      const cx = g.reduce((a, p) => a + p[0], 0) / g.length
      const cy = g.reduce((a, p) => a + p[1], 0) / g.length
      return g.map(([x, y, shirt, hair]) => ({ key: n++, x, y, shirt, hair, heading: Math.atan2(cx - x, cy - y) }))
    })
    return [...(moving ? walking : []), ...standing]
  }, [walkers, moving])

  return (
    <group ref={root}>
      {people.map((p) => (
        <group key={p.key} ref={(g) => void (outer.current[p.key] = g)} position={[p.x, FOOT_Y, p.y]} rotation={[0, p.heading, 0]}>
          <mesh geometry={geo.shadow} material={mat.shadow} position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]} />
          <group ref={(g) => void (inner.current[p.key] = g)}>
            <mesh geometry={geo.body} material={mat.shirts[p.shirt]} position={[0, BODY_Y, 0]} />
            <mesh geometry={geo.head} material={mat.skin} position={[0, HEAD_Y, 0]} />
            {/* 머리카락: 뒤로 조금 기울여 이마가 보이게 (어느 쪽을 보는지 알 수 있다) */}
            <mesh geometry={geo.hair} material={mat.hairs[p.hair]} position={[0, HEAD_Y, 0]} rotation={[-0.4, 0, 0]} />
          </group>
        </group>
      ))}
    </group>
  )
})
