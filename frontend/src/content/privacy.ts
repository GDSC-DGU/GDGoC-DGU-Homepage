import { CHAPTER } from '@/content'

/**
 * 개인정보 처리방침 (P-COM-008, F-COM-005). /privacy 페이지가 그리고, Google 로그인 동의 화면에 이 주소를 등록한다.
 * 틀은 개인정보보호위원회 '개인정보 처리방침 작성지침'의 순서를 따르고, 내용은 기능 명세서에 정한 것만 적는다.
 * - 수집 항목 · 보유 기간: F-AUTH-001 · 003 · 008, F-RCT-003 · 004, F-OPS-004 · 006
 * - 처리 위탁 · 국외 이전 · 보호책임자 · 시행일: 4기 Organizer 2026-11-20 확정
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
  { name: 'Google LLC', service: 'Google Cloud', task: '홈페이지 서버 운영, 데이터 저장' },
  { name: 'Google LLC', service: 'Gemini API', task: '지원서 응답의 AI 참고 점수 산정' },
  { name: 'Google LLC', service: 'Gmail', task: '전형 결과 · 초대 메일 발송' },
  { name: 'Vercel Inc.', service: 'Vercel', task: '홈페이지 화면 호스팅 · 전송' },
] as const

/** 지원서 동의란 · 관리자 미리보기 요약용 한 줄: 'Google LLC (Google Cloud · Gemini API · Gmail), Vercel Inc. (Vercel)' */
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
          '회원 관리: 초대 메일 발송, Google 계정 연결 · 로그인, 본인 확인, 관리 유형(운영진 · 일반 회원)에 따른 권한 관리',
          '홈페이지 운영: 게시글 · 댓글 · 첨부파일의 작성자 표시와 관리, 부정 이용 방지',
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
          ['회원', '이름, 학번, 이메일, 기수, 관리 유형'],
          ['Google 로그인', 'Google 계정 고유 식별자, 로그인 이메일'],
          ['게시판 이용', '작성한 게시글 · 댓글 · 첨부파일'],
          ['자동으로 생기는 정보', '접속 IP 주소, 접속 일시, 브라우저 정보 등 서버 접속 기록, 로그인 유지 쿠키'],
        ],
      },
      { kind: 'p', text: '동아리는 학번 · 비밀번호 · PIN 같은 별도의 비밀값을 받지 않습니다. 로그인은 Google 계정으로만 합니다.' },
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
          ['지원서 (응답 · 점수 · 처리 이력 포함)', '제출일로부터 1년'],
          ['회원 정보 (Google 계정 연결 정보 포함)', '비활성화 후 1년 (그 전에 다시 활성화하면 계속 보유)'],
          ['로그인 유지 정보', '로그인 후 1시간 또는 로그아웃할 때까지'],
          ['초대 링크', '발송 후 72시간 또는 사용할 때까지'],
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
          '파기 절차: 보유 기간이 지난 개인정보는 매일 오전 3시(한국 시간)에 자동으로 파기하고, 파기한 내역을 기록합니다.',
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
      { kind: 'p', text: '위탁 계약 시 위탁 업무 외 개인정보 처리 금지, 안전성 확보 조치 등 책임에 관한 사항을 정하고, 수탁자가 개인정보를 안전하게 처리하는지 감독합니다. 수탁자나 위탁 업무가 바뀌면 이 처리방침으로 알립니다.' },
    ],
  },
  {
    id: 'overseas',
    title: '개인정보의 국외 이전',
    blocks: [
      { kind: 'p', text: '위 수탁자는 모두 해외에 서버를 둔 회사이므로, 위탁 업무를 위해 개인정보가 국외로 이전됩니다.' },
      {
        kind: 'list',
        items: [
          '이전받는 자: Google LLC, Vercel Inc. (미국)',
          '이전되는 국가: 미국 등 각 회사가 운영하는 데이터센터 소재 국가',
          '이전 항목: 위 처리 항목 중 각 위탁 업무에 필요한 항목',
          '이전 시기 및 방법: 홈페이지를 이용할 때 네트워크를 통해 전송',
          '이용 목적 및 보유 기간: 위탁 업무 수행, 위 보유 기간이 끝나거나 위탁 계약이 끝날 때까지',
          '거부 방법: 국외 이전을 원하지 않으면 지원 · 회원 가입을 하지 않을 수 있습니다. 다만 이 경우 지원서 제출과 로그인을 할 수 없습니다.',
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
          '지원서가 제출되면 평가 기준에 정한 질문의 응답만 AI(Google Gemini)에 보내 참고 점수와 근거를 받습니다.',
          '이름 · 학번 · 학과 · 이메일은 AI에 보내지 않습니다.',
          'AI 점수는 운영진이 검토할 때 참고하는 값이며, 합격 여부는 운영진이 결정합니다.',
          'AI 점수에 이의가 있으면 아래 개인정보 보호책임자에게 문의할 수 있습니다.',
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
          '제출한 지원서는 고칠 수 없습니다. 고쳐야 하면 이메일로 알려 주시면 지원서를 삭제한 뒤 다시 지원하도록 안내합니다.',
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
          '관리적 조치: 개인정보는 운영진만 관리자 화면에서 볼 수 있고, 계정 · 권한 변경과 지원서 처리는 이력으로 남깁니다.',
          '기술적 조치: 모든 통신은 HTTPS로 암호화합니다. 비밀번호를 받지 않고 Google 로그인을 쓰며, 로그인 토큰은 브라우저 메모리와 HttpOnly 쿠키에만 두고 서버에는 해시로 저장합니다. 목록 화면에서는 학번 가운데를 가려 보여 줍니다.',
          '물리적 조치: 개인정보는 수탁자의 클라우드 데이터센터에 저장합니다.',
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
          '로그인 유지 쿠키: 로그인을 1시간 동안 유지하기 위해 HttpOnly 쿠키를 씁니다. 로그아웃하거나 1시간이 지나면 더 쓰지 않습니다.',
          '브라우저 저장소: 지원서를 쓰는 동안 응답을 그 기기의 브라우저에만 임시로 저장해, 다시 들어왔을 때 이어서 쓸 수 있게 합니다. 서버로 보내지 않습니다.',
          '거부 방법: 브라우저 설정에서 쿠키 · 사이트 데이터 저장을 막을 수 있습니다. 다만 이 경우 로그인할 수 없습니다.',
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
