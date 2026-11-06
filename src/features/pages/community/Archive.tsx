import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CHAPTER, PHOTOS } from '@/content'
import type { TermId } from '@/content/glossary'
import type { Generation, ScheduleEvent } from '@/domain/types'
import { assetUrl } from '@/features/pages/projects/exhibit'
import { EventRow, SeriesRow } from '../EventRows'
import { ExternalLink, StateLine, ToggleGroup } from '../PageParts'
import { generationRange } from '../records'
import { partitionGeneration } from './archiveModel'
import { countByGeneration } from './history'
import { firstMentions, mentionKey, type Mention } from './terms'
import { TermText } from './TermText'
import s from '../pages.module.css'
import c from './community.module.css'

const summaryKey = (n: number) => `summary:${n}`

/** 기수별 기록 위에 놓는 행사 사진 수 (3 × 2) */
const PHOTO_LIMIT = 6

/**
 * 기수별 기록 (시안 E): 기수 버튼 하나 → 그 기수의 한 줄 요약 + 기록 목록.
 * 예전의 기수 카드 네 장 · '세 기수의 1년' 달력 · 종류 거르기 · 노선도 · 접힌 목록을 이 하나로 줄였다.
 * 목록 순서: 대표 행사(큰 줄) → 이어 온 세션(한 줄에 회차 수) → 그 밖의 기록.
 * 고른 기수는 주소의 ?gen=3 에 남아 그대로 공유된다. 처음에는 지금 기수.
 */
export function Archive({
  gens,
  past,
  today,
  explained,
}: {
  /** 오래된 기수부터 */
  gens: readonly Generation[]
  past: readonly ScheduleEvent[]
  today: string
  /** 이 섹션보다 위에서 이미 풀어 쓴 용어 (여기서는 다시 풀지 않는다) */
  explained?: ReadonlySet<TermId>
}) {
  const [params, setParams] = useSearchParams()
  // 기수를 바꾸면 기록이 버튼이 움직인 쪽에서 들어온다 (오른쪽 칸 = 옛 기수 → 오른쪽에서). 처음 열 때는 움직이지 않는다
  const [dir, setDir] = useState<1 | -1 | null>(null)
  const order = [...gens].sort((a, b) => b.n - a.n)
  const counts = countByGeneration(past)
  const fallback = order.find((g) => g.current) ?? order[0]
  const asked = Number(params.get('gen'))
  const info = order.find((g) => g.n === asked) ?? fallback

  if (!info) {
    return (
      <StateLine>
        아직 옮겨 온 기록이 없습니다. 지난 행사는{' '}
        <ExternalLink href={CHAPTER.chapterPage} className={s.inlineLink}>
          gdg.community.dev 챕터 페이지
        </ExternalLink>
        에서 먼저 볼 수 있습니다.
      </StateLine>
    )
  }

  const events = past.filter((e) => e.generation === info.n)
  // 그 기수 행사 사진 (content/photos.json): 목록만 이어지던 기록에 사람이 보이게 (4기 Organizer 2026-11-06). 여섯 장까지
  const photos = PHOTOS.filter((p) => p.generation === info.n).slice(0, PHOTO_LIMIT)
  const { signature, routes, rows } = partitionGeneration(events)
  const mentions: Mention[] = [
    ...(info.summary ? [{ key: summaryKey(info.n), text: info.summary }] : []),
    ...signature.map((e) => ({ key: mentionKey.record(e), text: e.title })),
    ...routes.map((r) => ({ key: mentionKey.route(info.n, r.series), text: r.series })),
  ]
  const terms = firstMentions(mentions, explained)
  const range = generationRange(info)

  const choose = (v: string) => {
    const from = order.findIndex((g) => g.n === info?.n)
    const to = order.findIndex((g) => String(g.n) === v)
    if (from >= 0 && to >= 0 && from !== to) setDir(to > from ? 1 : -1)
    const next = new URLSearchParams(params)
    if (Number(v) === fallback?.n) next.delete('gen')
    else next.set('gen', v)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  return (
    <div className={c.archive}>
      <ToggleGroup
        label="기수"
        value={String(info.n)}
        onChange={choose}
        options={order.map((g) => ({ id: String(g.n), label: `${g.n}기`, count: counts.get(g.n) ?? 0 }))}
      />
      <div className={c.genPanel} id="archive" aria-live="polite">
        <div key={info.n} className={c.genSlide} data-dir={dir === null ? undefined : dir > 0 ? 'next' : 'prev'}>
        <div className={c.genIntro}>
          <h3 className={c.genTitle}>
            {info.current ? <span className="gen-tag">{info.n}기</span> : <span className="num">{info.n}기</span>}
            {info.current && <span className="visually-hidden"> (지금 기수)</span>}
            <span className={c.genName}>
              <span lang="en">{info.name}</span>
              {range && (
                <>
                  {' · '}
                  <span className="num">{range}</span>
                </>
              )}
            </span>
          </h3>
          {info.summary && (
            <p className={c.genSummary}>
              <TermText text={info.summary} terms={terms.get(summaryKey(info.n))} />
            </p>
          )}
        </div>
        {photos.length > 0 && (
          <ul className={c.genPhotos} aria-label={`${info.n}기 행사 사진`}>
            {photos.map((p) => (
              <li key={p.id}>
                <figure className={c.genPhoto}>
                  <img src={p.src.startsWith('https://') ? p.src : assetUrl(p.src)} alt={p.alt} width={p.width} height={p.height} loading="lazy" decoding="async" />
                  <figcaption>
                    {p.event} · <time className="num" dateTime={p.date}>{p.date.replaceAll('-', '.')}</time>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}
        {events.length === 0 ? (
          <p className={c.genEmpty}>
            gdg.community.dev에 공개된 {info.n}기 행사 기록은 없습니다. 이 기수가 남긴 프로젝트와 세미나는{' '}
            <Link className="link" to={`/archive?gen=${info.n}`}>
              아카이브
            </Link>
            에 있습니다.
          </p>
        ) : (
          <ul className={s.rows} aria-label={`${info.n}기 행사 기록 ${events.length}건`}>
            {signature.map((e) => (
              <EventRow key={e.id} e={e} today={today} size="lg" title={<TermText text={e.title} terms={terms.get(mentionKey.record(e))} />} />
            ))}
            {routes.map((r) => (
              <SeriesRow key={r.series} run={r} today={today} title={<TermText text={r.series} terms={terms.get(mentionKey.route(info.n, r.series))} />} />
            ))}
            {rows.map((e) => (
              <EventRow key={e.id} e={e} today={today} />
            ))}
          </ul>
        )}
        </div>
      </div>
    </div>
  )
}
