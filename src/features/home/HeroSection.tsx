import { Fragment, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { SITE } from '@/config/site'
import { HERO } from '@/content/story'
import { CampusScene } from '@/features/campus/CampusScene'
import { NightContext } from '@/features/campus/nightContext'
import { NightLight } from '@/features/fx/NightLight'
import { useSceneFit, type SceneLayout } from '@/features/campus/useSceneFit'
import { usePlacePreview, usePlacePreviewState } from '@/features/layout/placePreview'
import { useIsNarrow, useMediaQuery, useReducedMotion } from '@/hooks/useMediaQuery'
import { useOffscreen } from '@/hooks/useOffscreen'
import { useToday } from '@/hooks/useToday'
import { useSeason } from '@/features/campus/trees/season'
import { sprintRunning } from '@/features/placehero/look'
import { canUseWorld3D } from '@/features/world3d/support'
import type { Area } from '@/features/world3d/World3D'
import w3 from '@/features/world3d/world3d.module.css'
import { useCampus, useCampusActions } from '@/state/useCampus'
import { LogoWordmark } from './LogoWordmark'
import { PLACE_TRIGGER, PlacePopover } from './PlacePopover'
import { dockInset } from './popoverPosition'
import s from './hero.module.css'

export const PHONE_QUERY = '(max-width: 767px)'

/** 지도 아래쪽 이만큼은 건물 · 이름표를 두지 않는다 (사람이 화면 밖에서 걸어 들어오는 길) */
const BOTTOM_BAND = 48

/** 3D 캠퍼스 (three.js). 홈 첫 화면에서만, 첫 그림 뒤 한가할 때 따로 받는다. 받지 않으면(동작 줄이기 · WebGL 없음 · 약한 폰) SVG 지도 그대로 */
const World3D = lazy(() => import('@/features/world3d/World3D'))
const GEN_NUMBER = SITE.generation.replace(/\D/g, '')

/**
 * 밤 모드(한국 시간 19–06시에 먹색 지도)는 끈다: 4기 Organizer 2026-11-05 '검은 색이 안 어울린다'.
 * 언제나 낮 그림. 다시 켜려면 features/fx/useTimeOfDay 의 useTimeOfDay() === 'night' 로 되돌린다 (밤 그림 · 색은 그대로 남아 있다).
 */
const NIGHT_MODE = false

/**
 * 첫 화면 (4기 Figma 시안 2026-11): 가운데 이름 → 정식 이름 → 짧은 소개, 그 아래 캠퍼스 지도를 화면 폭 가득 따로.
 * 이름은 로고(두 꺾쇠)로 시작해 꺾쇠가 양쪽으로 벌어지며 'GDGoC DGU' 가 드러난다 (LogoWordmark).
 * 지도는 이 사이트의 사이트맵이다: 건물 하나가 메뉴 하나이고, 누르면(키보드는 건물에서 Enter · Space) 그 자리에서 미리보기가 열린다 (폰은 아래 시트).
 * 이름표 · 손글씨 메모(매주 화요일 세션 · G-Sprint)는 그대로. 버튼 · 모집 상태 줄은 두지 않는다 (지원 안내는 메뉴 '지원하기').
 */
export function HeroSection() {
  const narrow = useIsNarrow()
  const phone = useMediaQuery(PHONE_QUERY)
  const today = useToday()
  const preview = usePlacePreview()
  // 미리보기가 열렸을 때만 고른 장소의 안내판을 뒤집는다 (처음 들어왔을 때는 모두 흰 판)
  const { open: previewOpen } = usePlacePreviewState()
  const svgRef = useRef<SVGSVGElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  // 지도가 화면 밖이면 반복 애니메이션(깃발, 진행 중 표시)을 멈춘다
  const offscreen = useOffscreen(frameRef)
  // 한국 시간 밤(19–06시)이면 지도도 밤. 불은 실제로 진행 중인 곳에만 켜진다 (DESIGN 6장)
  const night = NIGHT_MODE
  const season = useSeason()

  // 3D: SVG 지도를 먼저 그려 두고(첫 그림 · 대체 그림), 브라우저가 한가하고 지도가 화면에 있을 때 3D 를 받아 같은 자리에 겹쳐 바꾼다
  const reduceMotion = useReducedMotion()
  const want3d = useMemo(() => !reduceMotion && canUseWorld3D(), [reduceMotion])
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    if (!want3d) return
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void }
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setIdle(true), { timeout: 2000 })
      return () => w.cancelIdleCallback?.(id)
    }
    const t = window.setTimeout(() => setIdle(true), 400)
    return () => window.clearTimeout(t)
  }, [want3d])
  // 한 번 받기 시작하면 지도가 화면 밖으로 나가도 그대로 둔다 (그리는 일은 움직일 때만이라 비용이 없다)
  const [start3d, setStart3d] = useState(false)
  if (!start3d && want3d && idle && !offscreen) setStart3d(true)
  const [world, setWorld] = useState<'loading' | 'ready' | 'swapped'>('loading')
  const onWorldReady = useCallback(() => setWorld((w) => (w === 'loading' ? 'ready' : w)), [])
  useEffect(() => {
    if (world !== 'ready') return
    const t = window.setTimeout(() => setWorld('swapped'), 600)
    return () => window.clearTimeout(t)
  }, [world])
  const on3d = want3d && start3d
  const { selected, hovered, hits } = useCampus()
  const { select, hover } = useCampusActions()

  // 지도는 글자 아래 따로 있으므로 피할 것은 아래 띠(사람이 걸어 들어오는 길)뿐. 건물은 지도 가운데에
  const getLayout = useCallback((svg: DOMRect): SceneLayout => {
    const full = { x0: 8, y0: 8, x1: svg.width - 8, y1: svg.height - 8 }
    const band = { x0: 0, y0: svg.height - BOTTOM_BAND, x1: svg.width, y1: svg.height }
    return { bounds: full, prefer: { ...full, y1: band.y0 }, obstacles: [band] }
  }, [])
  const fit = useSceneFit(svgRef, getLayout, { narrow, flipPins: narrow, showLive: !narrow })
  // 손글씨 메모 배율: 폰처럼 장면이 작게 그려지면 글씨를 키운다 (CampusScene 과 같은 식)
  const penScale = narrow ? Math.min(1.5, Math.max(1, fit.labelScale * 0.8)) : 1

  // 고른 건물을 데려다 놓을 빈 자리: 넓은 화면은 오른쪽에 붙는 미리보기 창(340px + 오른쪽 끝선) 자리를 뺀 곳, 폰은 지도 전체
  const focusArea = useCallback((): Area | null => {
    const frame = frameRef.current?.getBoundingClientRect()
    if (!frame) return null
    if (!phone && frame.width > 720) return { x0: 16, y0: 16, x1: frame.width - dockInset(frame.width) - 380, y1: frame.height - 16 }
    return { x0: 16, y0: 16, x1: frame.width - 16, y1: frame.height - 16 }
  }, [phone])

  // 건물 · 이름표를 누르면(같은 장소를 다시 눌러도) 미리보기를 연다. 어떤 장소인지는 지도가 이미 골랐다
  // (3D 층의 안내판은 카메라가 그 건물로 날아간 뒤에 스스로 연다)
  const onMapClick = (e: MouseEvent<HTMLDivElement>) => {
    const t = e.target as Element
    if (t.closest(PLACE_TRIGGER) && !t.closest('[data-world]')) preview.show()
  }
  const onMapKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const t = e.target as Element
    if ((e.key === 'Enter' || e.key === ' ') && t.closest(PLACE_TRIGGER) && !t.closest('[data-world]')) preview.show()
  }
  const svgMap = (
    <NightContext value={night}>
      <CampusScene svgRef={svgRef} viewBox={fit.viewBox} pinScale={fit.pinScale} flipRightPins={narrow} compactPins={narrow} highlightSelected={previewOpen} />
    </NightContext>
  )

  return (
    <section className={s.hero} aria-labelledby="hero-title" data-story="hero" data-tod={night ? 'night' : 'day'}>
      {/* 글자가 먼저 (읽는 순서 · Tab 순서): 이름 → 소개 → 지도의 건물들 */}
      <div className={`container ${s.top} ${night ? 'on-dark' : ''}`}>
        <div className={s.panel}>
          <h1 id="hero-title" className={s.title}>
            <LogoWordmark name={HERO.name} className={s.wordmark} />
          </h1>
          {/* 'Google Developer Groups on Campus' · 'Dongguk Univ' 는 각각 한 덩어리 (좁으면 그 사이에서만 줄이 바뀐다) */}
          <p className={s.fullName} lang="en">
            {HERO.fullName.split(/ (?=Dongguk)/).map((part, i) => (
              <Fragment key={part}>
                {i > 0 && ' '}
                <span className={s.keep}>{part}</span>
              </Fragment>
            ))}
          </p>
          <p className={s.lead}>
            {HERO.pitch.map((line, i) => (
              <Fragment key={line}>
                {i > 0 && ' '}
                <span className={s.leadLine}>{line}</span>
              </Fragment>
            ))}
          </p>
        </div>
      </div>

      {/* 지도 = 사이트맵. 글자 아래 화면 폭 가득. 안의 건물 · 광장 깃발이 키보드로 고를 수 있는 버튼이다 */}
      <div ref={frameRef} className={s.map} data-story="map" data-paused={offscreen || undefined} data-open={previewOpen ? selected : undefined} onClick={onMapClick} onKeyDown={onMapKey}>
        {on3d && (
          <div
            className={w3.layer}
            data-world={world === 'loading' ? 'loading' : 'ready'}
            role="group"
            aria-label="GDGoC DGU 캠퍼스 지도. 건물 이름표를 고르면 그 건물로 다가간 뒤 미리보기가 열립니다"
          >
            <Suspense fallback={null}>
              <World3D
                viewBox={fit.viewBox}
                phone={phone}
                narrow={narrow}
                penScale={penScale}
                night={night}
                season={season}
                sprint={sprintRunning(today)}
                selected={selected}
                hovered={hovered}
                hits={hits}
                previewOpen={previewOpen}
                focusArea={focusArea}
                genLabel={SITE.generation}
                genNumber={GEN_NUMBER}
                onSelect={select}
                onHover={hover}
                onArrive={preview.show}
                onHide={preview.hide}
                onReady={onWorldReady}
              />
            </Suspense>
          </div>
        )}
        {/* SVG 지도: 첫 그림이자 대체 그림. 3D 로 바뀌면 숨기고 누르거나 초점이 가지 않게 한다(inert) */}
        {on3d ? (
          <div className={w3.svgUnder} data-gone={world === 'swapped' || undefined} inert={world === 'swapped'}>
            {svgMap}
          </div>
        ) : (
          svgMap
        )}
        {night && <NightLight />}
        <PlacePopover frameRef={frameRef} sheet={phone} />
      </div>
    </section>
  )
}
