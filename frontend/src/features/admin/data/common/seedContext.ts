import type { AuditStamp, IsoTime } from './types'
import { ADMIN_ACCOUNT_SEED, actorOf, SYSTEM_ACTOR } from './accounts'

/**
 * seed 를 만들 때 쓰는 도구.
 * 예시 데이터의 시각은 '처음 만든 때(now)'를 기준으로 거꾸로 센다: 대시보드의 '최근 24시간' · '3시간 전'이
 * 언제 열어 봐도 그럴듯하게 보이도록. 테스트는 now 를 고정해서 넘긴다.
 */
export interface SeedContext {
  now: number
  /**
   * 예시 화면(프로토타입을 끈 공개 배포)용 seed 인지. 비우면 지금 빌드의 값(ADMIN_SAMPLE).
   * true 면 공개 사이트에 없는 자리(Community 회원 글 · 댓글)도 예시로 채운다. 테스트는 두 값을 모두 넘겨 본다
   */
  sample?: boolean
}

export interface SeedTools {
  /** now 에서 그만큼 전 시각 (ISO) */
  ago: (span: { days?: number; hours?: number; minutes?: number }) => IsoTime
  /** now 에서 n일 전 한국 날짜 'YYYY-MM-DD' (음수면 뒤) */
  dayOffset: (days: number) => string
  /** 예시 관리자가 한 일 (A = Lead, B · C = Core) */
  by: (who: 'A' | 'B' | 'C' | 'system', at: IsoTime) => AuditStamp
}

const KST_OFFSET = 9 * 3_600_000

export function seedTools({ now }: SeedContext): SeedTools {
  const ago: SeedTools['ago'] = ({ days = 0, hours = 0, minutes = 0 }) => new Date(now - ((days * 24 + hours) * 60 + minutes) * 60_000).toISOString()
  const dayOffset = (days: number) => new Date(now + KST_OFFSET - days * 86_400_000).toISOString().slice(0, 10)
  const admins = { A: ADMIN_ACCOUNT_SEED[0], B: ADMIN_ACCOUNT_SEED[1], C: ADMIN_ACCOUNT_SEED[2] }
  const by: SeedTools['by'] = (who, at) => ({ by: who === 'system' ? SYSTEM_ACTOR : actorOf(admins[who]), at })
  return { ago, dayOffset, by }
}

/**
 * 예시 그림 (SVG data URL): 사진이 없는 예시 자리에 쓴다. 그림 안에 '예시' 글자가 보인다.
 * 실제 사람 · 행사 사진처럼 보이지 않게 단색 면 + 글자만.
 */
export function exampleImage(label: string, { width = 1600, height = 900 }: { width?: number; height?: number } = {}): string {
  const size = Math.round(Math.min(width, height) / 9)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#F2F4F6"/><rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="#C9CDD2" stroke-width="2" stroke-dasharray="12 10"/><text x="50%" y="50%" fill="#61666F" font-family="Pretendard, sans-serif" font-size="${size}" font-weight="600" text-anchor="middle" dominant-baseline="middle">${escapeXml(label)}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] ?? c)
}
