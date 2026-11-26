/**
 * Google Identity Services (Google 로그인 버튼) 스크립트를 로그인 화면에서만 받는다.
 * 버튼을 누르면 Google 창이 열리고, 로그인을 마치면 callback 으로 Google ID 토큰(credential)이 온다.
 * 그 토큰을 그대로 서버(API-AUTH-001)에 보낸다: 검증 · 사용자 찾기는 서버가 한다.
 * 문서: https://developers.google.com/identity/gsi/web/reference/js-reference
 */
export const GIS_SRC = 'https://accounts.google.com/gsi/client'

export interface GoogleCredentialResponse {
  credential: string
}

export interface GoogleButtonOptions {
  type?: 'standard' | 'icon'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  logo_alignment?: 'left' | 'center'
  width?: number
  locale?: string
}

export interface GoogleAccountsId {
  initialize(config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    ux_mode?: 'popup' | 'redirect'
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
    context?: 'signin' | 'signup' | 'use'
    itp_support?: boolean
  }): void
  renderButton(parent: HTMLElement, options: GoogleButtonOptions): void
  disableAutoSelect(): void
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } }
  }
}

/** .env 의 VITE_GOOGLE_CLIENT_ID (Google Cloud 콘솔의 '웹 애플리케이션' OAuth 클라이언트 ID). 비어 있으면 버튼을 그리지 않는다 */
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()

let loading: Promise<GoogleAccountsId> | null = null

/**
 * renderButton 이 만든 진짜 버튼(iframe)이 화면에 나올 때까지 기다린다. 나오면 true, timeoutMs 안에 안 나오면 false.
 * Google 은 iframe 이 오기 전에 임시 버튼을 먼저 그리고 그 크기를 inline style 로 맞춘다. 우리 CSP 는
 * style-src 에 'unsafe-inline' 을 두지 않아 그 inline style 이 막히고, 임시 버튼의 G 그림이 칸 너비만큼 커진다.
 * 그래서 진짜 버튼이 나올 때까지 버튼 자리를 숨겨 둔다 (LoginPage).
 * iframe 은 Google 이 높이를 준 뒤(0 → 44px)에야 보인다. 이 주소가 클라이언트의 '승인된 JavaScript 원본'에 없으면
 * (PR 미리보기 주소, http://localhost 가 빠진 로컬 등) 높이가 끝까지 0 이라 false 를 돌려준다.
 */
export function waitForButtonFrame(slot: HTMLElement, timeoutMs = 6000): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false
    let timer = 0
    let sizes: ResizeObserver | null = null
    const added = new MutationObserver(() => {
      const frame = slot.querySelector('iframe')
      if (frame) {
        added.disconnect()
        watch(frame)
      }
    })
    const finish = (shown: boolean) => {
      if (done) return
      done = true
      added.disconnect()
      sizes?.disconnect()
      window.clearTimeout(timer)
      resolve(shown)
    }
    const watch = (frame: HTMLIFrameElement) => {
      sizes = new ResizeObserver(() => {
        // 높이가 생긴 직후 Google 이 임시 버튼을 치우는 한 프레임을 기다린다
        if (frame.getBoundingClientRect().height > 0) window.setTimeout(() => finish(true), 50)
      })
      sizes.observe(frame)
    }
    timer = window.setTimeout(() => finish(false), timeoutMs)
    const frame = slot.querySelector('iframe')
    if (frame) watch(frame)
    else added.observe(slot, { childList: true, subtree: true })
  })
}

/** 스크립트를 한 번만 넣는다. 실패하면 다음에 다시 시도한다 */
export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  const ready = window.google?.accounts?.id
  if (ready) return Promise.resolve(ready)
  loading ??= new Promise<GoogleAccountsId>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => {
      const id = window.google?.accounts?.id
      if (id) resolve(id)
      else reject(new Error('Google 로그인 스크립트를 읽지 못했습니다'))
    }
    script.onerror = () => {
      script.remove()
      reject(new Error('Google 로그인 스크립트를 받지 못했습니다'))
    }
    document.head.appendChild(script)
  }).catch((e: unknown) => {
    loading = null
    throw e
  })
  return loading
}
