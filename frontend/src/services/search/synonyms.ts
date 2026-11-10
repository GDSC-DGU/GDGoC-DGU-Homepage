/**
 * 검색 키워드 넓히기.
 * 행사 · 프로젝트 이름은 영어(Camping Seminar)로, 찾는 사람은 한글(캠핑 세미나)로 치는 일이 많다.
 * 글 안에 왼쪽 말이 들어 있으면 오른쪽 말들을 키워드에 더한다. 비교는 소문자로 한다.
 * 새 행사 · 기술 이름이 생기면 여기에 한 줄 더하면 된다.
 */
export const SYNONYMS: ReadonlyArray<readonly [match: string, add: string]> = [
  ['camping seminar', '캠핑 세미나 캠핑세미나 정기 세미나'],
  ['part study', '파트 스터디 파트스터디 스터디'],
  ['파트 스터디', 'part study 스터디'],
  ['alumni', '알럼나이 선배 졸업생 현업 세미나'],
  ['open seminar', '오픈 세미나 오픈세미나 공개 세미나'],
  ['study jam', '스터디잼 스터디 잼 스터디'],
  ['gemini', '제미나이 제미니 ai'],
  ['solution challenge', '솔루션 챌린지 솔루션챌린지 공모전'],
  ['sdgs', '지속가능발전목표 지속가능 sdg 사회문제'],
  ['데모데이', 'demo day demoday 데모 발표 시연'],
  ['demo day', '데모데이 데모 발표 시연'],
  ['demoday', '데모데이 demo day 데모 발표 시연'],
  ['해커톤', 'hackathon 공모전'],
  ['hackathon', '해커톤 공모전'],
  ['동지톤', 'hackathon 해커톤 공모전'],
  ['g-sprint', 'g sprint 지스프린트 스프린트 sprint 팀 프로젝트'],
  ['ot', 'orientation 오리엔테이션 오티'],
  ['orientation', 'ot 오리엔테이션 오티'],
  ['합동', 'joint 연합 교류 세미나'],
  ['joint', '합동 연합 교류'],
  ['conference', '컨퍼런스 콘퍼런스 학술제'],
  ['회고', 'retrospective 4l 회고'],
  ['동홍동락', '홍익대 교류전 연합'],
  ['홈페이지', 'website 웹사이트 사이트'],
  ['웹사이트', 'website homepage 홈페이지 사이트'],
  ['flutter', '플러터 앱 모바일'],
  ['kotlin', '코틀린 안드로이드 앱'],
  ['spring', '스프링 백엔드 backend'],
  ['fastapi', '백엔드 backend 파이썬 python'],
  ['django', '장고 백엔드 backend 파이썬 python'],
  ['react', '리액트 프론트엔드 frontend 웹'],
  ['next.js', '넥스트 리액트 프론트엔드 frontend 웹'],
  ['typescript', '타입스크립트 프론트엔드 frontend'],
  ['firebase', '파이어베이스'],
  ['cloud run', '클라우드 gcp google cloud 서버'],
  ['vertex ai', '버텍스 ai gcp'],
  ['python', '파이썬'],
  ['모집', 'recruit recruiting 리크루팅 지원'],
  ['frontend', '프론트엔드 프론트 fe'],
  ['backend', '백엔드 be 서버'],
  ['product design', '디자인 프로덕트 디자인 design'],
]

/** 짧은 영어 낱말(ot 등)은 다른 낱말 안에 들어 있는 경우(hot, robot)를 피하려고 낱말 단위로만 맞춘다 */
function contains(text: string, match: string): boolean {
  if (/^[a-z]{1,3}$/.test(match)) return new RegExp(`(^|[^a-z])${match}([^a-z]|$)`).test(text)
  return text.includes(match)
}

/** 글(제목 · 설명 · 키워드)에 맞는 동의어를 붙여서 돌려준다. 같은 말은 한 번만 */
export function expandKeywords(...parts: Array<string | undefined | null | false>): string {
  const base = parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ')
  const lower = base.toLowerCase()
  const words = new Set(lower.split(/\s+/).filter(Boolean))
  for (const [match, add] of SYNONYMS) {
    if (contains(lower, match)) for (const w of add.split(/\s+/)) words.add(w)
  }
  return [...words].join(' ')
}
