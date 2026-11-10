import { Link } from 'react-router-dom'
import type { IconTileProps } from './iconTileData'
import s from './iconTile.module.css'

export type { IconTileProps }

/**
 * 아이콘 타일 (아트 디렉션 4-5): 실제 로고 · 앱 아이콘을 흰 판 위에 크게.
 * 정사각, radius 24%, 흰 판 + 1px 선, 로고는 판의 62%, 이름은 아래.
 * 작은 크기(40px)에서 가로로 긴 글자 로고(가로 : 세로 2 이상)는 판을 64 × 40 으로 늘려 로고를 판 폭의 84% 로 둔다.
 * 타일 전체가 링크라 누르는 자리가 넉넉하다 (작은 크기도 44px).
 * 회색 면 위에 로고를 놓지 않는다 (자리 표시 그림처럼 보임).
 */
export function IconTile({ to, src, name, width, height, size = 'default' }: IconTileProps) {
  // 가로로 긴 글자 로고(InGlo · Bravication · Wave): 작은 크기에서는 정사각 판에 넣으면 회색 선처럼 보여 판을 가로로 늘린다
  const wide = size === 'small' && width && height ? width / height >= 2 : false
  return (
    <Link className={`${s.tile} ${size === 'small' ? s.small : ''}`} to={to}>
      <span className={s.box} data-wide={wide || undefined}>
        <img src={src} alt="" width={width} height={height} loading="lazy" decoding="async" />
      </span>
      <span className={s.name}>{name}</span>
    </Link>
  )
}

/**
 * 아이콘 줄: 타일 여러 개를 한 줄로 (넓은 화면 · 태블릿 8칸, 폰 4칸).
 * small 이면 줄바꿈되는 가로 목록 (아이콘 40 + 이름).
 * label 은 목록 이름 (읽기 프로그램용, 예: '그 밖의 프로젝트'). 표지 그림이 없는 항목(null)은 건너뛴다.
 */
export function IconRow({ label, items, size = 'default' }: { label: string; items: readonly (IconTileProps | null)[]; size?: 'default' | 'small' }) {
  const shown = items.filter((it): it is IconTileProps => Boolean(it))
  if (shown.length === 0) return null
  return (
    <ul className={`${s.row} ${size === 'small' ? s.rowSmall : ''}`} aria-label={label}>
      {shown.map((it) => (
        <li key={`${it.name}-${it.src}`}>
          <IconTile {...it} size={size} />
        </li>
      ))}
    </ul>
  )
}
