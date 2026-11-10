import { placeColor } from '@/config/places'
import type { RecruitStatus as Status } from '@/content/recruitingStatus'
import { statusWords } from './homeData'
import s from './status.module.css'

/**
 * 첫 화면의 다음 기수 모집 상태 (content/recruitingStatus.ts 가 날짜로 계산): '5기 모집 / 아직 열리지 않음 / 지난 4기는 … / 열리면 …'.
 * 넓은 화면은 위 1px 먹색 괘선 + 네 줄 (예전 D-day 자리), 폰은 가운뎃점으로 이은 줄.
 * 폰의 가운뎃점은 각 묶음 앞에 붙고, 줄 맨 앞에 온 점은 틀 밖으로 밀려 잘린다: 줄 끝 · 줄 처음 어디에도 점이 남지 않는다.
 */
export function RecruitStatus({ status, className = '' }: { status: Status; className?: string }) {
  const { state, more } = statusWords(status)
  return (
    <p className={`${s.status} ${className}`} data-open={status.state === 'open' || undefined}>
      <span className={s.items}>
        <span className={s.head}>
          <i className="mark" style={{ ['--c' as string]: placeColor('recruits') }} aria-hidden="true" />
          {status.generation}기 모집
        </span>
        <span className={s.state}>{state}</span>
        {more.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </span>
    </p>
  )
}
