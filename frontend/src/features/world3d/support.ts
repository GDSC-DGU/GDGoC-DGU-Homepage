/**
 * 이 기기에서 3D 지도를 쓸지 (three.js 를 받기 전에 묻는다). 아니면 SVG 지도 그대로.
 * - WebGL2 가 없으면 (오래된 기기 · 막아 둔 브라우저)
 * - 데이터 절약 모드면 (3D 덩어리 약 260KB 를 받지 않는다)
 * - 폰 · 태블릿(손가락 화면)은 기기가 넉넉할 때만: 메모리 4GB 이상 · 코어 4개 이상 (브라우저가 알려 주는 값만 본다)
 * - 그래픽 카드 없이 소프트웨어로 그리는 WebGL 이면 (SwiftShader · llvmpipe 등. 첫 화면이 수십 초 멈춘다: 품질 점검 2026-11-05 Lighthouse 데스크톱 홈 64점, TBT 42초)
 * - 확인용: 주소 뒤 ?world=svg 면 늘 SVG, ?world=3d 면 기기 조건을 건너뛴다 (WebGL2 는 그래도 필요)
 * 동작 줄이기 설정은 부르는 쪽(HeroSection)이 따로 본다.
 */
let cached: boolean | null = null

type Nav = Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number }

export function deviceAllows3D(nav: Nav, coarse: boolean): boolean {
  if (nav.connection?.saveData) return false
  if (!coarse) return true
  const memOk = nav.deviceMemory === undefined || nav.deviceMemory >= 4
  const cpuOk = nav.hardwareConcurrency === undefined || nav.hardwareConcurrency >= 4
  return memOk && cpuOk
}

/** 소프트웨어 렌더러 이름인지 (WEBGL_debug_renderer_info 의 UNMASKED_RENDERER_WEBGL). 모르면 false */
export function isSoftwareRenderer(renderer: string | null | undefined): boolean {
  return Boolean(renderer && /swiftshader|llvmpipe|softpipe|software|basic render driver/i.test(renderer))
}

function rendererName(gl: WebGL2RenderingContext): string | null {
  const ext = gl.getExtension('WEBGL_debug_renderer_info')
  return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : null
}

export function canUseWorld3D(): boolean {
  if (cached !== null) return cached
  try {
    const force = new URLSearchParams(window.location.search).get('world')
    if (force === 'svg') return (cached = false)
    const coarse = window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 767px)').matches
    if (force !== '3d' && !deviceAllows3D(navigator as Nav, coarse)) return (cached = false)
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2', force === '3d' ? undefined : { failIfMajorPerformanceCaveat: true })
    cached = Boolean(gl) && (force === '3d' || !isSoftwareRenderer(gl && rendererName(gl)))
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    cached = false
  }
  return cached
}
