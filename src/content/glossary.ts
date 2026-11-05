/**
 * 사이트에 나오는 우리끼리 말(용어) 한 줄 풀이. 처음 보는 사람이 막히지 않게 처음 나올 때 함께 보여 준다.
 * 화면에는 features/glossary/Term.tsx 로만 그린다 (<Term id="g-sprint" />).
 *
 * 쓰는 법
 * - short: 괄호 안에 들어갈 만큼 짧게 (명사로 끝냄, 15자 안팎). 'G-Sprint(한 학기 팀 프로젝트)'
 * - long: 한두 문장 ~습니다체. <Term id="…" more /> 로 펼쳤을 때 보인다
 * - 공개 출처가 있는 사실만 (docs/CONTENT.md 1장). 출처는 source 에 남긴다 (화면에는 나오지 않음)
 * - id 는 다른 페이지가 쓰고 있으니 바꾸지 않는다. 새 말은 아래에 더한다
 */
export type TermId = 'g-sprint' | 'camping-seminar' | 'demo-day' | 'solution-challenge' | 'study-jam' | 'dong-hong' | 'core-member'

export interface TermDef {
  term: string
  /** 괄호 안에 넣을 만큼 짧은 풀이 */
  short: string
  /** 한두 문장 풀이 (~습니다체) */
  long: string
  /** 풀이의 근거 (화면에는 나오지 않음) */
  source: string
}

const EVENT = 'https://gdg.community.dev/events/details/google-gdg-on-campus-dongguk-university-seoul-south-korea-presents-'

export const GLOSSARY: Record<TermId, TermDef> = {
  'g-sprint': {
    term: 'G-Sprint',
    short: '한 학기 팀 프로젝트',
    long: '4기 팀 프로젝트입니다. 팀마다 가을 학기 동안 아이디어부터 배포까지 서비스 하나를 만들고 Google 기술을 하나 이상 씁니다.',
    source: `${EVENT}gdgoc-dgu-g-sprint-kickoff-team-meetings/`,
  },
  'camping-seminar': {
    term: 'Camping Seminar',
    short: '멤버 발표 세미나',
    long: '2 · 3기의 정기 세미나입니다. 멤버가 AI/ML · Web & App · Server/Cloud 주제로 발표하고 파트별로 나눠 이야기했습니다.',
    source: `${EVENT}gdg-on-campus-dgu-10th-camping-seminar/`,
  },
  'demo-day': {
    term: '데모데이',
    short: '만든 서비스를 시연하는 날',
    long: '만든 서비스를 사람들 앞에서 직접 시연하는 날입니다. 4기 G-Sprint 데모데이는 2026.12.29입니다.',
    source: `${EVENT}gdgoc-dgu-g-sprint-kickoff-team-meetings/`,
  },
  'solution-challenge': {
    term: 'Solution Challenge',
    short: 'Google 대학생 개발 대회',
    long: 'Google이 대학생 개발자에게 여는 대회로, UN 지속가능발전목표(SDGs)에 맞는 문제를 Google 기술로 푸는 서비스를 만듭니다.',
    source: 'https://developers.googleblog.com/solution-challenge-2024-using-google-technology-to-address-un-sustainable-development-goals/',
  },
  'study-jam': {
    term: 'Study Jam',
    short: '몇 주 동안 하는 실습 스터디',
    long: '한 가지 주제를 몇 주 동안 함께 실습하는 스터디입니다. 3기는 2026년 1월에 Gemini API · Google AI Studio로 3주 동안 열었습니다.',
    source: `${EVENT}gdgoc-dgu-winter-gemini-study-jams-2026-01-16/`,
  },
  'dong-hong': {
    term: '동홍동락',
    short: '동국대 · 홍익대 교류전',
    long: '동국대와 홍익대 챕터의 교류전입니다.',
    source: '4기 운영 계획',
  },
  'core-member': {
    term: '코어 멤버',
    short: '파트 세션을 이끄는 멤버',
    long: '파트마다 세션을 맡아 이끄는 멤버입니다. 4기는 코어 멤버를 일반 멤버보다 먼저 모집했습니다.',
    source: `${EVENT}gdgoc-dgu-4th-member-introduction-amp-part-sessions/`,
  },
}
