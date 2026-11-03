import { CHAPTER } from '@/content'
import { sampleOnly } from '../../sample'
import { maskStudentId } from '../common/mask'
import type { IsoTime } from '../common/types'
import { PIN_LINK_HOURS } from './rules'
import type { AdminUser, MailResult } from './types'

/**
 * PIN 설정 메일 흉내 (F-AMB-011 · 012 · 013, API-ARC-018 메일 서비스는 미정).
 * 실제로 보내지 않는다. 결과만 정해서 돌려준다:
 * 주소의 @ 앞이 'bounce' 로 시작하면 '발송 실패' (실패 표시 · [링크 재발송] 흐름을 볼 수 있게, 예: bounce01@example.com).
 */
export function simulatePinMail(to: string): MailResult {
  return /^bounce/i.test(to.trim()) ? 'failed' : 'sent'
}

/** 새 링크를 보낼 때 사용자에게 남는 값: 이전 링크는 무효, 새 링크는 72시간 (F-AMB-013 1 · F-COM-007 1) */
export function pinLinkFields(now: number, result: MailResult): Pick<AdminUser, 'pinLinkExpiresAt' | 'pinMailSentAt' | 'pinMailFailed'> {
  return {
    pinLinkExpiresAt: new Date(now + PIN_LINK_HOURS * 3_600_000).toISOString(),
    pinMailSentAt: new Date(now).toISOString(),
    pinMailFailed: result === 'failed',
  }
}

/** 이력 '내용' 꼬리 */
export const mailResultLabel = (r: MailResult) => (r === 'sent' ? '발송 완료' : '발송 실패')

export interface PinMailContent {
  subject: string
  /** 본문 줄 (이름 · 학번 가림 · 링크 · 인증 방법 · 문의처, F-AMB-011 1) */
  lines: string[]
  /** 링크 버튼 글자 */
  linkLabel: string
  expiresAt: IsoTime
}

/** 안내 메일 내용 (설정 = 새 회원, 재설정 = PIN 초기화). 예시 화면에서 '보낸 메일 보기'로 보여 준다 */
export function pinMailContent(user: Pick<AdminUser, 'name' | 'studentId'>, kind: 'setup' | 'reset', expiresAt: IsoTime): PinMailContent {
  const setup = kind === 'setup'
  return {
    subject: `${setup ? '[GDGoC DGU] PIN을 설정해 주세요' : '[GDGoC DGU] PIN 재설정 안내'}${sampleOnly(' (예시 메일)')}`,
    lines: [
      `${user.name}님, 안녕하세요.`,
      `학번 ${maskStudentId(user.studentId)} 계정의 ${setup ? 'PIN을 설정할' : 'PIN이 초기화되어 새 PIN을 정할'} 수 있는 링크를 보내 드립니다.`,
      `링크는 ${PIN_LINK_HOURS}시간 동안 한 번만 쓸 수 있습니다.`,
      '게시글 · 댓글을 쓸 때는 학번과 이 PIN(숫자 4자리)을 함께 입력합니다.',
      `문의: GDGoC DGU 운영진 (${CHAPTER.email})`,
    ],
    linkLabel: setup ? 'PIN 설정하기' : 'PIN 다시 설정하기',
    expiresAt,
  }
}
