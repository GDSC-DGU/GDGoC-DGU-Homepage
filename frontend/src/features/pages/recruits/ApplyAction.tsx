import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { APPLY_FORM_LIVE, SITE } from '@/config/site'
import { APPLY_PATH, applyTarget, type RecruitStatus } from '@/content/recruitingStatus'
import k from './recruit.module.css'

/**
 * 파트 판 아래 '{파트} 지원하기' (BOAZ 리크루팅의 부문별 지원 버튼을 참고, 2026-11-12).
 * - 사이트 안 지원서가 열려 있으면 /recruits/apply?part=frontend (지원 파트를 미리 골라 둔다)
 * - 바깥 지원서(applyUrl)면 그 주소 (새 창, 파트는 지원서에서 고른다)
 * - 모집 중이 아니면 누를 때 '지금은 지원 기간이 아닙니다' 팝업 (기획 05: 지원 기간이 아니면 안내 팝업).
 *   사이트 안 지원서가 아직 예시면(APPLY_FORM_LIVE false) 팝업에 '예시 지원서 보기'를 붙여 화면을 확인할 수 있게 한다.
 */
export function PartApply({ st, partId, partName }: { st: RecruitStatus; partId: string; partName: string }) {
  const [open, setOpen] = useState(false)
  const target = applyTarget(st)
  const label = (
    <>
      <span lang="en">{partName}</span> 지원하기
    </>
  )
  if (target?.external)
    return (
      <a className="btn-secondary btn-sm" href={target.href} target="_blank" rel="noreferrer">
        {label}
        <span className="visually-hidden"> ({st.generation}기 지원서, 새 창)</span>
      </a>
    )
  if (target)
    return (
      <Link className="btn-secondary btn-sm" to={`${target.href}?part=${partId}`}>
        {label}
      </Link>
    )
  return (
    <>
      <button type="button" className="btn-secondary btn-sm" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {label}
      </button>
      <ClosedDialog open={open} onClose={() => setOpen(false)} st={st} partId={partId} />
    </>
  )
}

function ClosedDialog({ open, onClose, st, partId }: { open: boolean; onClose: () => void; st: RecruitStatus; partId: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d || typeof d.showModal !== 'function') return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  const gen = st.generation
  const desc =
    st.state === 'soon' && st.opensAt
      ? `${gen}기 지원은 ${st.opensAt.slice(5).replace('-', '.')}에 열립니다. 열리는 날 인스타그램 ${SITE.links.instagramHandle}에도 알립니다.`
      : st.state === 'ended'
        ? `${gen}기 지원은 마감됐습니다. 다음 모집 소식은 인스타그램 ${SITE.links.instagramHandle}에 올립니다.`
        : `${gen}기 모집 일정은 정해지면 인스타그램 ${SITE.links.instagramHandle}에 가장 먼저 알립니다.`
  return (
    <dialog
      ref={ref}
      className={k.modal}
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        // 바깥(어두운 면)을 누르면 닫는다
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={k.modalBody}>
        <h2 id={titleId} className={k.modalTitle}>
          지금은 지원 기간이 아닙니다
        </h2>
        <p id={descId} className={k.modalDesc}>
          {desc}
        </p>
        {!APPLY_FORM_LIVE && (
          <p className={k.modalNote}>
            지원서 화면은 준비 중입니다.{' '}
            <Link to={`${APPLY_PATH}?part=${partId}`} onClick={onClose}>
              예시 지원서 보기
            </Link>
          </p>
        )}
        <div className={k.modalFoot}>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose}>
            닫기
          </button>
          <a className="btn-primary btn-sm" href={st.channelUrl} target="_blank" rel="noreferrer">
            {gen}기 소식 받기<span className="visually-hidden"> (인스타그램, 새 창)</span>
          </a>
        </div>
      </div>
    </dialog>
  )
}
