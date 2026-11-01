/** 로그인 뒤 돌아갈 주소: 관리자 화면 안이고 로그인 화면이 아닐 때만 (바깥 주소로 튀지 않게) */
export function safeReturnPath(from: unknown): string {
  return typeof from === 'string' && /^\/admin(\/|$|\?)/.test(from) && !from.startsWith('/admin/login') ? from : '/admin'
}
