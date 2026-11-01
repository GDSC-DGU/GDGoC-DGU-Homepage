import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminKeys, errorMessage, isAdminRepoError, useAdminRepos } from '../data'
import type { FinalPassedRow, RegisterResult } from '../data/recruit/types'
import { adminPath } from '../screens'
import { Dialog, StatusBadge, TextField } from '../ui'
import { Button, DialogError, TableBox } from './badges'
import { useAction } from './hooks'
import s from './recruit.module.css'

function PeopleTable({ caption, rows, note }: { caption: string; rows: FinalPassedRow[]; note?: (r: FinalPassedRow) => string }) {
  return (
    <TableBox label={caption}>
      <table className={s.simpleTable}>
        <caption className={s.tableCaption}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">이름</th>
            <th scope="col">학번</th>
            <th scope="col">학과</th>
            <th scope="col">이메일</th>
            {note && <th scope="col">비고</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.applicantId}>
              <th scope="row">{r.name}</th>
              <td className="num">{r.maskedStudentId}</td>
              <td>{r.department}</td>
              <td className={s.breakAll}>{r.email}</td>
              {note && (
                <td>
                  <StatusBadge tone="muted">{note(r)}</StatusBadge>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </TableBox>
  )
}

/**
 * 최종 합격자 사용자 등록 (P-ARC-09, Figma 07-5-5, F-ARC-036~038).
 * 최종 합격자를 등록 예정 / 이미 등록됨(같은 학번) 으로 나눠 보여 주고, [N명 등록]으로 학번을 아이디로 General 계정을 한 번에 만든다.
 * PIN 설정 안내 메일은 항상 보낸다 (흉내). 사용자 변경 이력 · 지원자별 처리 이력에 남는다. Core 지정은 사용자 관리에서 따로.
 */
export function RegisterDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (r: RegisterResult) => void }) {
  const repos = useAdminRepos()
  const rows = useQuery({ queryKey: adminKeys.section('recruit', 'finalPassed'), queryFn: () => repos.recruit.finalPassed(), enabled: open })
  const form = useQuery({ queryKey: adminKeys.section('recruit', 'form'), queryFn: () => repos.recruit.getForm(), enabled: open })
  const [generation, setGeneration] = useState<string | null>(null)
  const formGeneration = (form.data?.published ?? form.data?.draft)?.generation
  const gen = generation ?? (formGeneration ? String(formGeneration) : '')
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [result, setResult] = useState<RegisterResult | null>(null)
  const register = useAction(repos.recruit.registerFinalPassed)
  const resultRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (result) resultRef.current?.focus()
  }, [result])

  const all = rows.data ?? []
  const ready = all.filter((r) => r.registrable)
  const skipped = all.filter((r) => !r.registrable)

  const submit = async () => {
    setError(null)
    const n = Number(gen)
    if (!Number.isInteger(n) || n < 1 || n > 99) {
      setFieldError('등록 기수를 1~99 사이 숫자로 입력해 주세요.')
      return
    }
    setFieldError(null)
    try {
      const r = await register.run({ applicantIds: all.map((x) => x.applicantId), generation: n })
      setResult(r)
      onDone(r)
    } catch (e) {
      if (isAdminRepoError(e) && e.fields?.generation) setFieldError(e.fields.generation)
      setError(errorMessage(e))
    }
  }

  if (result) {
    const mailFailed = result.registered.filter((r) => r.mail === 'failed')
    return (
      <Dialog open={open} onClose={onClose} size="lg" title="최종 합격자 사용자 등록" footer={<Button onClick={onClose}>닫기</Button>}>
        <h3 ref={resultRef} tabIndex={-1} className={s.batchHeading}>
          {result.registered.length}명을 General 사용자로 등록했습니다
        </h3>
        <ul className={s.statTiles} aria-label="등록 결과">
          <li>
            <span className={s.statLabel}>등록</span>
            <span className={`num ${s.statValue}`}>{result.registered.length}</span>
          </li>
          <li>
            <span className={s.statLabel}>제외 (같은 학번)</span>
            <span className={`num ${s.statValue}`}>{result.skipped.length}</span>
          </li>
          <li data-tone={result.failed.length ? 'danger' : undefined}>
            <span className={s.statLabel}>실패</span>
            <span className={`num ${s.statValue}`}>{result.failed.length}</span>
          </li>
        </ul>
        <p className={s.muted}>등록한 사용자에게 PIN 설정 링크 메일을 보냈습니다 (예시: 실제로 보내지 않음). PIN 설정 상태는 '대기'입니다.</p>
        {mailFailed.length > 0 && (
          <p className={s.warnLine}>
            <StatusBadge tone="warning">메일 발송 실패 {mailFailed.length}명</StatusBadge> {mailFailed.map((m) => m.name).join(', ')} · 사용자 관리에서 [링크 재발송]으로 다시 보낼 수 있습니다.
          </p>
        )}
        {result.failed.length > 0 && (
          <div>
            <h4 className={s.failTitle}>등록하지 못한 지원자</h4>
            <ul className={s.planList}>
              {result.failed.map((f) => (
                <li key={f.applicantId}>
                  {f.name} <span className={s.muted}>· {f.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p>
          <Link to={adminPath.users}>사용자 관리에서 보기</Link> · Core 지정은 사용자 관리에서 따로 합니다.
        </p>
      </Dialog>
    )
  }

  const blocked = all.length === 0 ? '최종 합격자가 없습니다.' : ready.length === 0 ? '등록할 최종 합격자가 없습니다. 모두 이미 등록되어 있습니다.' : undefined

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="최종 합격자 사용자 등록"
      description="전형 결과가 최종 합격인 지원자를 학번을 아이디로 하는 General 사용자로 한 번에 만듭니다. 지원서의 이름 · 학번 · 학과 · 이메일로 등록합니다."
      onSubmit={() => void submit()}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={register.pending}>
            취소
          </Button>
          <Button type="submit" busy={register.pending} disabledReason={register.pending ? undefined : blocked}>
            {ready.length}명 등록
          </Button>
        </>
      }
    >
      <div className={s.registerTop}>
        <TextField
          label="등록 기수"
          required
          type="number"
          inputMode="numeric"
          min={1}
          max={99}
          value={gen}
          error={fieldError}
          help="기본값은 지원폼의 모집 기수입니다."
          onChange={(e) => setGeneration(e.target.value)}
        />
        <ul className={s.registerFacts}>
          <li>관리 유형 General · PIN 설정 상태 '대기'</li>
          <li>등록하면 PIN 설정 안내 메일을 항상 보냅니다</li>
          <li>Core 지정은 사용자 관리에서 따로 합니다</li>
        </ul>
      </div>
      {rows.isError ? (
        <DialogError message={errorMessage(rows.error)} />
      ) : !rows.data ? (
        <p role="status">최종 합격자를 불러오는 중입니다…</p>
      ) : all.length === 0 ? (
        <p className={s.emptyLine}>최종 합격자가 없습니다. 지원자 관리에서 결과를 최종 합격으로 바꾼 뒤 등록할 수 있습니다.</p>
      ) : (
        <>
          {ready.length > 0 ? <PeopleTable caption={`등록 예정 ${ready.length}명`} rows={ready} /> : <p className={s.emptyLine}>등록 예정인 최종 합격자가 없습니다.</p>}
          {skipped.length > 0 && <PeopleTable caption={`이미 등록됨 · 제외 ${skipped.length}명`} rows={skipped} note={() => '이미 등록됨 · 제외'} />}
        </>
      )}
      <DialogError message={error} />
    </Dialog>
  )
}
