/**
 * 학번 가리기 (명세 F-AMB-001: '2026****42', 수정 팝업에서만 전체 표시).
 * 10자리면 앞 4 · 뒤 2 를 남기고 가운데 4 자리를 가린다. 길이가 다르면 앞 4 · 뒤 2 를 남기고 나머지를 가린다.
 * 서버(API)가 가린 값을 주는 것이 원칙이고, 예시 저장소(mock)가 같은 함수로 가린다.
 */
export function maskStudentId(studentId: string): string {
  const s = studentId.trim()
  if (s.length <= 6) return '*'.repeat(s.length)
  return `${s.slice(0, 4)}${'*'.repeat(s.length - 6)}${s.slice(-2)}`
}

/** 학번 형식: 숫자 10자리 (F-AMB-006) */
export const isStudentId = (s: string) => /^\d{10}$/.test(s)

/** 이메일 형식 (가벼운 확인: 서버가 다시 본다) */
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

/** URL 형식 (F-APJ-004: GitHub · 서비스 주소) */
export function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
