import { errorMessage, useAdminRepos } from '../data'
import { MAX_ATTEMPTS } from '../data/recruit/rules'
import type { ApplicantDetail, ScoreState } from '../data/recruit/types'
import { Panel, StatusBadge, formatDateTimeLong, useToast } from '../ui'
import { IconAlert } from '../ui/icons'
import { SCORE_STATE_LABEL, useAction } from './hooks'
import { Button, TableBox } from './badges'
import s from './recruit.module.css'

const STEPS: ScoreState[] = ['waiting', 'analyzing', 'done']

/**
 * 자동 평가 점수 (F-ARC-013 · 035, F-RCT-007): 총점 · 항목별 점수 · 근거, 채점 상태 '대기 → 분석 중 → 완료 / 산정 실패',
 * 추적성(평가 기준 버전 · 모델명 · 프롬프트 버전 · 산정 시각), [다시 산정](지금 기준으로 다시 채점, 결과 · 잠김은 그대로).
 * 산정 실패 상태는 Figma 07-5-6.
 */
export function ScorePanel({ a, criteriaVersion, criteriaReady }: { a: ApplicantDetail; criteriaVersion: number; criteriaReady: boolean }) {
  const repos = useAdminRepos()
  const toast = useToast()
  const rescore = useAction(() => repos.recruit.rescore(a.id))
  const sc = a.score
  const inProgress = sc.state === 'waiting' || sc.state === 'analyzing'
  const oldVersion = sc.state === 'done' && sc.criteriaVersion !== null && sc.criteriaVersion !== criteriaVersion
  const blocked = !criteriaReady ? '평가 기준을 먼저 저장해 주세요.' : inProgress ? '점수를 산정하는 중입니다. 끝난 뒤 다시 산정할 수 있습니다.' : undefined

  const run = async () => {
    try {
      await rescore.run()
      toast.success(`${a.name}의 점수를 지금 평가 기준(v${criteriaVersion})으로 다시 산정합니다. 전형 결과와 잠김 상태는 바뀌지 않습니다.`)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const current = sc.state === 'failed' ? 'done' : sc.state
  return (
    <Panel
      title="자동 평가 점수"
      description="AI 채점 참고 점수입니다. 합격 여부는 운영진이 정합니다."
      actions={
        <Button variant="secondary" size="xs" busy={rescore.pending} disabledReason={rescore.pending ? undefined : blocked} onClick={() => void run()}>
          다시 산정
        </Button>
      }
    >
      <ol className={s.steps} aria-label="채점 상태">
        {STEPS.map((st) => {
          const label = st === 'done' && sc.state === 'failed' ? '산정 실패' : SCORE_STATE_LABEL[st]
          const passed = STEPS.indexOf(st) < STEPS.indexOf(current)
          return (
            <li
              key={st}
              className={s.step}
              data-state={st === current ? (sc.state === 'failed' ? 'failed' : 'current') : passed ? 'passed' : undefined}
              aria-current={st === current ? 'step' : undefined}
            >
              {label}
              {st === current && <span className="visually-hidden"> (지금 상태)</span>}
            </li>
          )
        })}
      </ol>
      <p className="visually-hidden" role="status" aria-live="polite">
        점수 산정 상태: {SCORE_STATE_LABEL[sc.state]}
        {sc.state === 'done' ? `, ${sc.total}점` : ''}
      </p>

      {sc.state === 'done' && (
        <>
          <p className={s.totalScore}>
            <span className="num">{sc.total}</span>
            <span className={s.totalOf}> / 100점</span>
          </p>
          {oldVersion && (
            <p className={s.warnLine}>
              <StatusBadge tone="warning">옛 기준</StatusBadge>
              평가 기준 v{sc.criteriaVersion}로 산정한 점수입니다. 지금 기준은 v{criteriaVersion}입니다. [다시 산정]으로 지금 기준을 적용할 수 있습니다.
            </p>
          )}
          <TableBox label="항목별 점수">
            <table className={s.simpleTable}>
              <caption className="visually-hidden">항목별 점수와 산정 근거</caption>
              <thead>
                <tr>
                  <th scope="col">항목</th>
                  <th scope="col" className={s.numCol}>
                    점수
                  </th>
                  <th scope="col">산정 근거</th>
                </tr>
              </thead>
              <tbody>
                {sc.items.map((it) => (
                  <tr key={it.itemId}>
                    <th scope="row" className={s.nowrap}>
                      {it.name}
                    </th>
                    <td className={`${s.numCol} ${s.nowrap}`}>
                      <span className="num">{it.score}</span> / <span className="num">{it.points}</span>
                    </td>
                    <td className={s.reasonCell}>
                      {it.instructionIgnored && (
                        <span className={s.flag}>
                          <StatusBadge tone="warning">지시문 무시</StatusBadge>
                        </span>
                      )}
                      {it.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableBox>
        </>
      )}

      {inProgress && (
        <div className={s.scoreWait}>
          <p>
            {sc.state === 'waiting' ? '채점 대기열에서 기다리는 중입니다.' : `AI가 채점하는 중입니다 (시도 ${sc.attempts} / ${MAX_ATTEMPTS}회).`} {formatDateTimeLong(sc.stateAt)}부터.
          </p>
          {sc.job?.previousTotal != null && <p className={s.muted}>이전 점수 {sc.job.previousTotal}점 · 끝나면 처리 이력에 '이전 점수 → 새 점수'로 남습니다.</p>}
          <p className={s.muted}>15분 넘게 이 상태로 머물면 시스템이 다시 대기열에 넣고, 3회까지 실패하면 '산정 실패'로 바뀝니다.</p>
        </div>
      )}

      {sc.state === 'failed' && (
        <div className={s.failBox} role="note">
          <IconAlert className={s.noticeIcon} />
          <div>
            <p className={s.failBoxTitle}>점수를 산정하지 못했습니다</p>
            <p>{sc.failReason}</p>
            <p className={s.muted}>[다시 산정]으로 지금 평가 기준(v{criteriaVersion})으로 다시 채점할 수 있습니다. 점수가 없어도 결과 처리는 할 수 있습니다.</p>
          </div>
        </div>
      )}

      <dl className={s.trace}>
        <div>
          <dt>평가 기준</dt>
          <dd>{sc.criteriaVersion !== null ? `v${sc.criteriaVersion}` : '-'}</dd>
        </div>
        <div>
          <dt>모델</dt>
          <dd>{sc.model ?? '-'}</dd>
        </div>
        <div>
          <dt>프롬프트 버전</dt>
          <dd>{sc.promptVersion ?? '-'}</dd>
        </div>
        <div>
          <dt>산정 시각</dt>
          <dd>{sc.scoredAt ? formatDateTimeLong(sc.scoredAt) : '-'}</dd>
        </div>
      </dl>
    </Panel>
  )
}
