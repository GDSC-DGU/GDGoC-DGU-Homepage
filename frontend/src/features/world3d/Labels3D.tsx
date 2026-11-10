import { memo, type RefObject } from 'react'
import { Html } from '@react-three/drei'
import { PLACES, placeColor } from '@/config/places'
import { PLACE_PANEL_ID } from '@/config/ui'
import type { PlaceId } from '@/domain/types'
import { signAlign, signAnchor } from '@/features/campus/geometry'
import s from './world3d.module.css'

interface Props {
  /** 판이 먹색으로 뒤집힌 장소 (호버 · 키보드 초점 · 고름) */
  active: PlaceId | null
  hits: Partial<Record<PlaceId, number>> | null
  compact: boolean
  flip: boolean
  genLabel: string
  onPick: (id: PlaceId) => void
  onOver: (id: PlaceId) => void
  onOut: (id: PlaceId) => void
  /** 안내판을 넣을 HTML 상자 (캔버스와 같은 자리). 처음부터 정해 두어야 첫 안내판이 빈 채로 남지 않는다 */
  portal: RefObject<HTMLElement | null>
}

/**
 * 안내판 = HTML 버튼 (3D 장면 위에 겹친다). SVG 지도의 Sign 과 같은 모양 · 같은 자리(지붕 꼭대기 · 깃대 꼭대기).
 * 화면 읽기 프로그램과 키보드는 이 버튼으로 장소를 고른다 (캔버스 안 건물은 마우스 · 손가락용).
 * data-place-label: 미리보기(PlacePopover)가 붙는 자리, data-place: 미리보기를 닫으면 초점이 돌아오는 자리.
 */
export const Labels3D = memo(function Labels3D({ active, hits, compact, flip, genLabel, onPick, onOver, onOut, portal }: Props) {
  return (
    <>
      {PLACES.map((place) => {
        const at = signAnchor(place)
        const align = signAlign(place, flip)
        const count = hits?.[place.id] ?? 0
        const dim = hits !== null && count === 0
        const on = active === place.id
        return (
          <Html key={place.id} position={[at[0], at[2] ?? 0, at[1]]} zIndexRange={[3, 1]} portal={portal as RefObject<HTMLElement>}>
            <div className={s.pin} data-pin={place.id} data-align={align} data-compact={compact || undefined} data-on={on || undefined} data-dim={dim || undefined}>
              {align === 'hang' ? <i className={s.hangLine} /> : <i className={s.leader} />}
              <button
                type="button"
                className={s.plate}
                data-place-label={place.id}
                data-place={place.id}
                aria-controls={PLACE_PANEL_ID}
                aria-current={on ? 'true' : undefined}
                aria-label={place.id === 'about' ? `${place.label} ${genLabel} 소개 열기` : `${place.label} 미리보기 열기`}
                onClick={() => onPick(place.id)}
                onPointerEnter={() => onOver(place.id)}
                onPointerLeave={() => onOut(place.id)}
                onFocus={() => onOver(place.id)}
                onBlur={() => onOut(place.id)}
              >
                <i className={s.mark} data-ink={place.id === 'about' || undefined} style={place.id === 'about' ? undefined : { background: placeColor(place.id) }} />
                <span>{place.label}</span>
                {count > 0 && <b className={`${s.badge} num`}>{count}</b>}
              </button>
            </div>
          </Html>
        )
      })}
    </>
  )
})
