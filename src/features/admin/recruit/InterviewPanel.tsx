import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { adminKeys, errorMessage, isAdminRepoError, useAdminRepos } from '../data'
import { BUSY_MESSAGE, busyAt, INTERVIEW_MINUTES, isoToKst, kstDateTime, kstToIso, timeSlots } from '../data/recruit/rules'
import type { ApplicantDetail } from '../data/recruit/types'
import { Checkbox, DateTimeField, Panel, SelectField, StatusBadge, TextField, useToast } from '../ui'
import { IconErrorMark, IconLock } from '../ui/icons'
import { sampleOnly } from '../sample'
import { useAction } from './hooks'
import { Button } from './badges'
import s from './recruit.module.css'

const SLOTS = timeSlots()
const endText = (iso: string) => isoToKst(new Date(Date.parse(iso) + INTERVIEW_MINUTES * 60_000).toISOString()).hhmm

/**
 * 면접 일정 지정 (F-ARC-039): 서류 합격자의 면접 일시(날짜 · 10분 단위 시각, KST)와 담당자(활성 Core 1명 이상).
 * 고른 담당자에게 겹치는 면접이 있는 시각은 고를 수 없고, 시각을 먼저 고르면 그 시간에 면접이 있는 담당자를 고를 수 없다 (각 30분 기준).
 * 서류 단계가 잠기면(서류 합격 메일 발송) 수정 불가. 저장할 때 서버가 겹침을 다시 확인한다.
 */
