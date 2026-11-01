import { useEffect, useRef, useState } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { deleteConfirm, objectParticle, type ConfirmText } from '../ui'

/**
 * 관리자 목록 화면(게시판 · 프로젝트)이 같이 쓰는 작은 훅: 고른 행 · 쪽 맞추기 · 삭제 뒤 초점.
 */
const EMPTY: ReadonlySet<string> = new Set()

/**
 * 표에서 고른 행: 목록(거르기 · 검색 · 쪽)이 바뀌면 비우고, 지금 보이는 행만 남긴다.
 * (다른 쪽에서 고른 것을 모르고 지우는 일이 없게)
 */
export function useSelection(listKey: string, visibleIds: readonly string[] | undefined) {
  const [state, setState] = useState<{ key: string; ids: ReadonlySet<string> }>({ key: listKey, ids: EMPTY })
  const raw = state.key === listKey ? state.ids : EMPTY
  const selected = visibleIds ? new Set([...raw].filter((id) => visibleIds.includes(id))) : EMPTY
  return {
    selected,
    set: (ids: Set<string>) => setState({ key: listKey, ids }),
    clear: () => setState({ key: listKey, ids: EMPTY }),
  }
}

/** 쪽 번호가 데이터 범위를 벗어났으면(마지막 쪽을 다 지움) 주소를 맞춘다. served 는 새로 받은 데이터의 쪽 (이전 쪽을 잠시 보여 주는 동안은 undefined) */
export function useClampPage(key: string, page: number, served: number | undefined, set: (patch: Record<string, number>) => void) {
  useEffect(() => {
    if (served !== undefined && served !== page) set({ [key]: served })
  }, [key, page, served, set])
}

/** 삭제가 끝나고 목록을 다시 받으면 그 목록 제목으로 초점 (지운 행의 버튼이 사라져 초점을 잃지 않게) */
export function useFocusAfterRefetch(fetching: boolean) {
  const pending = useRef(false)
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (pending.current && !fetching) {
      pending.current = false
      ref.current?.focus()
    }
  }, [fetching])
  return { ref, request: () => (pending.current = true) }
}

/**
 * [선택 삭제]의 확인 문구: 명세 문구 '선택한 N개의 게시글을 삭제할까요?' 를 한 개를 골랐을 때도 그대로 (F-ABD-003 1).
 * 행의 [삭제]는 ui/confirmText 의 deleteConfirm ('이 게시글을 삭제할까요?').
 */
export function selectedDeleteConfirm(noun: string, count: number, body?: string): ConfirmText {
  const text = deleteConfirm(noun, count, body)
  return count === 1 ? { ...text, title: `선택한 1개의 ${noun}${objectParticle(noun)} 삭제할까요?` } : text
}

/**
 * 쪽 · 거르기를 바꾸는 동안 이전 목록을 흐리게 남겨 둔다 (TanStack Query 의 keepPreviousData 와 같은 일).
 * keepPreviousData 를 가져오면 공개 페이지 첫 JS 에 이름 하나가 더 붙어서 같은 함수를 여기 둔다.
 */
export const keepPrevious = <T>(previous: T | undefined): T | undefined => previous

/**
 * 본문이 좁을 때(1280 미만, 사이드바 옆 본문 약 700–950px): 표 열을 합쳐 1024 에서도 [삭제] · [수정]까지 가로로 넘기지 않고 보이게.
 * 넓을 때는 명세의 열을 하나씩 따로 둔다.
 */
export const useCompactTable = () => useMediaQuery('(max-width: 1279px)')
