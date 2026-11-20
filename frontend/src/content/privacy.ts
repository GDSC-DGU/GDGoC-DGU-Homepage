import { CHAPTER } from '@/content'

/**
 * 개인정보 처리방침 (P-COM-008, F-COM-005). /privacy 페이지가 그리고, Google 로그인 동의 화면에 이 주소를 등록한다.
 * 틀은 개인정보보호위원회 '개인정보 처리방침 작성지침'의 순서를 따르고, 내용은 기능 명세서에 정한 것만 적는다.
 * 법이 요구하는 항목만 적고, 로그인 방식 · 보관 방식 같은 내부 구현은 적지 않는다 (4기 Organizer 2026-11-20).
 * - 수집 항목 · 보유 기간: F-AUTH-001 · 003 · 008, F-RCT-003 · 004, F-OPS-004 · 006
 * - 처리 위탁 · 국외 이전 · 보호책임자 · 시행일: 4기 Organizer 2026-11-20 확정
 * - AI 채점은 Gemini API 유료(결제 연결) 사용, 가장 싼 모델 (4기 Organizer 2026-11-20). 유료는 보낸 내용을 Google 이 개선에 쓰지 않아 위탁으로 적는다.
 *   무료로 바꾸면 Google 이 개선에 쓰고 사람이 검토할 수 있어(Gemini API 추가 약관 'Unpaid Services'), 제3자 제공으로 다시 적어야 한다.
 * 내용을 바꾸면 시행일을 새로 정하고, 지원서 동의란의 요약(features/apply/ApplyPage.tsx)도 함께 맞춘다 (F-COM-005 규칙 4).
 */

export type PolicyBlock = { kind: 'p'; text: string } | { kind: 'list'; items: readonly string[] } | { kind: 'table'; caption: string; head: readonly string[]; rows: readonly (readonly string[])[] }

export interface PolicySection {
  /** 목차 · 링크용 (#retention) */
  id: string
  title: string
  blocks: readonly PolicyBlock[]
}

/** 시행일 (YYYY-MM-DD) */
export const PRIVACY_EFFECTIVE_DATE = '2026-12-29'

/** '2026-12-29' → '2026년 12월 29일' */
export function koreanDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return `${y}년 ${m}월 ${d}일`
}

export const PRIVACY_OFFICER = { name: '이도윤', role: 'GDGoC DGU 4기 Organizer', email: CHAPTER.email } as const

/** 처리 위탁 · 국외 이전을 받는 곳 (모두 미국 회사) */
export const PRIVACY_PROCESSORS = [
  { name: 'Google LLC', service: 'Google Cloud', task: '홈페이지 운영 · 데이터 보관' },
  { name: 'Google LLC', service: 'Gemini', task: '지원서 평가 보조 (AI)' },
  { name: 'Google LLC', service: 'Gmail', task: '안내 메일 발송' },
  { name: 'Vercel Inc.', service: 'Vercel', task: '홈페이지 호스팅' },
] as const

/** 지원서 동의란 · 관리자 미리보기 요약용 한 줄: 'Google LLC (Google Cloud · Gemini · Gmail), Vercel Inc. (Vercel)' */
export const PRIVACY_PROCESSOR_SUMMARY = [...new Set(PRIVACY_PROCESSORS.map((p) => p.name))]
  .map((name) => `${name} (${PRIVACY_PROCESSORS.filter((p) => p.name === name).map((p) => p.service).join(' · ')})`)
  .join(', ')

export const PRIVACY_INTRO =
  "GDGoC DGU(동국대학교 Google Developer Groups on Campus, 이하 '동아리')는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 빠르고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 정하여 공개합니다."

