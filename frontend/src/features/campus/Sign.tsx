import { memo, useLayoutEffect, useRef, useState } from 'react'
import type { Place, PlaceId } from '@/domain/types'
import { useFontsReady } from '@/hooks/useFontsReady'
import { placeColor } from '@/config/places'
import { iso } from '@/lib/iso'
import { estimateLabelWidth, plateGeometry, SIGN, signAnchor, type SignAlign } from './geometry'
import s from './campus.module.css'

interface Props {
  place: Place
  /** 안내판 확대 배율 (장면이 작게 그려져도 글자가 13px 아래로 내려가지 않게) */
  scale: number
  /** 판을 펼칠 쪽 (geometry.ts 의 signAlign) */
  align: SignAlign
  /** 폰용 작은 판 */
  compact: boolean
  /** 마우스를 올렸거나 · 키보드로 왔거나 · 골랐을 때: 판이 먹색으로 뒤집힌다 */
  active: boolean
  /** 검색에 걸림: 테두리가 진해진다 (빛나지 않음) */
  hit: boolean
  dim: boolean
  /** 검색 건수. 0 이면 숨김 */
  count: number
  onSelect: (id: PlaceId) => void
  onHover: (id: PlaceId | null) => void
}

/**
 * 안내판: 지붕(깃대)에서 1px 지시선이 올라가고, 그 위에 흰 판이 선다.
 * 판 왼쪽의 8px 네모가 장소색 = 메뉴 · 일정 · 범례와 같은 표식.
 * 글자 폭은 그려 봐야 알 수 있어서, 그린 직후(useLayoutEffect)와 글꼴을 다 받은 뒤 다시 잰다.
 * 판의 <g data-place-label> 는 미리보기(팝오버)를 붙일 자리로 바깥에서 찾는다.
 */
export const Sign = memo(function Sign({ place, scale, align, compact, active, hit, dim, count, onSelect, onHover }: Props) {
  const fontsReady = useFontsReady()
  const textRef = useRef<SVGTextElement>(null)
  const [tw, setTw] = useState(() => estimateLabelWidth(place.label))

  useLayoutEffect(() => {
    const w = textRef.current?.getComputedTextLength() ?? 0
    if (w > 0) setTw(w)
  }, [fontsReady, place.label])

  const at = signAnchor(place)
  const [px, py] = iso(at[0], at[1], at[2] ?? 0)
  const g = plateGeometry(tw, align, compact, count)
  const cls = [s.sign, active && s.signOn, hit && s.signHit, dim && s.dim].filter(Boolean).join(' ')
  const markY = (g.height - SIGN.mark) / 2
  const ink = place.id === 'about'

  return (
    <g className={cls} transform={`translate(${px.toFixed(1)},${py.toFixed(1)})`} aria-hidden="true">
      <g transform={scale === 1 ? undefined : `scale(${scale.toFixed(3)})`}>
        <line className={s.leader} {...g.line} />
        {align !== 'hang' && <circle className={s.leaderFoot} r={1.8} />}
        <g
          data-place-label={place.id}
          className={s.plate}
          transform={`translate(${g.x0.toFixed(1)},${g.y0.toFixed(1)})`}
          onClick={() => onSelect(place.id)}
          onMouseEnter={() => onHover(place.id)}
          onMouseLeave={() => onHover(null)}
        >
          <rect className={s.plateBg} width={g.width.toFixed(1)} height={g.height} rx={SIGN.radius} />
          {/* 소개 장소의 표식은 먹색이라 판이 뒤집히면 흰색으로 바꾼다 (CSS 가 바꿀 수 있게 style 대신 class) */}
          <rect
            className={ink ? s.markInk : undefined}
            x={g.padX}
            y={markY}
            width={SIGN.mark}
            height={SIGN.mark}
            rx={2}
            style={ink ? undefined : { fill: placeColor(place.id) }}
          />
          <text ref={textRef} className={s.plateText} x={g.textX} y={g.height / 2} dominantBaseline="central">
            {place.label}
          </text>
          {count > 0 && (
            <g transform={`translate(${(g.textX + tw + SIGN.badgeGap + SIGN.badge / 2).toFixed(1)},${g.height / 2})`}>
              <circle className={s.badgeBg} r={SIGN.badge / 2} />
              <text className={s.badgeText} textAnchor="middle" dominantBaseline="central">
                {count}
              </text>
            </g>
          )}
        </g>
      </g>
    </g>
  )
})
