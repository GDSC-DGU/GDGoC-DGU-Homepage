/**
 * 지금 페이지 주소. 같은 페이지 안 섹션 표시(#faq)는 뺀다.
 * hash 주소로 빌드한 미리보기('#/recruits#faq')에서는 경로 부분('#/recruits')만 남긴다.
 */
export function shareUrl(loc: Pick<Location, 'origin' | 'pathname' | 'search' | 'hash'>): string {
  const route = loc.hash.startsWith('#/') ? loc.hash.replace(/#[^/#][^#]*$/, '') : ''
  return `${loc.origin}${loc.pathname}${loc.search}${route}`
}