export const PRIVACY_SECTIONS: readonly PolicySection[] = [
  {
    id: 'purpose',
    title: '개인정보의 처리 목적',
    blocks: [
      { kind: 'p', text: '동아리는 다음 목적으로 개인정보를 처리하며, 목적이 바뀌면 미리 동의를 받는 등 필요한 조치를 합니다.' },
      {
        kind: 'list',
        items: [
          '동아리원 모집: 지원서 접수, 서류 · 면접 심사, 면접 일정 안내, 전형 결과 안내, 최종 합격자의 회원 계정 생성',
          '회원 관리: 초대 메일 발송, Google 계정 로그인, 본인 확인, 권한 관리',
          '홈페이지 운영: 게시글 · 댓글의 작성자 표시와 관리, 부정 이용 방지',
        ],
      },
    ],
  },
  {
    id: 'items',
    title: '처리하는 개인정보 항목',
    blocks: [
      {
        kind: 'table',
        caption: '구분별 처리 항목',
        head: ['구분', '항목'],
        rows: [
          ['지원자', '이름, 학번, 학과, 이메일, 지원서 질문에 대한 응답(링크 포함)'],
          ['회원', '이름, 학번, 이메일, 기수'],
          ['Google 로그인', 'Google 계정 고유 식별자, 로그인 이메일'],
          ['게시판 이용', '작성한 게시글 · 댓글 · 첨부파일'],
          ['자동으로 생기는 정보', '접속 기록(IP 주소, 접속 일시 등), 쿠키'],
        ],
      },
    ],
  },
  {
    id: 'retention',
    title: '개인정보의 처리 및 보유 기간',
    blocks: [
      { kind: 'p', text: '동아리는 아래 기간 동안 개인정보를 보유하고, 기간이 지나면 지체 없이 파기합니다.' },
      {
        kind: 'table',
        caption: '항목별 보유 기간',
        head: ['항목', '보유 기간'],
        rows: [
          ['지원서', '제출일로부터 1년'],
          ['회원 정보', '활동을 마친(비활성화) 뒤 1년'],
          ['로그인 기록', '로그아웃하거나 로그인 시간이 끝날 때까지'],
        ],
      },
      { kind: 'p', text: "회원 정보를 파기한 뒤에도 그 회원이 쓴 게시글 · 댓글은 남을 수 있으며, 작성자는 '탈퇴된 사용자'로 표시합니다." },
    ],
  },
  {
    id: 'destruction',
    title: '개인정보의 파기 절차 및 방법',
    blocks: [
      {
        kind: 'list',
        items: [
          '파기 절차: 보유 기간이 지난 개인정보는 지체 없이 파기하고, 파기한 내역을 기록합니다.',
          '파기 방법: 전자적 파일 형태의 정보는 복구할 수 없는 방법으로 삭제합니다. 종이에 출력한 정보는 분쇄하거나 소각합니다.',
        ],
      },
    ],
  },
  {
    id: 'third-party',
    title: '개인정보의 제3자 제공',
    blocks: [{ kind: 'p', text: '동아리는 정보주체의 개인정보를 제3자에게 제공하지 않습니다. 다만 정보주체의 별도 동의가 있거나 법률에 특별한 규정이 있는 경우에는 예외로 합니다.' }],
  },
  {
    id: 'outsourcing',
    title: '개인정보 처리의 위탁',
    blocks: [
      { kind: 'p', text: '동아리는 원활한 운영을 위해 다음과 같이 개인정보 처리 업무를 위탁합니다.' },
      {
        kind: 'table',
        caption: '수탁자와 위탁 업무',
        head: ['수탁자', '위탁 업무'],
        rows: PRIVACY_PROCESSORS.map((p) => [`${p.name} (${p.service})`, p.task]),
      },
      { kind: 'p', text: '수탁자가 위탁 업무 외에 개인정보를 처리하지 않도록 하고, 안전하게 처리하는지 감독합니다. 수탁자나 위탁 업무가 바뀌면 이 처리방침으로 알립니다.' },
    ],
  },
  {
    id: 'overseas',
    title: '개인정보의 국외 이전',
    blocks: [
      { kind: 'p', text: '위 수탁자는 해외 회사이므로, 위탁 업무를 위해 개인정보가 국외로 이전될 수 있습니다.' },
      {
        kind: 'list',
        items: [
          '이전받는 자: Google LLC, Vercel Inc. (미국)',
          '이전 항목: 위 처리 항목 중 위탁 업무에 필요한 항목',
          '이전 시기 및 방법: 홈페이지를 이용할 때 네트워크를 통해 전송',
          '이용 목적 및 보유 기간: 위탁 업무 수행, 위 보유 기간 동안',
          '거부 방법: 국외 이전을 원하지 않으면 지원 · 회원 가입을 하지 않을 수 있습니다. 다만 이 경우 지원과 로그인을 할 수 없습니다.',
        ],
      },
    ],
  },
  {
    id: 'ai',
    title: 'AI를 이용한 지원서 처리',
    blocks: [
      {
        kind: 'list',
        items: [
          '지원서 응답 일부를 AI로 분석해 운영진이 참고할 점수를 만듭니다. 이름 · 학번 · 학과 · 이메일은 AI에 보내지 않습니다.',
          'AI(Google Gemini)에 보낸 응답은 Google의 AI 학습이나 서비스 개선에 쓰이지 않습니다.',
          '합격 여부는 운영진이 결정합니다. AI 분석에 대한 문의는 아래 개인정보 보호책임자에게 할 수 있습니다.',
        ],
      },
    ],
  },
  {
    id: 'rights',
    title: '정보주체의 권리 · 의무 및 행사 방법',
    blocks: [
      {
        kind: 'list',
        items: [
          '정보주체는 언제든지 자신의 개인정보 열람, 정정, 삭제, 처리 정지를 요구할 수 있습니다.',
          '요구는 아래 개인정보 보호책임자 이메일로 할 수 있으며, 동아리는 지체 없이 조치합니다. 법정대리인이나 위임을 받은 사람을 통해서도 할 수 있습니다.',
        ],
      },
    ],
  },
  {
    id: 'security',
    title: '개인정보의 안전성 확보 조치',
    blocks: [
      {
        kind: 'list',
        items: [
          '관리적 조치: 개인정보를 다루는 사람을 운영진으로 최소화하고, 처리 내역을 기록합니다.',
          '기술적 조치: 개인정보는 암호화된 통신으로 주고받고, 접근 권한을 관리합니다.',
          '물리적 조치: 개인정보는 수탁자의 보안 시설에 보관합니다.',
        ],
      },
    ],
  },
  {
    id: 'cookies',
    title: '자동으로 개인정보를 수집하는 장치의 설치 · 운영 및 거부',
    blocks: [
      {
        kind: 'list',
        items: [
          '동아리는 로그인 상태를 유지하기 위해 쿠키를 사용합니다.',
          '지원서를 쓰는 동안 응답을 이용자 기기의 브라우저에 임시로 저장합니다. 이 내용은 서버로 보내지 않습니다.',
          '거부 방법: 브라우저 설정에서 쿠키 저장을 막을 수 있습니다. 다만 이 경우 로그인 등 일부 기능을 이용할 수 없습니다.',
        ],
      },
    ],
  },
  {
    id: 'officer',
    title: '개인정보 보호책임자',
    blocks: [
      { kind: 'p', text: '개인정보 처리에 관한 문의, 불만 처리, 피해 구제는 아래로 연락해 주세요.' },
      {
        kind: 'list',
        items: [`성명: ${PRIVACY_OFFICER.name} (${PRIVACY_OFFICER.role})`, `이메일: ${PRIVACY_OFFICER.email}`],
      },
    ],
  },
  {
    id: 'remedy',
    title: '권익침해 구제 방법',
    blocks: [
      { kind: 'p', text: '개인정보 침해에 대한 신고나 상담이 필요하면 아래 기관에 문의할 수 있습니다.' },
      {
        kind: 'list',
        items: [
          '개인정보분쟁조정위원회: 1833-6972 (www.kopico.go.kr)',
          '개인정보침해신고센터: 118 (privacy.kisa.or.kr)',
          '대검찰청: 1301 (www.spo.go.kr)',
          '경찰청: 182 (ecrm.police.go.kr)',
        ],
      },
    ],
  },
  {
    id: 'changes',
    title: '개인정보 처리방침의 변경',
    blocks: [{ kind: 'p', text: `이 개인정보 처리방침은 ${koreanDate(PRIVACY_EFFECTIVE_DATE)}부터 적용합니다. 내용이 바뀌면 시행 전에 이 페이지로 알립니다.` }],
  },
]
