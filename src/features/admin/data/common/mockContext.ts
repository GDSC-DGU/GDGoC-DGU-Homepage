import type { AdminStore } from '../store'
import { AdminRepoError } from './errors'
import type { ActorRef, FileRef } from './types'

/**
 * 예시 저장소(mock)가 서버 흉내를 낼 때 쓰는 도구.
 * - 지연: 200–400ms (불러오는 중 상태가 실제처럼 보이게)
 * - 실패 흉내: 기본은 끔 (failureRate 0). 화면의 실패 상태를 보고 싶을 때만 setMockOptions 로 켠다
 * - 돌려주는 값은 깊은 복사본: 화면이 받은 객체를 고쳐도 store 가 바뀌지 않게 (서버 응답과 같게)
 */
export interface MockOptions {
  latency: readonly [min: number, max: number]
  /** 0–1. 0.2 면 다섯 번에 한 번 '연결 실패' */
  failureRate: number
}

const options: MockOptions = { latency: [200, 400], failureRate: 0 }

export function setMockOptions(next: Partial<MockOptions>) {
  Object.assign(options, next)
}

export const getMockOptions = (): Readonly<MockOptions> => options

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** 서버를 다녀온 것처럼: 기다렸다가 work 를 실행하고 복사본을 돌려준다. work 가 던지면 그대로 실패 */
export async function respond<T>(work: () => T): Promise<T> {
  const [min, max] = options.latency
  if (max > 0) await wait(min + Math.random() * (max - min))
  if (options.failureRate > 0 && Math.random() < options.failureRate) {
    throw new AdminRepoError('NETWORK', '연결이 끊겼습니다 (예시 실패). 잠시 후 다시 시도해 주세요.')
  }
  const value = work()
  return value === undefined ? value : structuredClone(value)
}

/**
 * 구역별 예시 저장소가 받는 것.
 * store: 공통 데이터 (구역마다 자기 slice 만 고친다)
 * actor: 지금 로그인한 관리자 (서버가 쿠키로 아는 것처럼). 로그인 전이면 null
 * now: 지금 시각 (테스트에서 고정)
 * files: 올린 파일 (API-COM-005 흉내). fileId 로 FileRef 를 찾는다 (게시글 첨부 · 썸네일 · 리뷰 사진)
 */
export interface MockContext {
  store: AdminStore
  actor: () => ActorRef | null
  now: () => number
  files: Map<string, FileRef>
}

/** 로그인한 관리자만 (예시 저장소의 쓰기 동작은 모두 이것을 먼저 부른다) */
export function requireActor(ctx: MockContext): ActorRef {
  const a = ctx.actor()
  if (!a) throw new AdminRepoError('UNAUTHORIZED', '로그인이 필요합니다. 다시 로그인해 주세요.')
  return a
}

export const isoNow = (ctx: MockContext) => new Date(ctx.now()).toISOString()
