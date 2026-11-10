import { useEffect, useMemo, useState } from 'react'
import { RoughGenerator } from 'roughjs/bin/generator'
import { PLACE_BY_ID } from '@/config/places'
import { CHAPTER, FAQS } from '@/content'
import { REGULAR_SESSION } from '@/features/pages/community/thisWeek'
import { useToday } from '@/hooks/useToday'
import { iso } from '@/lib/iso'
import { FLOOR } from './geometry'
import s from './campus.module.css'

/**
 * 손글씨 층 (펜 레이어): 반듯한 아이소 지도 위에 사람이 펜으로 동그라미 · 화살표 · 메모를 적은 것처럼.
 * - 선: rough.js (MIT) 로 손으로 그은 듯한 경로를 만든다. seed 를 고정해 새로 그릴 때마다 모양이 같다
 * - 글씨: 나눔손글씨 펜 (Nanum Pen Script, OFL 1.1, Google Fonts)
 * - 적는 것은 데이터에 있는 사실만: 정기 세션 시간(faq.json when-sessions), G-Sprint 팀 수 · 데모데이(chapter.json, 확인된 값)
 * - 선 색은 그 장소색 (파랑 = 커뮤니티, 빨강 = 프로젝트), 글씨는 먹색
 * - 처음 들어오면 한 번 그려진다 (선 → 화살표 → 글씨). '동작 줄이기'면 다 그려진 채로 보인다
 */

const gen = new RoughGenerator()

type Pt = readonly [number, number]
export interface Stroke {
  d: string
  w: number
}

const paths = (drawable: ReturnType<RoughGenerator['curve']>): Stroke[] => gen.toPaths(drawable).map((p) => ({ d: p.d, w: p.strokeWidth }))

/** 손으로 그은 화살표: 휘어진 줄기 + 머리 두 획 */
function arrow(from: Pt, via: Pt, to: Pt, seed: number): Stroke[] {
  const body = paths(gen.curve([from as [number, number], via as [number, number], to as [number, number]], { roughness: 0.9, bowing: 1.2, strokeWidth: 2.2, seed }))
  const ang = Math.atan2(to[1] - via[1], to[0] - via[0])
  const head = (da: number) => {
    const a = ang + Math.PI + da
    return paths(gen.line(to[0], to[1], to[0] + Math.cos(a) * 13, to[1] + Math.sin(a) * 13, { roughness: 0.7, strokeWidth: 2.2, seed: seed + 1 }))
  }
  return [...body, ...head(0.45), ...head(-0.45)]
}

/** 대상을 두르는 손그림 동그라미 (두 바퀴가 살짝 어긋나게) */
function loop(c: Pt, w: number, h: number, seed: number): Stroke[] {
  return paths(gen.ellipse(c[0], c[1], w, h, { roughness: 1.3, strokeWidth: 2.4, seed }))
}

export interface Note {
  key: string
  /** 메모가 붙은 자리 (격자). 3D 지도는 이 점을 따라 메모를 옮긴다 (world3d/PenNotes3D) */
  anchor: readonly [number, number, number]
  color: string
  loop?: Stroke[]
  arrow: Stroke[]
  lines: Array<{ x: number; y: number; text: string; size: number }>
  /** 밑줄 (글씨 아래 한 획) */
  under?: Stroke[]
  /** 글씨 · 화살표를 키울 때 기준점 (화살표 끝) */
  tip: Pt
  delay: number
}

