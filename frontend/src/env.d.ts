interface ImportMetaEnv {
  readonly DEV: boolean
  /** 'http' 이면 Spring Boot API, 아니면 예시 데이터 */
  readonly VITE_DATA_SOURCE?: 'mock' | 'http'
  readonly VITE_API_BASE?: string
  /** 'hash' 이면 #/projects 형태 주소 (정적 미리보기용), 아니면 /projects */
  readonly VITE_ROUTER?: 'browser' | 'hash'
  /** 'true' 이면 준비 중 페이지에 팀 기획 메모를 보인다 */
  readonly VITE_SHOW_PLAN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
