import { useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RepositoryProvider } from '@/data/RepositoryProvider'
import { createSnapshotRepositories } from '@/data/snapshot/snapshotRepositories'
import type { Repositories } from '@/data/repositories'
import { isYmd } from '@/lib/date'
import { NowSection } from './NowSection'

/**
 * 개발용: /__preview/now 에서 NowSection 만 띄워 본다.
 * ?today=2027-02-10 (날짜 바꿔 보기) · ?data=empty | error | pending (빈 목록 · 실패 · 불러오는 중)
 */
export function NowPreview() {
  const [params] = useSearchParams()
  const today = params.get('today') ?? ''
  const mode = params.get('data')

  const repos = useMemo((): Repositories | null => {
    if (!mode) return null
    const base = createSnapshotRepositories()
    const list =
      mode === 'empty'
        ? async () => []
        : mode === 'error'
          ? async () => Promise.reject(new Error('미리보기: 일정 불러오기 실패'))
          : () => new Promise<never>(() => {})
    return { ...base, schedule: { list } }
  }, [mode])

  const wrap = (node: ReactNode) => (repos ? <RepositoryProvider value={repos}>{node}</RepositoryProvider> : node)

  return (
    <div className="container" style={{ paddingBlock: '120px 160px' }}>
      {wrap(<NowSection today={isYmd(today) ? today : undefined} />)}
    </div>
  )
}
