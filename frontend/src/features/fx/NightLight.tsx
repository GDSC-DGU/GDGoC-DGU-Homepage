import s from './fx.module.css'


/**
 * 밤 지도에 얹는 것: 불 켜진 창 번짐 SVG 필터(#fx-night-glow) 정의.
 * 필터는 campus.module.css 의 밤 규칙이 [data-lit] 에 건다. WebGL 없이 SVG 만 쓴다.
 */
export function NightLight() {
  return (
    <>
      <svg className={s.defs} aria-hidden="true" focusable="false">
        <filter id="fx-night-glow" x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>
    </>
  )
}
