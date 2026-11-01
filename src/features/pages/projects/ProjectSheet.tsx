import { useEffect, useRef, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { placeColor } from '@/config/places'
import type { Project, ProjectImage } from '@/domain/types'
import { useModalDialog } from '@/features/layout/useModalDialog'
import { ExternalLink, Mark } from '../PageParts'
import { Dotted, LiveLink } from './ExhibitCard'
import { assetUrl, languageSegments, monthSpan, outLinks, projectGallery, repoPath } from './exhibit'
import { LanguageBar } from './Plate'
import { sheetSearch } from './sheetLink'
import { morphClose } from './sheetMorph'
import c from './sheet.module.css'

const PROJECT_COLOR = placeColor('projects')

/** 'YYYY-MM-DD' → '2026.10.17' (기준일 표기) */
const dotted = (ymd: string) => ymd.replaceAll('-', '.')

/** 그림 한 장 + 이름 · 원본 링크 */
function Shot({ img, project, first }: { img: ProjectImage; project: Project; first: boolean }) {
  return (
    <figure className={c.shot} data-kind={img.kind}>
      <div className={c.frame} data-morph-target={first ? 'media' : undefined}>
        <img src={assetUrl(img.src)} alt={img.alt} width={img.width} height={img.height} loading={first ? 'eager' : 'lazy'} decoding="async" />
      </div>
      <figcaption className={c.shotCaption}>
        <span>{img.caption ?? img.alt}</span>
        <ExternalLink href={img.source} context={`${project.name} ${img.caption ?? ''} 원본 그림`} className={`link ${c.source}`}>
          원본
        </ExternalLink>
      </figcaption>
    </figure>
  )
}

/**
 * 프로젝트 자세히 보기 창 (/projects?p=<id>).
 * <dialog> showModal 이라 초점이 창 안에만 돌고 Esc 로 닫히며, 닫으면 연 자리로 초점이 돌아간다 (useModalDialog).
 * 그림(화면 캡처 · 구조도) 크게 + 지금 써 보기(주 버튼, 서비스가 있을 때) + 사실(기수 · 프로그램 · 재료 · 언어 · 대표 저장소 숫자)
 * + 바깥 링크 줄(GitHub 저장소 ↗ · 데모 영상 ↗) + 앞 · 뒤 작품(← · →, 사이트 안).
 * 폰: 아래에서 올라오는 시트. 첫 그림 → 사실 → 나머지 그림 순서.
 */
export function ProjectSheet({
  project,
  prev,
  next,
  roomTitle,
  position,
  walkState,
  onClosed,
}: {
  project: Project | null
  prev?: Project
  next?: Project
  roomTitle?: string
  /** 전시실 안 몇 번째 작품인지 [n, 전체] */
  position?: [number, number]
  /** 앞 · 뒤 작품으로 넘길 때 그대로 넘길 history state (주소로 바로 연 창이면 비어 있어야 닫을 때 페이지에 남는다) */
  walkState?: unknown
  onClosed: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { ref, restoreFocus } = useModalDialog(project !== null, headingRef)

  // 앞 · 뒤 작품으로 넘기면 창 맨 위로, 제목으로 초점
  const id = project?.id
  useEffect(() => {
    if (!id) return
    scrollRef.current?.scrollTo({ top: 0 })
    if (ref.current?.open) headingRef.current?.focus({ preventScroll: true })
  }, [id, ref])

  /** 닫기: 연 작품이 화면에 보이면 그 자리로 돌아가며 닫힌다 (sheetMorph). 아니면 그냥 닫는다 */
  const close = () => {
    const d = ref.current
    if (!d) return
    if (!id || !morphClose(d, id, () => d.close())) d.close()
  }
  /** 바깥(어두운 바탕)을 누르면 닫는다 */
  const onBackdrop = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target !== e.currentTarget) return
    const r = e.currentTarget.getBoundingClientRect()
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
    if (!inside) close()
  }

  const p = project
  const gallery = p ? projectGallery(p) : []
  const [lead, ...more] = gallery
  const segs = p ? languageSegments(p.languages, { max: 4, minShare: 1 }) : []
  const span = p ? monthSpan(p.firstCommit, p.lastCommit) : null
  const links = p ? outLinks(p) : []

  return (
    <dialog
      ref={ref}
      className={c.sheet}
      aria-labelledby="project-sheet-title"
      data-project-sheet
      onCancel={(e) => {
        // Esc 도 닫기 버튼과 같은 길로 (제자리로 돌아가며 닫힘)
        e.preventDefault()
        close()
      }}
      onClose={() => {
        restoreFocus()
        onClosed()
      }}
      onClick={onBackdrop}
    >
      {p && (
        <div ref={scrollRef} className={c.scroll}>
          <div className={c.bar}>
            <p className={c.barPlace}>
              <Mark color={PROJECT_COLOR} />
              <span className={c.barRoom}>{roomTitle ?? '프로젝트'}</span>
              {position && (
                <span className={`${c.barPos} num`}>
                  {position[0]} / {position[1]}
                </span>
              )}
            </p>
            <button type="button" className={`btn-secondary btn-sm ${c.close}`} onClick={close}>
              닫기
            </button>
          </div>

          <div className={c.inner}>
            <header className={c.head}>
              <h2 id="project-sheet-title" ref={headingRef} tabIndex={-1} className={c.title}>
                {p.name}
              </h2>
              {p.summary && <p className={c.lead}>{p.summary}</p>}
            </header>

            <div className={`${c.body} ${lead ? '' : c.bodyBare}`}>
              <div className={c.leadShot}>
                {lead && <Shot img={lead} project={p} first />}
              </div>

              <aside className={c.facts} aria-label={`${p.name} 정보`}>
                <LiveLink project={p} tone="primary" className={c.live} />
                <dl className={c.dl}>
                  {p.generation && (
                    <div>
                      <dt>기수</dt>
                      <dd>{p.generation}기</dd>
                    </div>
                  )}
                  <div>
                    <dt>프로그램</dt>
                    <dd>{p.program}</dd>
                  </div>
                  <div>
                    <dt>연도</dt>
                    <dd className="num">{p.year}</dd>
                  </div>
                  {p.stack && p.stack.length > 0 && (
                    <div>
                      <dt>재료</dt>
                      <dd>
                        <Dotted parts={p.stack} />
                      </dd>
                    </div>
                  )}
                  {span && (
                    <div>
                      <dt>커밋 기간</dt>
                      <dd className="num">{span}</dd>
                    </div>
                  )}
                  {/* 팀원: projects.json members 에 적힌 이름만 (저장소 기여자 · 커밋 수 대신, 4기 시안 2026-11) */}
                  {p.members && p.members.length > 0 && (
                    <div>
                      <dt>팀원</dt>
                      <dd>
                        <Dotted parts={p.members} />
                      </dd>
                    </div>
                  )}
                  {segs.length > 0 && (
                    <div className={c.langRow}>
                      <dt>언어</dt>
                      <dd>
                        <LanguageBar segments={segs} />
                      </dd>
                    </div>
                  )}
                </dl>
                {p.repo && p.statsAsOf && (span || segs.length > 0) && (
                  <p className={c.basis}>
                    {/* 저장소 이름만 (조직 이름 'GDSC-DGU' 는 지금 쓰지 않는 이름이라 보이지 않는다) */}
                    커밋 기간 · 언어는 대표 저장소 {repoPath(p.repo).split('/').pop()} 기준 · GitHub <span className="num">{dotted(p.statsAsOf)}</span>
                  </p>
                )}
                {links.length > 0 && (
                  <ul className={c.out} aria-label={`${p.name} 바깥 링크`}>
                    {links.map((l) => (
                      <li key={l.href}>
                        <a className={c.outLink} href={l.href} target="_blank" rel="noreferrer">
                          {l.label}
                          <span className={c.outArrow} aria-hidden="true">
                            ↗
                          </span>
                          <span className="visually-hidden">
                            {' '}
                            ({p.name}, 새 창)
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>

              {more.length > 0 && (
                <div className={c.more}>
                  {more.map((img) => (
                    <Shot key={img.src} img={img} project={p} first={false} />
                  ))}
                </div>
              )}
            </div>


            {(prev || next) && (
              <nav className={c.walk} aria-label="다른 프로젝트">
                {prev ? (
                  <Link className={c.walkLink} to={{ search: sheetSearch(prev.id) }} state={walkState} replace preventScrollReset>
                    <span className={c.walkDir}>
                      <span aria-hidden="true">← </span>이전
                    </span>
                    <span className={c.walkName}>{prev.name}</span>
                  </Link>
                ) : (
                  <span />
                )}
                {next && (
                  <Link className={`${c.walkLink} ${c.walkNext}`} to={{ search: sheetSearch(next.id) }} state={walkState} replace preventScrollReset>
                    <span className={c.walkDir}>
                      다음<span aria-hidden="true"> →</span>
                    </span>
                    <span className={c.walkName}>{next.name}</span>
                  </Link>
                )}
              </nav>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}
