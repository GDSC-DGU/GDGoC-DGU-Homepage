import { useLayoutEffect, useState, type RefObject } from 'react'

export interface HeroLayout {
  /** 무대를 화면 오른쪽 끝까지 늘리는 길이 (px). 스크롤 막대를 뺀 폭으로 재서 가로 넘침이 없다 */
  bleed: number
  stage: { w: number; h: number }
  plate: { w: number; h: number } | null
}

const same = (a: HeroLayout, b: HeroLayout) =>
  a.bleed === b.bleed && a.stage.w === b.stage.w && a.stage.h === b.stage.h && a.plate?.w === b.plate?.w && a.plate?.h === b.plate?.h

/**
 * 머리 · 무대 · 안내판 크기를 잰다. 처음 그리기 전(useLayoutEffect)에 재므로 깜빡이지 않고,
 * 화면 폭 · 스크롤 막대 · 글꼴(안내판 높이)이 바뀌면 다시 잰다.
 * 100vw 는 스크롤 막대를 포함해서 쓰지 않는다 (가로 스크롤이 생긴다).
 */
export function useHeroLayout(
  headerRef: RefObject<HTMLElement | null>,
  stageRef: RefObject<HTMLElement | null>,
  plateRef: RefObject<HTMLElement | null>,
  wide: boolean,
  /** 장면을 오른쪽 화면 끝까지 넓힐지 (false 면 본문 틀 안에서 끝난다) */
  bleedOn = true,
): HeroLayout {
  const [layout, setLayout] = useState<HeroLayout>({ bleed: 0, stage: { w: 0, h: 0 }, plate: null })
  useLayoutEffect(() => {
    const header = headerRef.current
    const stage = stageRef.current
    if (!header || !stage) return
    const measure = () => {
      // 본문 폭: html 의 보이는 폭과 상자 폭 중 작은 쪽.
      // (scrollbar-gutter: stable 로 막대 자리를 잡아 두면 clientWidth 가 그 자리를 빼지 않는 브라우저가 있어, 둘 다 본다)
      const de = document.documentElement
      const client = Math.min(de.clientWidth, Math.floor(de.getBoundingClientRect().width))
      const hr = header.getBoundingClientRect()
      const sr = stage.getBoundingClientRect()
      const out = wide && bleedOn
      const bleed = out ? Math.max(0, Math.floor(client - hr.right)) : 0
      const w = Math.round(out ? Math.min(client, hr.right + bleed) - sr.left : sr.width)
      const pr = plateRef.current?.getBoundingClientRect()
      const next: HeroLayout = { bleed, stage: { w, h: Math.round(sr.height) }, plate: pr ? { w: Math.round(pr.width), h: Math.round(pr.height) } : null }
      setLayout((prev) => (same(prev, next) ? prev : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    // html 폭 = 스크롤 막대를 뺀 화면 폭 (막대가 생기고 없어질 때도 알 수 있다)
    ro.observe(document.documentElement)
    ro.observe(header)
    if (plateRef.current) ro.observe(plateRef.current)
    return () => ro.disconnect()
  }, [headerRef, stageRef, plateRef, wide, bleedOn])
  return layout
}
