import { newId } from '../common/list'
import { isEmail, isStudentId } from '../common/mask'
import type { ActorRef } from '../common/types'
import type { AdminStore } from '../store'
import { appendUserHistory, type UserHistoryInput } from './history'
import { mailResultLabel, pinLinkFields, simulatePinMail } from './mail'
import type { AdminUser } from './types'

/**
 * 최종 합격자 일괄 사용자 등록 (F-ARC-037 · 038, API-ARC-029). 모집 담당이 예시 저장소에서 부른다:
 *   const r = bulkRegisterUsers(ctx.store, { people, generation: 5, actor, now: ctx.now() })
 * - 지원서의 이름 · 학번 · 학과 · 이메일로 General 사용자를 만들고 PIN 설정 상태는 '대기'
 * - 같은 학번의 사용자가 있으면 제외 (skipped), 형식이 틀리면 실패 (failed), 나머지는 등록
 * - PIN 설정 안내 메일은 항상 보낸다 (흉내, 실패하면 사용자 관리에 '발송 실패'로 보임)
 * - 사용자 변경 이력에 '일괄 등록'으로 남긴다 (지원자별 처리 이력은 모집 담당이)
 */
export interface BulkRegisterPerson {
  /** 지원서 id 등 부르는 쪽의 열쇠 (결과에 그대로 돌려준다) */
  key: string
  name: string
  studentId: string
  email: string
  department?: string | null
}

export interface BulkRegisterResult {
  registered: { key: string; userId: string; mail: 'sent' | 'failed' }[]
  skipped: { key: string; reason: string }[]
  failed: { key: string; reason: string }[]
}

export function bulkRegisterUsers(
  store: AdminStore,
  { people, generation, actor, now }: { people: readonly BulkRegisterPerson[]; generation: number; actor: ActorRef; now: number },
): BulkRegisterResult {
  const result: BulkRegisterResult = { registered: [], skipped: [], failed: [] }
  const taken = new Set(store.get('users').users.map((u) => u.studentId))
  const at = new Date(now).toISOString()
  const created: AdminUser[] = []
  const logs: UserHistoryInput[] = []

  for (const p of people) {
    if (taken.has(p.studentId)) {
      result.skipped.push({ key: p.key, reason: '이미 등록됨 · 제외' })
      continue
    }
    if (!p.name.trim() || !isStudentId(p.studentId) || !isEmail(p.email)) {
      result.failed.push({ key: p.key, reason: !isStudentId(p.studentId) ? '학번 형식이 올바르지 않습니다.' : !isEmail(p.email) ? '이메일 형식이 올바르지 않습니다.' : '이름이 비어 있습니다.' })
      continue
    }
    taken.add(p.studentId)
    const mail = simulatePinMail(p.email)
    const user: AdminUser = {
      id: newId('user'),
      name: p.name.trim(),
      studentId: p.studentId,
      email: p.email.trim(),
      type: 'General',
      generation,
      status: 'active',
      loginId: null,
      adminLogin: null,
      pinStatus: 'pending',
      ...pinLinkFields(now, mail),
      pinFailedCount: 0,
      lockedAt: null,
      lockReason: null,
      deactivatedAt: null,
      department: p.department?.trim() || null,
      created: { by: actor, at },
    }
    created.push(user)
    logs.push({ actor, target: user, action: 'bulk-register', detail: `최종 합격자 일괄 등록 (General · ${generation}기) · PIN 설정 링크 ${mailResultLabel(mail)}`, mail })
    result.registered.push({ key: p.key, userId: user.id, mail })
  }

  if (created.length) store.set('users', (s) => appendUserHistory({ ...s, users: [...s.users, ...created] }, logs, at))
  return result
}
