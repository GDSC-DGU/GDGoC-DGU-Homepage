import { useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSeminars } from '@/data/queries'
import type { Seminar } from '@/domain/types'
import { weekday } from '@/lib/date'
import { StateLine } from '../PageParts'
import { GenTabs } from '../projects/GenTabs'
import { matchesByGeneration, parseSeminarGen, periodLabel, seminarFileState, seminarGenerations, seminarGroup, seminarTabs, speakerCount, type SeminarGroup } from './seminars'
import a from './archive.module.css'

const EMPTY: Seminar[] = []

/** 주소: ?view=seminars&gen=2&q=리액트 (보내면 같은 화면이 열린다) */
const SEMINAR_GEN_PARAM = 'gen'
const SEMINAR_Q_PARAM = 'q'
const PANEL_ID = 'seminar-panel'
const seminarTabId = (key: string) => `seminar-tab-${key}`

const dot = (ymd: string) => ymd.replaceAll('-', '.')
const kindOf = (s: Pick<Seminar, 'format'>) => (s.format === 'pptx' ? 'PPT' : 'PDF')

/** 검색어와 같은 부분에 밑줄 (대소문자 무시, 처음 한 곳) */
function Highlight({ text, q }: { text: string; q: string }): ReactNode {
  const key = q.trim()
  const at = key ? text.toLowerCase().indexOf(key.toLowerCase()) : -1
  if (at < 0) return text
  return (
    <>
      {text.slice(0, at)}
      <mark className={a.mark}>{text.slice(at, at + key.length)}</mark>
      {text.slice(at + key.length)}
    </>
  )
}

/**
 * 발표 한 줄: 날짜(같은 날이 이어지면 첫 줄에만) | 제목 · 발표자 | 자료.
 * 자료가 올라와 있으면 줄 전체가 링크(새 창으로 PDF 열기 · PPT 받기). 아직이면 '준비 중', 자료가 없던 발표는 비워 둔다.
 */
function TalkRow({ talk, showDate, q }: { talk: Seminar; showDate: boolean; q: string }) {
  const state = seminarFileState(talk)
  const kind = kindOf(talk)
  const title = <Highlight text={talk.title} q={q} />
  return (
    <li className={a.talk} data-first={showDate || undefined} data-file={state}>
      <span className={a.talkDate} aria-hidden={!showDate || undefined}>
        {showDate && (
          <>
            <time className="num" dateTime={talk.date}>
              {dot(talk.date)}
            </time>{' '}
            <span className={a.talkWeek}>{weekday(talk.date)}</span>
          </>
        )}
      </span>
      {!showDate && <span className="visually-hidden">{dot(talk.date)}</span>}
      <span className={a.talkMain}>
        {state === 'ready' && talk.fileUrl ? (
          <a className={`${a.talkTitle} ${a.talkLink}`} href={talk.fileUrl} target="_blank" rel="noreferrer">
            {title}
            <span className="visually-hidden">
              {' '}
              ({kind}, 새 창)
            </span>
          </a>
        ) : (
          <span className={a.talkTitle}>{title}</span>
        )}
        <span className={a.talkSpeaker}>
          <Highlight text={talk.speaker} q={q} />
        </span>
      </span>
      {state === 'ready' && (
        <span className={a.talkFile} aria-hidden="true">
          {kind === 'PPT' ? 'PPT 받기 ↓' : 'PDF 열기 ↗'}
        </span>
      )}
      {state === 'pending' && <span className={a.talkPending}>{kind} 준비 중</span>}
    </li>
  )
}

/** 한 기수: 머리(3기 세미나 · 기간 · 개수) → 발표 전부 (게시판처럼 나열, 접지 않는다) */
function GenGroup({ group, q }: { group: SeminarGroup; q: string }) {
  const headId = `seminars-${group.generation}`
  const items = group.items
  return (
    <section className={a.group} aria-labelledby={headId}>
      <header className={a.groupHead}>
        <h3 id={headId} className={a.groupTitle}>
          <span className="num">{group.generation}</span>기 세미나
        </h3>
        <p className={a.groupMeta}>
          <span className="num">{periodLabel(group.from, group.to)}</span> ·{' '}
          {items.length === group.total ? (
            <>
              발표 <span className="num">{group.total}</span>개
            </>
          ) : (
            <>
              <span className="num">{group.total}</span>개 중 <span className="num">{items.length}</span>개
            </>
          )}
        </p>
      </header>
      <ol className={a.talks}>
        {items.map((t, i) => (
          <TalkRow key={t.id} talk={t} showDate={i === 0 || items[i - 1].date !== t.date} q={q} />
        ))}
      </ol>
    </section>
  )
}

