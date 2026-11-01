import type { SeedContext } from './common/seedContext'
import { createAdminSeed, SLICE_VERSIONS, type AdminData } from './seed'

export type { AdminData } from './seed'
export type AdminSlice = keyof AdminData

/**
 * 관리자 예시 데이터 store: 메모리 + sessionStorage.
 * - 새로고침해도 같은 탭에서는 남고, 탭을 닫으면 처음으로 돌아간다 (BRIEF).
 * - 구역(slice)마다 따로 읽고 쓴다: 게시판 담당은 store.get('boards') · store.set('boards', …) 만 쓴다.
 * - 바뀌면 구독자에게 알린다 (AdminDataProvider 가 받아서 관리자 쿼리를 다시 부른다).
 * - reset(): '예시 데이터 처음으로'. seed 를 새로 만든다 (시각은 지금 기준으로 다시 계산).
 * - 구역의 seed 모양이 바뀌면 그 구역 seed.ts 의 SEED_VERSION 을 올린다: 저장된 옛 데이터 중 그 구역만 새 seed 로 바뀐다.
 * 공개 사이트 화면(홈 · 프로젝트 …)은 이 store 를 읽지 않는다 (서로 독립).
 */
export interface AdminStore {
  get<K extends AdminSlice>(key: K): AdminData[K]
  set<K extends AdminSlice>(key: K, next: AdminData[K] | ((prev: AdminData[K]) => AdminData[K])): void
  /** 전체 (useSyncExternalStore 의 getSnapshot 으로 쓸 수 있게, 바뀔 때만 새 객체) */
  snapshot(): AdminData
  subscribe(listener: () => void): () => void
  reset(): void
  /** seed 를 만든 시각 (밀리초). reset 하면 바뀐다 */
  seededAt(): number
}

/** sessionStorage 와 같은 모양 (테스트는 메모리 구현을 넘긴다) */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const ADMIN_DATA_KEY = 'gdgoc-admin-example-data'

interface Envelope {
  seededAt: number
  versions: Record<AdminSlice, number>
  data: AdminData
}

/** 쓸 수 있는 sessionStorage (사생활 보호 창 · 막힌 저장소면 null: 메모리에만 둔다) */
export function browserSessionStorage(): StorageLike | null {
  try {
    const s = window.sessionStorage
    const probe = '__gdgoc_admin_probe__'
    s.setItem(probe, '1')
    s.removeItem(probe)
    return s
  } catch {
    return null
  }
}

export interface AdminStoreOptions {
  storage?: StorageLike | null
  now?: () => number
  seed?: (ctx: SeedContext) => AdminData
  versions?: Record<AdminSlice, number>
  key?: string
}

export function createAdminStore({ storage = null, now = Date.now, seed = createAdminSeed, versions = SLICE_VERSIONS, key = ADMIN_DATA_KEY }: AdminStoreOptions = {}): AdminStore {
  const listeners = new Set<() => void>()

  const fresh = (): Envelope => {
    const at = now()
    return { seededAt: at, versions: { ...versions }, data: seed({ now: at }) }
  }

  const load = (): Envelope => {
    const raw = read(storage, key)
    if (!raw) return fresh()
    try {
      const saved = JSON.parse(raw) as Partial<Envelope>
      if (!saved || typeof saved !== 'object' || !saved.data || typeof saved.seededAt !== 'number') return fresh()
      // 버전이 바뀐 구역 · 없는 구역만 새 seed 로 (같은 seededAt 기준이라 시각이 서로 맞는다)
      const reseed = seed({ now: saved.seededAt })
      const data = { ...reseed } as AdminData
      for (const k of Object.keys(versions) as AdminSlice[]) {
        if (saved.versions?.[k] === versions[k] && saved.data[k] !== undefined) (data as Record<AdminSlice, unknown>)[k] = saved.data[k]
      }
      return { seededAt: saved.seededAt, versions: { ...versions }, data }
    } catch {
      return fresh()
    }
  }

  let env = load()
  persist()

  function persist() {
    if (!storage) return
    try {
      storage.setItem(key, JSON.stringify(env))
    } catch {
      // 저장 공간이 모자라면(큰 그림 등) 메모리에만 둔다. 새로고침하면 마지막 저장분으로 돌아간다
    }
  }

  const notify = () => {
    for (const l of [...listeners]) l()
  }

  return {
    get: (k) => env.data[k],
    set(k, next) {
      const prev = env.data[k]
      const value = typeof next === 'function' ? (next as (p: typeof prev) => typeof prev)(prev) : next
      if (value === prev) return
      env = { ...env, data: { ...env.data, [k]: value } }
      persist()
      notify()
    },
    snapshot: () => env.data,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    reset() {
      env = fresh()
      persist()
      notify()
    },
    seededAt: () => env.seededAt,
  }
}

function read(storage: StorageLike | null, key: string): string | null {
  if (!storage) return null
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

/** 테스트 · 미리보기용 메모리 저장소 */
export function memoryStorage(): StorageLike & { dump(): Record<string, string> } {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  }
}