export function InterviewPanel({ a }: { a: ApplicantDetail }) {
  const repos = useAdminRepos()
  const toast = useToast()
  const current = a.interview ? isoToKst(a.interview.startAt) : null
  const [date, setDate] = useState(current?.ymd ?? '')
  const [time, setTime] = useState(current?.hhmm ?? '')
  const [ids, setIds] = useState<string[]>(a.interview?.interviewerIds ?? [])
  const [place, setPlace] = useState(a.interview?.place ?? '')
  const [errors, setErrors] = useState<{ date?: string; time?: string; ids?: string; save?: string }>({})
  // 날짜를 고르기 전에도 담당자 이름은 필요해서 오늘로 부른다
  const [today] = useState(() => isoToKst(new Date().toISOString()).ymd)
  const day = date || today
  const board = useQuery({ queryKey: adminKeys.section('recruit', 'interviews', day), queryFn: () => repos.recruit.interviews({ from: day, to: day }) })
  const save = useAction(() => repos.recruit.saveInterview(a.id, { startAt: kstToIso(date, time), interviewerIds: ids, place }))
  // 저장된 일정이 바뀌면(결과 변경으로 해제 등) 입력도 맞춘다
  const savedKey = a.interview ? `${a.interview.startAt}|${a.interview.interviewerIds.join()}|${a.interview.place ?? ''}` : ''
  const [seen, setSeen] = useState(savedKey)
  if (seen !== savedKey) {
    setSeen(savedKey)
    setDate(current?.ymd ?? '')
    setTime(current?.hhmm ?? '')
    setIds(a.interview?.interviewerIds ?? [])
    setPlace(a.interview?.place ?? '')
  }

  const editable = a.result === '서류 합격' && !a.locked.document
  const reason = a.locked.document
    ? '서류 합격 메일이 발송되어 면접 일정도 잠겼습니다. 결과 잠금 해제 뒤 고칠 수 있습니다.'
    : a.result !== '서류 합격'
      ? '면접 결과가 정해져 일정을 바꿀 수 없습니다.'
      : null
  const interviews = date ? (board.data?.interviews ?? []) : []
  const interviewers = board.data?.interviewers ?? []
  const busyFor = (hhmm: string) => (date ? busyAt(interviews, kstToIso(date, hhmm), a.id) : new Set<string>())
  const busyNow = time ? busyFor(time) : new Set<string>()
  const changed = !a.interview || a.interview.startAt !== (date && time ? kstToIso(date, time) : '') || a.interview.interviewerIds.join() !== ids.join() || (a.interview.place ?? '') !== place.trim()
  const others = interviews.filter((i) => i.applicantId !== a.id)
  const nameOf = (id: string) => interviewers.find((x) => x.userId === id)?.name ?? '담당자'

  const submit = async () => {
    const next = { date: date ? undefined : '면접 날짜를 골라 주세요.', time: time ? undefined : '면접 시각을 골라 주세요.', ids: ids.length ? undefined : '면접 담당자를 1명 이상 골라 주세요.' }
    setErrors(next)
    if (next.date || next.time || next.ids) return
    try {
      await save.run()
      toast.success(`면접 일정을 저장했습니다: ${kstDateTime(kstToIso(date, time))} · ${ids.map(nameOf).join(', ')}`)
    } catch (e) {
      const msg = errorMessage(e)
      setErrors({ save: msg, ...(isAdminRepoError(e) && e.fields?.interviewerIds ? { ids: e.fields.interviewerIds } : {}) })
      toast.error(msg)
    }
  }

  return (
    <Panel title="면접 일정" description={`면접 1건은 ${INTERVIEW_MINUTES}분 기준입니다${sampleOnly(' (확정 필요)')}. 시각은 10분 단위 · 한국 시간입니다.`}>
      <p className={s.currentResult}>
        {a.interview ? (
          <>
            <StatusBadge tone="success">지정됨</StatusBadge>
            <span>
              <span className="num">{kstDateTime(a.interview.startAt)}</span> – <span className="num">{endText(a.interview.startAt)}</span> ·{' '}
              {a.interview.interviewerIds.map((id) => nameOf(id)).join(', ')}
              {a.interview.place && ` · ${a.interview.place}`}
            </span>
          </>
        ) : (
          <StatusBadge tone="warning">면접 일정 미정</StatusBadge>
        )}
      </p>
      {!editable && reason && (
        <p className={s.lockLine}>
          <IconLock className={s.inlineIcon} />
          {reason}
        </p>
      )}
      {editable && (
        <form
          className={s.interviewForm}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <div className={s.interviewGrid}>
            <DateTimeField
              label="면접 날짜"
              required
              kind="date"
              value={date}
              error={errors.date}
              onChange={(e) => {
                setDate(e.target.value)
                setErrors({})
              }}
            />
            <SelectField
              label="시각"
              required
              placeholder="시각 선택"
              value={time}
              error={errors.time}
              disabled={!date}
              help={!date ? '날짜를 먼저 고릅니다.' : ids.length ? '고른 담당자에게 다른 면접이 있는 시각은 고를 수 없습니다.' : undefined}
              options={SLOTS.map((t) => {
                const clash = ids.some((id) => busyFor(t).has(id))
                return { value: t, label: clash ? `${t} (다른 면접 있음)` : t, disabled: clash && t !== time }
              })}
              onChange={(e) => {
                setTime(e.target.value)
                setErrors({})
              }}
            />
          </div>
          <fieldset className={s.questionPick} aria-invalid={errors.ids ? true : undefined} aria-describedby={errors.ids ? `iv-${a.id}-error` : undefined}>
            <legend className={s.optionsLegend}>
              면접 담당자 (활성 Core)
              <span className={s.req} aria-hidden="true">
                필수
              </span>
            </legend>
            {!date ? (
              <p className={s.muted}>날짜를 고르면 담당자를 고를 수 있습니다.</p>
            ) : !board.data ? (
              <p role="status">담당자 일정을 불러오는 중입니다…</p>
            ) : interviewers.length === 0 ? (
              <p className={s.muted}>활성 상태의 Core가 없습니다. 사용자 관리에서 Core를 지정해 주세요.</p>
            ) : (
              <div className={s.questionChecks}>
                {interviewers.map((iv) => {
                  const busy = busyNow.has(iv.userId) && !ids.includes(iv.userId)
                  return (
                    <Checkbox
                      key={iv.userId}
                      label={iv.name}
                      description={busy ? BUSY_MESSAGE : undefined}
                      checked={ids.includes(iv.userId)}
                      disabled={busy}
                      onChange={(e) => {
                        setIds(e.target.checked ? [...ids, iv.userId] : ids.filter((x) => x !== iv.userId))
                        setErrors({})
                      }}
                    />
                  )
                })}
              </div>
            )}
            {errors.ids && (
              <p id={`iv-${a.id}-error`} className={s.fieldError}>
                <IconErrorMark />
                {errors.ids}
              </p>
            )}
          </fieldset>
          <TextField
            label="면접 장소"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="예: 신공학관 6141"
            help="메일의 {{면접장소}}에 들어갑니다. 비우면 '장소는 따로 안내드립니다'로 보냅니다."
            autoComplete="off"
          />
          {date && board.data && (
            <div className={s.dayList}>
              <p className={s.dayListTitle}>이날 잡힌 다른 면접 {others.length}건</p>
              {others.length > 0 && (
                <ul>
                  {others.map((i) => (
                    <li key={i.applicantId}>
                      <span className="num">
                        {isoToKst(i.startAt).hhmm} – {isoToKst(i.endAt).hhmm}
                      </span>{' '}
                      · {i.applicantName} · {i.interviewerIds.map(nameOf).join(', ')}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {errors.save && (
            <p className={s.fieldError} role="alert">
              <IconErrorMark />
              {errors.save}
            </p>
          )}
          <div className={s.formActions}>
            <Button type="submit" variant="secondary" busy={save.pending} disabledReason={save.pending ? undefined : !changed ? '바뀐 일정이 없습니다.' : undefined}>
              면접 일정 저장
            </Button>
          </div>
        </form>
      )}
    </Panel>
  )
}
