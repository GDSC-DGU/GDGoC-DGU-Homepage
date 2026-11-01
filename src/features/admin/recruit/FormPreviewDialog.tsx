import { useId, useRef } from 'react'
import { kstDay } from '../data/recruit/rules'
import type { FormQuestion } from '../data/recruit/types'
import { Dialog } from '../ui'
import { Button } from './badges'
import s from './recruit.module.css'

export interface PreviewForm {
  generation: string
  startDate: string
  endDate: string
  questions: FormQuestion[]
}

/** 지원 기간 줄: '2026.10.12 (월) 00:00 – 2026.10.23 (금) 23:59 (KST)' */
function periodText(start: string, end: string) {
  if (!start || !end) return '지원 기간을 아직 정하지 않았습니다.'
  return `${kstDay(`${start}T00:00:00+09:00`)} 00:00 – ${kstDay(`${end}T00:00:00+09:00`)} 23:59 (KST)`
}

const PLACEHOLDER: Record<string, string> = { 'q-student-id': '숫자 10자리', 'q-email': 'name@example.com' }

/**
 * 지원서 미리보기 (P-ARC-10, Figma 07-4-2, F-ARC-003): 작성 중인 양식을 지원서 작성(P-RCT-03) 화면 형태로 보여 준다.
 * 입력은 해 볼 수 있지만 어디에도 보내지 않고, [제출]은 막혀 있다 (미리보기에서는 제출할 수 없음).
 * 필수는 '*' (F-RCT-004 1), 상단에 기수 · 지원 기간 (2), 맨 아래 개인정보 동의 · AI 자동 채점 동의 · 처리방침 (F-RCT-005 4 · 5).
 */
export function FormPreviewDialog({ open, onClose, form }: { open: boolean; onClose: () => void; form: PreviewForm }) {
  const base = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const privacyRef = useRef<HTMLElement>(null)
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="지원서 미리보기"
      description="지원자에게 보이는 지원서 작성 화면입니다. 미리보기에서는 제출할 수 없고, 입력한 값은 어디에도 보내지 않습니다."
      initialFocus={closeRef}
      footer={
        <>
          <Button ref={closeRef} variant="secondary" onClick={onClose}>
            닫기
          </Button>
          <Button disabledReason="미리보기에서는 제출할 수 없습니다.">제출</Button>
        </>
      }
    >
      <div className={s.applyPreview}>
        <p className={s.applyEyebrow}>GDGoC DGU · Recruits</p>
        <h3 className={s.applyTitle}>{form.generation ? `${form.generation}기` : '(기수 미정)'} 지원서</h3>
        <p className={s.applyPeriod}>지원 기간 {periodText(form.startDate, form.endDate)}</p>
        <p className={s.applyNote}>
          <span aria-hidden="true">*</span> 표시는 필수 질문입니다.
        </p>
        <form className={s.applyForm} onSubmit={(e) => e.preventDefault()} aria-label="지원서 (미리보기)">
          {form.questions.map((q, i) => {
            const id = `${base}-q${i}`
            const title = q.title.trim() || '(질문 내용 없음)'
            const mark = q.required ? (
              <>
                <span className={s.star} aria-hidden="true">
                  {' '}
                  *
                </span>
                <span className="visually-hidden"> (필수)</span>
              </>
            ) : null
            if (q.type === 'choice') {
              return (
                <fieldset key={q.id} className={s.applyField}>
                  <legend className={s.applyLabel}>
                    {title}
                    {mark}
                  </legend>
                  <div className={s.applyChoices}>
                    {q.options
                      .filter((o) => o.trim())
                      .map((o, j) => (
                        <label key={j} className={s.applyChoice}>
                          <input type="radio" name={id} value={o} />
                          {o}
                        </label>
                      ))}
                    {q.options.filter((o) => o.trim()).length === 0 && <p className={s.muted}>(선택지 없음)</p>}
                  </div>
                </fieldset>
              )
            }
            return (
              <div key={q.id} className={s.applyField}>
                <label htmlFor={id} className={s.applyLabel}>
                  {title}
                  {mark}
                </label>
                {q.type === 'long' ? (
                  <textarea id={id} className={s.applyInput} rows={4} />
                ) : (
                  <input id={id} className={s.applyInput} type={q.id === 'q-email' ? 'email' : 'text'} inputMode={q.id === 'q-student-id' ? 'numeric' : undefined} placeholder={PLACEHOLDER[q.id]} />
                )}
              </div>
            )
          })}

          <fieldset className={s.consents}>
            <legend className={s.applyLabel}>동의 (모두 필수)</legend>
            <div className={s.consentRow}>
              <label className={s.applyChoice}>
                <input type="checkbox" />
                개인정보 수집 · 이용에 동의합니다 (필수)
              </label>
              <Button variant="ghost" size="xs" onClick={() => privacyRef.current?.focus()}>
                내용 보기
              </Button>
            </div>
            <div className={s.consentRow}>
              <label className={s.applyChoice}>
                <input type="checkbox" />
                AI 자동 채점 활용에 동의합니다 (필수)
              </label>
            </div>
            <details className={s.aiNotice}>
              <summary>AI 자동 채점 안내 보기</summary>
              <p>제출한 지원서는 AI를 활용한 자동 채점 서비스에 사용됩니다.</p>
              <ul>
                <li>AI에는 평가 항목에 해당하는 응답만 보냅니다. 이름 · 학번 · 학과 · 이메일은 보내지 않습니다.</li>
                <li>점수는 운영진이 검토할 때 참고하는 점수이며, 합격 여부는 운영진이 결정합니다.</li>
                <li>지원서는 제출일로부터 1년 뒤 삭제됩니다.</li>
              </ul>
            </details>
          </fieldset>

          <section ref={privacyRef} tabIndex={-1} className={s.privacy} aria-labelledby={`${base}-privacy`}>
            <h4 id={`${base}-privacy`} className={s.privacyTitle}>
              개인정보 처리방침 (요약 · 예시)
            </h4>
            <dl className={s.privacyList}>
              <dt>수집 항목</dt>
              <dd>이름 · 학번 · 학과 · 이메일 · 응답</dd>
              <dt>학번 관리</dt>
              <dd>본인 확인과 합격 후 회원 계정 생성에만 씁니다. AI 채점에 보내지 않고, 운영진 화면 목록에서는 가운데를 가려(예: 2026****42) 보여 줍니다.</dd>
              <dt>이용 목적</dt>
              <dd>지원자 선발 · 결과 안내</dd>
              <dt>보유 기간</dt>
              <dd>제출일로부터 1년 (지나면 삭제)</dd>
              <dt>처리 위탁</dt>
              <dd>메일 발송 서비스, AI 채점 서비스 (업체명은 서비스 확정 후 기재)</dd>
            </dl>
          </section>
        </form>
      </div>
    </Dialog>
  )
}
