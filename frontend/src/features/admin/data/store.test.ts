import { describe, expect, it, vi } from 'vitest'
import { createAdminSeed, SLICE_VERSIONS } from './seed'
import { ADMIN_DATA_KEY, createAdminStore, memoryStorage } from './store'

const NOW = Date.parse('2026-11-01T03:00:00Z')

describe('관리자 예시 데이터 store (메모리 + sessionStorage)', () => {
  it('처음에는 seed 로 시작하고 저장소에 남긴다', () => {
    const storage = memoryStorage()
    const store = createAdminStore({ storage, now: () => NOW })
    expect(store.get('boards').posts.length).toBeGreaterThan(0)
    expect(store.seededAt()).toBe(NOW)
    expect(JSON.parse(storage.dump()[ADMIN_DATA_KEY]).seededAt).toBe(NOW)
  })

  it('구역(slice)을 바꾸면 구독자에게 알리고, 같은 탭에서 새로 만들어도(새로고침) 남아 있다', () => {
    const storage = memoryStorage()
    const store = createAdminStore({ storage, now: () => NOW })
    const listener = vi.fn()
    store.subscribe(listener)
    store.set('boards', (b) => ({ ...b, posts: b.posts.slice(1) }))
    expect(listener).toHaveBeenCalledTimes(1)
    const before = store.get('boards').posts.length

    const reloaded = createAdminStore({ storage, now: () => NOW + 60_000 })
    expect(reloaded.get('boards').posts).toHaveLength(before)
    // 다시 만든 seed 시각이 아니라 처음 시각을 지킨다 ('3시간 전'이 새로고침마다 바뀌지 않게)
    expect(reloaded.seededAt()).toBe(NOW)
  })

  it('같은 값을 넣으면 알리지 않는다 · 구독을 끊으면 더는 알리지 않는다', () => {
    const store = createAdminStore({ now: () => NOW })
    const listener = vi.fn()
    const off = store.subscribe(listener)
    store.set('users', (u) => u)
    expect(listener).not.toHaveBeenCalled()
    off()
    store.set('users', (u) => ({ ...u }))
    expect(listener).not.toHaveBeenCalled()
  })

  it("'예시 데이터 처음으로'(reset)는 지금 시각으로 seed 를 다시 만든다", () => {
    let now = NOW
    const store = createAdminStore({ storage: memoryStorage(), now: () => now })
    store.set('boards', { posts: [], comments: [] })
    const snap = store.snapshot()
    now = NOW + 3_600_000
    store.reset()
    expect(store.get('boards').posts.length).toBeGreaterThan(0)
    expect(store.seededAt()).toBe(now)
    expect(store.snapshot()).not.toBe(snap)
  })

  it('구역 seed 버전이 바뀌면 그 구역만 새 seed 로 바뀐다 (다른 구역의 변경은 남는다)', () => {
    const storage = memoryStorage()
    const store = createAdminStore({ storage, now: () => NOW })
    store.set('boards', (b) => ({ ...b, posts: [] }))
    store.set('projects', (p) => ({ projects: p.projects.slice(0, 2) }))

    const next = createAdminStore({ storage, now: () => NOW, versions: { ...SLICE_VERSIONS, boards: SLICE_VERSIONS.boards + 1 } })
    expect(next.get('boards').posts.length).toBeGreaterThan(0)
    expect(next.get('projects').projects).toHaveLength(2)
  })

  it('저장된 값이 깨졌거나 저장소를 쓸 수 없어도 seed 로 동작한다', () => {
    const storage = memoryStorage()
    storage.setItem(ADMIN_DATA_KEY, '{not json')
    expect(createAdminStore({ storage, now: () => NOW }).get('users').users.length).toBeGreaterThan(0)

    const throwing = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {},
    }
    const store = createAdminStore({ storage: throwing, now: () => NOW })
    store.set('boards', (b) => ({ ...b, comments: [] }))
    expect(store.get('boards').comments).toEqual([])
  })

  it('seed 는 시각만 주면 늘 같다 (테스트 · 처음으로가 예측 가능)', () => {
    expect(createAdminSeed({ now: NOW })).toEqual(createAdminSeed({ now: NOW }))
  })
})
