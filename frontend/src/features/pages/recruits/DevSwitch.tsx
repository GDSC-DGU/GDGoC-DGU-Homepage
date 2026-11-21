import { Link } from 'react-router-dom'
import type { ApplyView } from './view'
import k from './devSwitch.module.css'

/**
 * 개발 화면에서만 보이는 버튼 (config/site.ts DEV_SWITCH: npm run dev 와 Vercel PR 미리보기).
 * 지원하기 페이지를 '모집 중'(지원서 열림) ↔ '모집 기간 아님'(지원하기 꺼짐) 으로 바꿔 본다. 실제 날짜 · 데이터는 바꾸지 않는다 (?preview= 만).
 */
export function DevSwitch({ mode }: { mode: ApplyView }) {
  const next = mode === 'form' ? 'closed' : 'open'
  return (
    <div className={k.box} role="group" aria-label="개발용 화면 바꾸기">
      <span className={k.tag}>개발</span>
      <span className={k.now}>지금: {mode === 'form' ? '모집 중' : '모집 기간 아님'}</span>
      <Link className={k.btn} to={`?preview=${next}`} replace preventScrollReset>
        {next === 'open' ? '모집 중 화면 보기' : '모집 기간 아님 보기'}
      </Link>
    </div>
  )
}
