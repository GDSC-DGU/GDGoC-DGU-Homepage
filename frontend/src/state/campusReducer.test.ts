import { describe, expect, it } from 'vitest'
import { campusReducer, type CampusState } from './campusReducer'

const base: CampusState = { selected: 'projects', hovered: null, hits: null }

describe('campusReducer', () => {
  it('장소를 고른다', () => {
    expect(campusReducer(base, { type: 'select', id: 'teams' }).selected).toBe('teams')
  })

  it('같은 값이면 상태 객체를 그대로 둔다 (불필요한 리렌더 방지)', () => {
    expect(campusReducer(base, { type: 'select', id: 'projects' })).toBe(base)
    expect(campusReducer(base, { type: 'hover', id: null })).toBe(base)
  })

  it('검색 결과를 넣고 지운다', () => {
    const s = campusReducer(base, { type: 'hits', hits: { community: 3 } })
    expect(s.hits).toEqual({ community: 3 })
    expect(campusReducer(s, { type: 'hits', hits: null }).hits).toBeNull()
  })
})
