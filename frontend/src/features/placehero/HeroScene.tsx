import { useMemo } from 'react'
import { PLACES } from '@/config/places'
import { depthOfBox } from '@/lib/iso'
import { Ground } from '@/features/campus/Ground'
import { GLASS, LIT } from '@/features/campus/roofs/types'
import { sceneryItems, type SceneItem } from '@/features/campus/scenery'
import { QUIET_ROOF, StaticBuilding } from '@/features/campus/StaticBuilding'
import { PEEP_DEFS } from '@/features/campus/peeps/peepArt'
import { Hoarding, Scaffold } from './Construction'
import { ConstructionCrew } from './ConstructionCrew'
import type { BuildingLook, HeroPlace } from './look'
import { ScreenSlide } from './ScreenSlide'
import s from './placehero.module.css'

/** 불 꺼진 창 (문 닫음 · 공사 중): 낮 유리보다 한 단 어둡고 덜 파랗다 */
const DARK = { L: 'var(--c-glass-shut-l)', R: 'var(--c-glass-shut-r)' } as const

interface Props {
  place: HeroPlace
  look: BuildingLook
  screen?: { date: string; title: string }
  viewBox: string
  /** 서 있는 · 앉은 사람을 그릴지 (넓은 화면만. 좁은 장면에서는 너무 작다) */
  people: boolean
}

/**
 * 하위 페이지 머리 장면: 홈 지도와 같은 땅 · 나무 · 건물을 그 건물 쪽으로 확대한다.
 * 지금 페이지의 건물만 장소색, 나머지는 중립색 지붕 (꺼진 건물). 광장 깃발(주황)은 그리지 않는다.
 * 꾸밈이므로 aria-hidden: 제목 · 설명 · 안내판은 바깥 HTML 이 맡는다.
 */
export function HeroScene({ place, look, screen, viewBox, people }: Props) {
  const { state, lit } = look
  const date = screen?.date
  const title = screen?.title

  const items = useMemo<SceneItem[]>(() => {
    const list = sceneryItems(people)
    for (const p of PLACES) {
      const fp = p.footprint
      if (!fp) continue
      const depth = depthOfBox(fp.x, fp.y, fp.w, fp.d)
      if (p.id !== place) {
        list.push({ key: p.id, depth, node: <StaticBuilding fp={fp} color={QUIET_ROOF} /> })
        continue
      }
      const shut = state !== 'open'
      // 프로젝트 랩은 톱니창만 켠다 (홈 지도와 같게). 다른 건물은 벽 창 · 둥근 창이 켜진다
      const glass = lit ? (fp.roof === 'saw' ? GLASS : LIT) : shut ? DARK : undefined
      list.push({
        key: p.id,
        depth,
        node: (
          <g className={lit ? s.lightsOn : undefined}>
            <StaticBuilding fp={fp} color={p.color} live={lit && fp.roof === 'saw'} glass={glass} door={shut ? 'closed' : 'open'}>
              {fp.roof === 'screen' && <ScreenSlide fp={fp} screen={date !== undefined && title !== undefined ? { date, title } : undefined} />}
            </StaticBuilding>
            {state === 'construction' && (
              <>
                <Scaffold fp={fp} />
                <Hoarding fp={fp} color={p.color} />
                <ConstructionCrew fp={fp} />
              </>
            )}
          </g>
        ),
      })
    }
    return list.sort((a, b) => a.depth - b.depth)
  }, [place, state, lit, date, title, people])

  return (
<svg className={`${s.scene} campus-iso`} viewBox={viewBox} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs dangerouslySetInnerHTML={{ __html: PEEP_DEFS }} />
      <Ground />
      <g>
        {items.map((it) => (
          <g key={it.key} data-depth={it.depth.toFixed(2)}>
            {it.node}
          </g>
        ))}
      </g>
    </svg>
  )
}
