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
 * renderButton 이 만든 버튼 iframe 이 다 불러와질 때까지 기다린다.
 * Google 은 iframe 이 오기 전에 임시 버튼을 먼저 그리고 그 크기를 inline style 로 맞춘다. 우리 CSP 는
 * style-src 에 'unsafe-inline' 을 두지 않아 그 inline style 이 막히고, 임시 버튼의 G 그림이 칸 너비만큼 커진다.
 * 그래서 iframe 이 준비될 때까지 버튼 자리를 숨겨 둔다 (LoginPage). 오래 걸리면 timeoutMs 뒤에 그냥 보인다.
 */
export function waitForButtonFrame(slot: HTMLElement, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve) => {
    let done = false
    let timer = 0
    const observer = new MutationObserver(() => {
      const frame = slot.querySelector('iframe')
      if (frame) {
        observer.disconnect()
        watch(frame)
      }
    })
    const finish = () => {
      if (done) return
      done = true
      observer.disconnect()
      window.clearTimeout(timer)
      resolve()
    }
    // load 직후 Google 이 임시 버튼을 치우는 한 프레임을 기다린다
    const watch = (frame: HTMLIFrameElement) => frame.addEventListener('load', () => window.setTimeout(finish, 50), { once: true })
    timer = window.setTimeout(finish, timeoutMs)
    const frame = slot.querySelector('iframe')
    if (frame) watch(frame)
    else observer.observe(slot, { childList: true, subtree: true })
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
