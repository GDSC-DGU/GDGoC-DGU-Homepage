import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { placeColor } from '@/config/places'
import type { PlaceId } from '@/domain/types'
import type { SourceItem } from './pageSources'
import { isRoomCode, splitVenue } from './venue'
import g from './signage.module.css'

/**
 * 안내판 조각: 장소 글자 · 길 돌림 안내 · 출처 한 줄.
 * 커뮤니티 · 지원 안내 · 준비 중(팀원 찾기) 페이지가 같이 쓴다. 지도의 이름표(흰 판 + 왼쪽 장소색 네모)와 같은 말투다.
 */

/**
 * 장소 글자: 건물 + 호실 ('정보문화관 P301'). 상자 · 색 네모 없이 맨 글자 (13/20 ink-700, 호실은 600 ink-900).
 * 일정 줄에는 이미 종류 표식(장소색 네모)이 있어서, 장소까지 상자로 두르면 한 줄에 장치가 겹친다 (아트 디렉션 5장).
 */
export function RoomPlate({ venue, prefix }: { venue: string; prefix?: string }) {
  const { building, room } = splitVenue(venue)
  return (
    <span className={g.plate}>
      {prefix && <span className="visually-hidden">{prefix} </span>}
      <span className={g.building}>{building}</span>
      {room && (
        <>
          {' '}
          <span className={`${g.room} ${isRoomCode(room) ? 'num' : ''}`}>{room}</span>
        </>
      )}
    </span>
  )
}

/**
 * 길 돌림 안내 한 줄: '찾는 곳이 여기가 아니면 저기로' (예: 팀원 찾기 페이지의 '동아리 지원은 지원 안내에서').
 * 장소색 네모 + 밑줄 글자. 사이트 안 이동이라 화살표는 없다. 누르는 자리 44px 이상.
 */
export function DetourLink({ to, place, children }: { to: string; place: PlaceId; children: ReactNode }) {
  return (
    <Link className={g.detour} to={to}>
      <span className={g.detourMark} style={{ '--c': placeColor(place) } as CSSProperties} aria-hidden="true" />
      <span className={g.detourText}>{children}</span>
    </Link>
  )
}

/**
 * 페이지 끝 출처 한 줄: '출처 gdg.community.dev · 4기 운영 계획 · … · 10.17 갱신'.
 * 줄마다 붙이던 출처 꼬리표 · 각주 대신 페이지에 한 번만 (pageSources.ts 가 목록을 접는다).
 */
export function PageSources({ items, updated }: { items: readonly SourceItem[]; updated?: ReactNode }) {
  if (items.length === 0 && !updated) return null
  return (
    <p className={g.pageSources}>
      <span className={g.pageSourcesLabel}>출처</span>
      {items.map((it, i) => (
        <Fragment key={it.key}>
          {i > 0 && ', '}
          {it.href ? (
            <a className={g.sourceLink} href={it.href} target="_blank" rel="noreferrer">
              {it.label}
              <span className="visually-hidden"> (새 창)</span>
              
            </a>
          ) : (
            <span>{it.label}</span>
          )}
        </Fragment>
      ))}
      {updated && (
        <>
          {', '}
          {updated}
        </>
      )}
    </p>
  )
}
