interface ImportMetaEnv {
  readonly DEV: boolean
  /** 'http' 이면 Spring Boot API, 아니면 예시 데이터 */
  readonly VITE_DATA_SOURCE?: 'mock' | 'http'
  readonly VITE_API_BASE?: string
  /** 로그인 방식. 'google' 이면 실제 Google 로그인, 'example' 이면 예시 계정. 비우면 VITE_DATA_SOURCE 를 따른다 (http → google) */
  readonly VITE_AUTH?: 'google' | 'example'
  /** Google 로그인 버튼의 웹 클라이언트 ID (공개 값. 로그인 방식이 google 일 때 쓴다) */
  readonly VITE_GOOGLE_CLIENT_ID?: string
  /** 'hash' 이면 #/projects 형태 주소 (정적 미리보기용), 아니면 /projects */
  readonly VITE_ROUTER?: 'browser' | 'hash'
  /** 'true' 이면 준비 중 페이지에 팀 기획 메모를 보인다 */
  readonly VITE_SHOW_PLAN?: string
  /** 'true' 이면 지원하기 '개발' 버튼(모집 중 ↔ 모집 기간 아님)을 보인다. Vercel PR 미리보기는 자동으로 'true' (vite.config.ts) */
  readonly VITE_DEV_SWITCH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
