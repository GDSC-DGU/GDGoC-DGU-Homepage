import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { currentLocked, currentMail } from '../data/recruit/rules'
import type { ApplicantResult, ApplicantRow, ScoreState } from '../data/recruit/types'
import { adminPath } from '../screens'
import type { BadgeTone } from '../ui'

/**
 * 모집 관리 화면이 같이 쓰는 작은 훅 · 함수: 처리 중 표시 · 팝업 상태 · 목록 상태(주소) · 표기.
 * (부품은 badges.tsx: 이 파일은 부품을 내보내지 않는다 — 개발 중 빠른 새로 고침이 되게)
 */

/**
 * 모집 관리 화면이 같이 쓰는 작은 것: 처리 중 표시 · 팝업 상태 · 목록 상태(주소) · 상태 배지.
 */

/**
 * 저장 · 발송 같은 한 번의 요청 + 처리 중 표시. TanStack Query 의 useMutation 대신 쓴다:
 * 관리자 코드가 useMutation 을 부르면 react-query 공통 부분이 공개 페이지와 같이 받는 새 파일로 떨어져 공개 페이지 첫 JS 가 늘어난다
 * (게시판 구역 NOTES). 저장 뒤 목록 새로 고침은 store 알림이 한다.
 */
export function useAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [pending, setPending] = useState(false)
  const run = async (...args: A): Promise<R> => {
    setPending(true)
    try {
      return await fn(...args)
    } finally {
      setPending(false)
    }
  }
  return { run, pending }
}

/** 쪽 · 거르기를 바꾸는 동안 이전 목록을 흐리게 남겨 둔다 (keepPreviousData 와 같은 일, 공개 페이지 JS 를 늘리지 않게 직접) */
export const keepPrevious = <T,>(previous: T | undefined): T | undefined => previous

/** 팝업 하나의 상태: 무엇을 열었는지 + 열림. key 는 열 때마다 새로 (안의 입력값을 처음으로) */
export type Opened<T> = { value: T; open: boolean; key: number } | null
export function useOpened<T>() {
  const [state, setState] = useState<Opened<T>>(null)
  const seq = useRef(0)
  return {
    state,
    open: useCallback((value: T) => setState({ value, open: true, key: ++seq.current }), []),
    close: useCallback(() => setState((x) => (x ? { ...x, open: false } : x)), []),
  }
}

// ── 지원자 목록 상태 (주소에 둔다: 상세에서 [목록으로] 시 탭 · 검색어 · 정렬 · 페이지 유지, F-ARC-013 3) ──

export type ResultTab = 'all' | ApplicantResult
export const RESULT_TABS: readonly ResultTab[] = ['all', '미정', '서류 합격', '서류 불합격', '면접 불합격', '최종 합격']

export function useApplicantListParams() {
  const [params, setParams] = useSearchParams()
  const rawResult = params.get('result') ?? 'all'
  const result: ResultTab = (RESULT_TABS as readonly string[]).includes(rawResult) ? (rawResult as ResultTab) : 'all'
  const q = params.get('q') ?? ''
  const sort = params.get('sort') === 'score' ? 'score' : 'appliedAt'
  const pageRaw = Number(params.get('page'))
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const set = useCallback(
    (patch: Partial<{ result: ResultTab; q: string; sort: 'appliedAt' | 'score'; page: number }>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined) continue
            if (v === '' || v === 'all' || v === 'appliedAt' || (k === 'page' && Number(v) <= 1)) next.delete(k)
            else next.set(k, String(v))
          }
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )
  return { result, q, sort: sort as 'appliedAt' | 'score', page, set, search: params.toString() }
}

/** 상세 → 목록으로: 목록에서 들어올 때 넘긴 주소 뒷부분을 붙인다 */
export const applicantsHref = (search?: string | null) => (search ? `${adminPath.applicants}?${search}` : adminPath.applicants)
export interface ApplicantLinkState {
  listSearch?: string
}

/** '/admin/recruit/applicants/ap-01' → 'ap-01' (useParams 를 쓰면 공개 페이지 공통 파일이 커져서 주소에서 직접 읽는다) */
export function applicantIdFromPath(pathname: string): string | null {
  const m = /^\/admin\/recruit\/applicants\/([^/?#]+)\/?$/.exec(pathname)
  if (!m) return null
  try {
    return decodeURIComponent(m[1])
  } catch {
    return null
  }
}

// ── 상태 배지 (글자 + 모양, 색만으로 말하지 않는다) ──

export const RESULT_TONE: Record<ApplicantResult, BadgeTone> = {
  미정: 'pending',
  '서류 합격': 'success',
  '서류 불합격': 'danger',
  '면접 불합격': 'danger',
  '최종 합격': 'success',
}

export const SCORE_STATE_LABEL: Record<ScoreState, string> = { waiting: '대기', analyzing: '분석 중', done: '완료', failed: '산정 실패' }

/** 목록 행의 메일 · 잠김 (지금 결과 단계 기준) */
export const rowMail = (r: ApplicantRow) => currentMail(r)
export const rowLocked = (r: ApplicantRow) => currentLocked(r)

/** 처리자 · 시각 한 줄 */
export const kstShort = (iso: string) => {
  const t = new Date(Date.parse(iso) + 9 * 3_600_000)
  return `${String(t.getUTCMonth() + 1).padStart(2, '0')}.${String(t.getUTCDate()).padStart(2, '0')} ${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`
}

/**
 * 작성 중인 내용이 있으면 탭 닫기 · 새로고침 전에 브라우저가 한 번 묻는다.
 * 사이드바로 옮기는 것은 막지 않는다 (useBlocker 를 쓰면 공개 페이지 공통 파일이 커진다, docs/ADMIN.md '번들').
 */
export function useLeaveGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
}

/** 화면 읽기에만 들리는 알림 한 줄 (순서 바꾸기 · 상태 변화). 같은 문장을 다시 말할 수 있게 번호를 붙여 새로 그린다 */
export function useAnnouncer() {
  const [msg, setMsg] = useState<{ text: string; n: number } | null>(null)
  const say = useCallback((text: string) => setMsg((m) => ({ text, n: (m?.n ?? 0) + 1 })), [])
  const node = (
    <p className="visually-hidden" role="status" aria-live="polite">
      {msg && <span key={msg.n}>{msg.text}</span>}
    </p>
  )
  return { say, node }
}
