import type { To } from 'react-router-dom'
import type { Project } from '@/domain/types'
import { assetUrl } from '@/features/pages/projects/exhibit'
import { sheetSearch } from '@/features/pages/projects/sheetLink'

export interface IconTileProps {
  /** 누르면 갈 곳 (사이트 안). 프로젝트면 { pathname: '/archive', search: '?p=id' } */
  to: To
  /** 실제 로고 · 앱 아이콘 주소 (public 기준, assetUrl 을 거친 값) */
  src: string
  /** 보이는 이름 = 링크 이름 (그림은 alt="" 로 읽지 않는다) */
  name: string
  width?: number
  height?: number
  /** small: 40px 아이콘 + 옆에 이름 한 줄 (지원 안내 네 파트의 '지난 프로젝트' 줄) */
  size?: 'default' | 'small'
}

/** 프로젝트 → 아이콘 타일 값 (표지 그림이 없으면 null). 이름 뒤 괄호 설명은 뺀다: 'Tigo (티고)' → 'Tigo' */
export function projectIcon(p: Pick<Project, 'id' | 'name' | 'cover'>): IconTileProps | null {
  if (!p.cover) return null
  return {
    to: { pathname: '/archive', search: sheetSearch(p.id) },
    src: assetUrl(p.cover.src),
    name: p.name.replace(/\s*\(.*\)$/, ''),
    width: p.cover.width,
    height: p.cover.height,
  }
}

