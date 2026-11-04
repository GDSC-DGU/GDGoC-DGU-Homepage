import { describe, expect, it } from 'vitest'
import { NAV_ORDER } from '@/config/places'
import { SLIDE_ORDER, placeOfPath, transitionKind } from './viewTransitions'

describe('페이지 전환 (메뉴 순서대로 좌우 밀기)', () => {
  it('주소 이름이 같으면(?p= 로 창만 여닫기) 전환하지 않는다', () => {
    expect(transitionKind('/archive', '/archive')).toBeNull()
    expect(transitionKind('/', '')).toBeNull()
  })
  it('머리말에서 오른쪽 메뉴로 가면 forward, 왼쪽으로 가면 back', () => {
    expect(transitionKind('/', '/archive')).toBe('forward')
    expect(transitionKind('/archive', '/about')).toBe('forward')
    expect(transitionKind('/about', '/recruits')).toBe('forward')
    expect(transitionKind('/recruits', '/teams')).toBe('back')
    expect(transitionKind('/about/', '/')).toBe('back')
  })
  it('홈 ↔ 장소도 다른 메뉴와 같은 규칙 (지도 확대 같은 따로 노는 전환이 없다)', () => {
    for (const to of ['/archive', '/about', '/teams', '/recruits']) expect(transitionKind('/', to)).toBe('forward')
  })
  it('장소가 아닌 주소가 끼면 페이드', () => {
    expect(transitionKind('/', '/admin')).toBe('fade')
    expect(transitionKind('/nope', '/archive')).toBe('fade')
  })
  it('관리자 화면끼리는 전환하지 않는다 (사이드바 메뉴는 바로 바뀐다)', () => {
    expect(transitionKind('/admin', '/admin/users')).toBeNull()
    expect(transitionKind('/admin/login', '/admin')).toBeNull()
    expect(transitionKind('/admin/users', '/')).toBe('fade')
    expect(transitionKind('/administrator', '/admin')).toBe('fade')
  })
  it('하위 주소도 그 장소로 본다', () => {
    expect(placeOfPath('/recruits/faq')).toBe('recruits')
    expect(placeOfPath('/')).toBe('about')
    expect(placeOfPath('/archivex')).toBeNull()
    // 소개(/about)는 안쪽 id 가 community (예전 커뮤니티 자리). 예전 /community 는 router 가 옮기므로 장소가 아니다
    expect(placeOfPath('/about')).toBe('community')
    expect(placeOfPath('/community')).toBeNull()
  })
  it('밀기 순서에 모든 메뉴 장소가 한 번씩 있다', () => {
    expect([...SLIDE_ORDER].sort()).toEqual([...NAV_ORDER].sort())
  })
})