/**
 * 아카이브 '세미나' 보기: 요약 한 줄 → 기수 탭(프로젝트 보기와 같은 모양, 3기 · 2기 · 1기) · 찾기 → 고른 기수의 발표 전부.
 * 발표 자료(PDF)는 백엔드가 R2 에 올린 주소(fileUrl)가 있을 때만 줄을 눌러 연다. 없으면 '준비 중'.
 */
export function SeminarsView() {
  const { data, isPending, isError, refetch } = useSeminars()
  const [params, setParams] = useSearchParams()
  const list = data ?? EMPTY
  const gens = useMemo(() => seminarGenerations(list), [list])
  const tabs = useMemo(() => seminarTabs(list), [list])
  const gen = parseSeminarGen(params.get(SEMINAR_GEN_PARAM), gens)
  const q = params.get(SEMINAR_Q_PARAM) ?? ''
  const group = useMemo(() => (gen === undefined ? null : seminarGroup(list, gen, q)), [list, gen, q])
  const elsewhere = useMemo(() => (q.trim() ? matchesByGeneration(list, q).filter((x) => x.gen !== gen) : []), [list, q, gen])
  const pending = list.filter((s) => seminarFileState(s) === 'pending').length

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setParams(next, { replace: true, preventScrollReset: true })
  }

  if (isPending) return <StateLine>세미나 기록을 불러오는 중입니다.</StateLine>
  if (isError) return <StateLine onRetry={() => void refetch()}>세미나 기록을 불러오지 못했습니다.</StateLine>
  if (gen === undefined || !group) return <StateLine>아직 옮겨 온 세미나 기록이 없습니다.</StateLine>

  const found = group.items.length
  return (
    <section id="seminars" className={`story paper ${a.seminars}`} aria-labelledby="seminars-title">
      <h2 id="seminars-title" className="visually-hidden">
        세미나 발표 {list.length}개
      </h2>
      <p className={a.summary}>
        <span className="num">{gens.length > 1 ? `${gens[gens.length - 1]}–${gens[0]}` : gens[0]}</span>기 세미나 발표 <span className="num">{list.length}</span>개 · 발표자{' '}
        <span className="num">{speakerCount(list)}</span>명
      </p>
      {pending > 0 && <p className={a.fileNote}>발표 자료(PDF)는 지금 올리는 중입니다. 올라온 발표는 줄을 누르면 새 창에서 열립니다.</p>}

      <div className={a.toolbar}>
        <GenTabs tabs={tabs} active={String(gen)} onChange={(key) => update({ [SEMINAR_GEN_PARAM]: key })} panelId={PANEL_ID} noun="세미나" tabId={seminarTabId} />
        <form
          className={a.search}
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
          }}
        >
          <label className="visually-hidden" htmlFor="seminar-q">
            세미나 찾기
          </label>
          <svg viewBox="0 0 24 24" aria-hidden="true" className={a.searchIcon}>
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" />
          </svg>
          <input id="seminar-q" className={a.searchInput} type="search" placeholder="제목 · 발표자" value={q} onChange={(e) => update({ [SEMINAR_Q_PARAM]: e.target.value || undefined })} />
        </form>
      </div>

      <div id={PANEL_ID} role="tabpanel" aria-labelledby={seminarTabId(String(gen))}>
        {q.trim() && found > 0 && (
          <p className={a.found} role="status">
            <span className="num">{gen}</span>기에서 ‘{q.trim()}’ <span className="num">{found}</span>개
          </p>
        )}
        {found === 0 ? (
          <div className={a.empty}>
            <StateLine>
              ‘{q.trim()}’에 맞는 <span className="num">{gen}</span>기 세미나가 없습니다.
            </StateLine>
            {elsewhere.length > 0 && (
              <p className={a.elsewhere}>
                {elsewhere.map((x) => (
                  <button key={x.gen} type="button" className={a.elsewhereBtn} onClick={() => update({ [SEMINAR_GEN_PARAM]: String(x.gen) })}>
                    <span className="num">{x.gen}</span>기에서 <span className="num">{x.count}</span>개 보기
                  </button>
                ))}
              </p>
            )}
          </div>
        ) : (
          <GenGroup group={group} q={q} />
        )}
      </div>
    </section>
  )
}
