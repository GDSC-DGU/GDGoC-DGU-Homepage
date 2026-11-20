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
