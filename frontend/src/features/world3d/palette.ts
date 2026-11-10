/**
 * 3D 지도 색. WebGL 은 CSS 변수를 읽지 못하므로, SVG 지도와 같은 토큰을 화면에 숨겨 둔 '.campus-iso' 견본에서 읽어 온다.
 * 견본은 첫 화면(data-tod) 안에 있어서, 밤이면 campus/anatomy/anatomy.css 의 밤 값이 그대로 들어온다.
 * 토큰을 못 읽으면(테스트 등) 아래 낮 값을 쓴다 (같은 파일의 값).
 */
const FALLBACK = {
  paper: '#ffffff',
  walk: '#ebeef2',
  grass: '#e4f2e8',
  grassEdge: '#bcd6c4',
  grassLine: '#d0e5d7',
  plaza: '#f9fafb',
  plazaEdge: '#cfd4da',
  plazaLine: '#e3e7eb',
  plazaRing: '#cfd4da',
  wall: '#ffffff',
  wallTop: '#ffffff',
  edge: '#b0b5bd',
  faint: '#d2d6db',
  glass: '#d6e0ea',
  glassIn: '#eef1f4',
  door: '#474c55',
  wood: '#bfae95',
  iron: '#776f64',
  ink900: '#191b1f',
  ink500: '#61666f',
  gen: '#ff6309',
  onGen: '#191b1f',
} as const

export type Palette = Record<keyof typeof FALLBACK, string> & { night: boolean; ground: string }

const VARS: Record<keyof typeof FALLBACK, string> = {
  paper: '--paper',
  walk: '--scene-walk',
  grass: '--c-grass-top',
  grassEdge: '--c-grass-edge',
  grassLine: '--c-grass-line',
  plaza: '--c-plaza-top',
  plazaEdge: '--c-plaza-edge',
  plazaLine: '--c-plaza-line',
  plazaRing: '--c-plaza-ring',
  wall: '--anatomy-face',
  wallTop: '--anatomy-top',
  edge: '--anatomy-lo',
  faint: '--anatomy-faint',
  glass: '--c-glass-l',
  glassIn: '--c-glass-in',
  door: '--c-door-dark',
  wood: '--c-wood-2',
  iron: '--c-iron-2',
  ink900: '--ink-900',
  ink500: '--ink-500',
  gen: '--gen',
  onGen: '--on-gen',
}

/** 밤 땅색 (campus.module.css 의 밤 .ground, 첫 화면 밤 바탕과 같다) */
const NIGHT_GROUND = '#15191f'

/** probe: class="campus-iso" 인 숨긴 요소 (첫 화면 안) */
export function readPalette(probe: Element | null, night: boolean): Palette {
  const out = { ...FALLBACK } as Record<keyof typeof FALLBACK, string>
  try {
    const cs = getComputedStyle(probe ?? document.documentElement)
    for (const key of Object.keys(VARS) as (keyof typeof FALLBACK)[]) {
      const v = cs.getPropertyValue(VARS[key]).trim()
      if (/^#[0-9a-f]{6}$/i.test(v)) out[key] = v
      else if (/^#[0-9a-f]{3}$/i.test(v)) out[key] = `#${[...v.slice(1)].map((c) => c + c).join('')}`
    }
  } catch {
    // 화면이 없으면 기본값
  }
  return { ...out, night, ground: night ? NIGHT_GROUND : out.paper }
}

/** 불 켜진 창 (campus roofs LIT 와 같은 따뜻한 색) */
export const LIT = '#ffd98a'
export const LIT_GLOW = '#ffb547'
