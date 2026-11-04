import { useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSeminars } from '@/data/queries'
import type { Seminar } from '@/domain/types'
import { weekday } from '@/lib/date'
import { StateLine } from '../PageParts'
import { PREVIEW_COUNT, parseSeminarGen, periodLabel, seminarGenerations, seminarGroups, speakerCount, visibleCount, type SeminarGroup } from './seminars'
import a from './archive.module.css'

const EMPTY: Seminar[] = []

/** 주소: ?view=seminars&gen=2&q=리액트 (보내면 같은 화면이 열린다) */
const SEMINAR_GEN_PARAM = 'gen'
const SEMINAR_Q_PARAM = 'q'

const dot = (ymd: string) => ymd.replaceAll('-', '.')

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

/** 발표 한 줄: 날짜(같은 날이 이어지면 첫 줄에만) | 제목 · 발표자 | 자료 보기 */
function TalkRow({ talk, showDate, q }: { talk: Seminar; showDate: boolean; q: string }) {
  const kind = talk.format === 'pptx' ? 'PPT' : 'PDF'
  return (
    <li className={a.talk} data-first={showDate || undefined}>
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
        <span className={a.talkTitle}>
          <Highlight text={talk.title} q={q} />
        </span>
        <span className={a.talkSpeaker}>
          <Highlight text={talk.speaker} q={q} />
        </span>
      </span>
      {talk.fileUrl && (
        <a className={a.talkFile} href={talk.fileUrl} target="_blank" rel="noreferrer">
          <span className="visually-hidden">{talk.title} </span>
          {kind} 보기
          <span aria-hidden="true">↗</span>
          <span className="visually-hidden"> (새 창)</span>
        </a>
      )}
    </li>
  )
}

/** 기수 묶음: 머리(3기 · 기간 · 개수) → 발표 목록 → 접혀 있으면 '나머지 n개 더 보기' */
function GenGroup({ group, collapse, open, onOpen, q }: { group: SeminarGroup; collapse: boolean; open: boolean; onOpen: () => void; q: string }) {
  const shown = visibleCount(group, collapse && !open)
  const rest = group.items.length - shown
  const items = group.items.slice(0, shown)
  const headId = `seminars-${group.generation}`
  return (
    <section className={a.group} aria-labelledby={headId}>
      <header className={a.groupHead}>
        <h3 id={headId} className={a.groupTitle}>
          <span className="num">{group.generation}</span>기 세미나
        </h3>
        <p className={a.groupMeta}>
          <span className="num">{periodLabel(group.from, group.to)}</span> ·{' '}
          {group.items.length === group.total ? (
            <>
              발표 <span className="num">{group.total}</span>개
            </>
          ) : (
            <>
              <span className="num">{group.total}</span>개 중 <span className="num">{group.items.length}</span>개
            </>
          )}
        </p>
      </header>
      <ol className={a.talks}>
        {items.map((t, i) => (
          <TalkRow key={t.id} talk={t} showDate={i === 0 || items[i - 1].date !== t.date} q={q} />
        ))}
      </ol>
      {rest > 0 && (
        <button type="button" className={a.more} onClick={onOpen} aria-expanded={false}>
          {/* 버튼이 flex 라 글자 사이 띄어쓰기가 사라지지 않게 한 덩어리로 */}
          <span>
            나머지 <span className="num">{rest}</span>개 더 보기
          </span>
        </button>
      )}
    </section>
  )
}

/**
 * 아카이브 '세미나' 보기: 위 줄(기수 거르기 · 찾기) → 기수별 묶음 (최근 기수 먼저).
 * '전체'에서 검색어가 없으면 기수마다 최근 PREVIEW_COUNT 개만 보이고 나머지는 '더 보기' (4기 회의 2026-11-04).
 * 발표 자료(PDF)는 백엔드가 R2 에 올린 주소(fileUrl)가 있을 때만 '자료 보기'가 붙는다.
 */
export function SeminarsView() {
  const { data, isPending, isError, refetch } = useSeminars()
  const [params, setParams] = useSearchParams()
  const list = data ?? EMPTY
  const gens = useMemo(() => seminarGenerations(list), [list])
  const gen = parseSeminarGen(params.get(SEMINAR_GEN_PARAM), gens)
  const q = params.get(SEMINAR_Q_PARAM) ?? ''
  const groups = useMemo(() => seminarGroups(list, { gen, q }), [list, gen, q])
  const collapse = gen === undefined && !q.trim()
  const [opened, setOpened] = useState<ReadonlySet<number>>(() => new Set())
  const found = groups.reduce((n, g) => n + g.items.length, 0)

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

  return (
    <section id="seminars" className={`story paper ${a.seminars}`} aria-labelledby="seminars-title">
      <h2 id="seminars-title" className="visually-hidden">
        세미나 발표 {list.length}개
      </h2>
      <p className={a.summary}>
        <span className="num">{gens.length > 1 ? `${gens[gens.length - 1]}–${gens[0]}` : gens[0]}</span>기 세미나 발표 <span className="num">{list.length}</span>개 · 발표자{' '}
        <span className="num">{speakerCount(list)}</span>명
      </p>

      <div className={a.toolbar}>
        <div className={a.chips} role="group" aria-label="기수">
          <button type="button" className={a.chip} aria-pressed={gen === undefined} onClick={() => update({ [SEMINAR_GEN_PARAM]: undefined })}>
            전체
          </button>
          {gens.map((g) => (
            <button key={g} type="button" className={a.chip} aria-pressed={gen === g} onClick={() => update({ [SEMINAR_GEN_PARAM]: String(g) })}>
              <span className="num">{g}</span>기
            </button>
          ))}
        </div>
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

      {q.trim() && (
        <p className={a.found} role="status">
          ‘{q.trim()}’ <span className="num">{found}</span>개
        </p>
      )}

      {groups.length === 0 ? (
        <StateLine>‘{q.trim()}’에 맞는 세미나가 없습니다. 다른 낱말로 찾아보세요.</StateLine>
      ) : (
        <div className={a.groups}>
          {groups.map((g) => (
            <GenGroup key={g.generation} group={g} collapse={collapse} open={opened.has(g.generation)} onOpen={() => setOpened((s) => new Set(s).add(g.generation))} q={q} />
          ))}
        </div>
      )}
      {collapse && <p className={a.note}>기수마다 최근 발표 {PREVIEW_COUNT}개를 먼저 보여 드립니다.</p>}
    </section>
  )
}