/** 지도 위 메모 목록 (데이터에 있는 사실만) + 손글씨 글꼴을 받았는지. SVG 지도와 3D 지도가 같이 쓴다 */
export function usePenNotes(compact: boolean): { notes: Note[]; ready: boolean } {
  const today = useToday()
  const sessionKnown = FAQS.some((f) => f.id === REGULAR_SESSION.faqId)
  const sprint = CHAPTER.sprint
  const sprintOn = sprint.verified && today <= sprint.demoDay

  const notes = useMemo<Note[]>(() => {
    const list: Note[] = []
    // 1) 커뮤니티: '매주 화요일 18:00 세션'
    const cm = PLACE_BY_ID.community.footprint
    if (cm && sessionKnown) {
      const [cx, cy] = iso(cm.x + cm.w / 2, cm.y + cm.d / 2, FLOOR + cm.h * 0.45)
      const lines = (tx: number, ty: number) => [
        { x: tx, y: ty, text: '매주 화요일', size: 33 },
        { x: tx + 6, y: ty + 36, text: `${REGULAR_SESSION.time} 세션`, size: 40 },
      ]
      const under = (tx: number, ty: number) => paths(gen.line(tx + 2, ty + 46, tx + 140, ty + 42, { roughness: 1.1, strokeWidth: 2.6, seed: 5 }))
      const anchor = [cm.x + cm.w / 2, cm.y + cm.d / 2, FLOOR + cm.h * 0.45] as const
      if (!compact) {
        // 넓은 화면: 건물 왼쪽 위 잔디에 적고, 왼쪽 벽으로 화살표
        const [lx, ly] = iso(cm.x, cm.y + cm.d, FLOOR + cm.h * 0.55)
        const tx = lx - 262
        const ty = ly - 104
        list.push({
          key: 'session',
          anchor,
          color: 'var(--place-community)',
          loop: loop([cx + 2, cy - 4], 236, 150, 7),
          arrow: arrow([tx + 168, ty + 26], [lx - 50, ty + 22], [lx - 2, ly - 10], 11),
          lines: lines(tx, ty),
          under: under(tx, ty),
          tip: [lx - 2, ly - 10],
          delay: 0.5,
        })
      } else {
        // 폰: 왼쪽 위는 화면 밖이라, 건물 오른쪽 위(프로젝트 안내판 위 빈 땅)에 적고 오른쪽 벽으로 화살표
        const [rx, ry] = iso(cm.x + cm.w, cm.y + cm.d * 0.35, FLOOR + cm.h * 0.6)
        const tx = rx + 50
        const ty = ry - 52
        list.push({
          key: 'session',
          anchor,
          color: 'var(--place-community)',
          loop: loop([cx + 2, cy - 4], 236, 150, 7),
          arrow: arrow([tx - 8, ty - 6], [rx + 22, ty - 14], [rx + 6, ry - 6], 11),
          lines: lines(tx, ty),
          under: under(tx, ty),
          tip: [rx + 6, ry - 6],
          delay: 0.5,
        })
      }
    }
    // 2) 프로젝트: 'G-Sprint 5팀 만드는 중 · 12.29 데모데이' (데모데이가 지나면 지운다)
    const pj = PLACE_BY_ID.projects.footprint
    if (!compact && pj && sprintOn) {
      const [fx, fy] = iso(pj.x + pj.w * 0.62, pj.y + pj.d, FLOOR + 0.2) // 앞 벽 아래
      const tx = fx - 92
      const ty = fy + 84
      const [, m, d] = sprint.demoDay.split('-').map(Number)
      list.push({
        key: 'sprint',
        anchor: [pj.x + pj.w * 0.62, pj.y + pj.d, FLOOR + 0.2],
        color: 'var(--place-projects)',
        arrow: arrow([tx + 58, ty - 28], [tx + 40, ty - 56], [fx - 4, fy + 8], 21),
        lines: [
          { x: tx, y: ty, text: `G-Sprint ${sprint.teams}팀 만드는 중`, size: 32 },
          { x: tx + 16, y: ty + 34, text: `${m}.${d} 데모데이!`, size: 32 },
        ],
        tip: [fx - 4, fy + 8],
        delay: 2.2,
      })
    }
    return list
  }, [compact, sessionKnown, sprintOn, sprint.demoDay, sprint.teams])

  // 손글씨 글꼴(한글은 조각으로 나뉘어 늦게 온다)을 받은 뒤에 그리기 시작한다. 2.5초 안에 못 받으면 그냥 그린다
  const [fontReady, setFontReady] = useState(() => typeof document === 'undefined' || !document.fonts)
  const sample = notes.flatMap((n) => n.lines.map((l) => l.text)).join(' ')
  useEffect(() => {
    if (fontReady || !document.fonts) return
    let alive = true
    const done = () => alive && setFontReady(true)
    const timer = window.setTimeout(done, 2500)
    document.fonts.load('40px "Nanum Pen Script"', sample).then(done, done)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [fontReady, sample])

  return { notes, ready: fontReady }
}

/** 펜 메모 층에 다는 class (처음 한 번 그려지는 연출은 animate 일 때만) */
export const penLayerClass = (animate: boolean) => `${s.pen} ${animate ? s.penAnimate : ''}`

