import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useToday } from '@/hooks/useToday'
import { TeamsError, errorText } from './data/repository'
import { COMMENT_MAX, EMPTY_CRED, FILE_TYPES, authorLabel, contactAction, credReady, dotDate, periodLabel, sizeLabel, timeAgo } from './data/rules'
import { TEAMS_SAMPLE_DATA, heldCredentials, teamsKeys, useAddComment, useAdjacent, useRemovePost, useTeamComments, useTeamPost, useTeamsList, useTeamsRepo } from './data/teamsRepo'
import type { Credentials, PostBrief, TeamPost } from './data/types'
import { Avatar, CategoryTag, ConfirmDialog, CredentialFields, DeadlineTag, PartTags, SampleNotice, StatusTag, VerifyDialog } from './parts'
import type { FromList } from './TeamsListPage'
import s from './teams.module.css'
import { PLACE_BY_ID } from '@/config/places'
import { usePageTitle } from '@/hooks/usePageTitle'

/**
 * 팀원 모집 글 (/teams/:postId, P-TEM-003). 참고: 모집 글 상세(인프런 · 홀라)의 '요약 카드 + 연락하기'.
 * [본문 | 요약 카드] 두 칸 (폰은 한 칸: 머리 → 요약 카드 → 본문).
 * - 본문: 분류 · 상태 · 제목 · 작성자 · 시각 · 조회 → 내용 → 첨부 → 댓글 → [목록으로] · [수정] [삭제] → 이전 · 다음 글 → 같은 분류 모집 중인 글
 * - 요약 카드: 마감까지 · 모집 기간 · 구하는 파트 · 모집 인원 · 작성자 → [연락하기 ↗] · [링크 복사]
 * 들어올 때마다 조회수 +1. 수정 · 삭제 버튼은 모두에게 보이고, 본인 확인을 거친 작성자만 진행한다.
 */
export function TeamsPostPage() {
  const { postId = '' } = useParams()
  const post = useTeamPost(postId)
  usePageTitle(post.data?.title, PLACE_BY_ID.teams.label)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as FromList | null)?.from ?? ''
  const listPath = `/teams${from}`
  const deleted = post.error instanceof TeamsError && (post.error.code === 'DELETED' || post.error.code === 'NOT_FOUND')

  useViewCount(postId, post.isSuccess)

  // 삭제된 글: 안내한 뒤 목록으로 (P-TEM-003 1)
  useEffect(() => {
    if (!deleted) return
    const t = window.setTimeout(() => navigate(listPath, { replace: true }), 2500)
    return () => window.clearTimeout(t)
  }, [deleted, navigate, listPath])

  return (
    <div className={`container ${s.page} ${s.detail}`}>
      <nav className={s.crumb} aria-label="위치">
        <Link to={listPath}>팀원 찾기</Link>
      </nav>
      {TEAMS_SAMPLE_DATA && <SampleNotice compact />}
      {post.isPending ? (
        <p className={s.state}>글을 불러오는 중입니다.</p>
      ) : deleted ? (
        <div className={s.state} role="status">
          <p>{errorText(post.error)}</p>
          <Link to={listPath} className="link-go">
            목록으로
          </Link>
        </div>
      ) : post.isError ? (
        <div className={s.state}>
          <p>글을 불러오지 못했습니다.</p>
          <button type="button" className="link" onClick={() => post.refetch()}>
            다시 불러오기
          </button>
        </div>
      ) : (
        <PostView key={post.data.id} post={post.data} listPath={listPath} from={from} />
      )}
    </div>
  )
}

/** 들어올 때 한 번 조회수 +1 (개발 화면의 두 번 실행에도 한 번) */
function useViewCount(postId: string, ready: boolean) {
  const repo = useTeamsRepo()
  const qc = useQueryClient()
  const counted = useRef<string | null>(null)
  useEffect(() => {
    if (!ready || counted.current === postId) return
    counted.current = postId
    repo
      .countView(postId)
      .then((views) => qc.setQueryData<TeamPost>(teamsKeys.post(postId), (p) => (p ? { ...p, views } : p)))
      .catch(() => {})
  }, [ready, postId, repo, qc])
}

function PostView({ post, listPath, from }: { post: TeamPost; listPath: string; from: string }) {
  const navigate = useNavigate()
  const repo = useTeamsRepo()
  const remove = useRemovePost()
  const today = useToday()
  const [now] = useState(() => Date.now())
  const [verify, setVerify] = useState<'수정' | '삭제' | null>(null)
  const [deleteCred, setDeleteCred] = useState<Credentials | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const onVerified = (cred: Credentials) => {
    const action = verify
    setVerify(null)
    if (action === '수정') {
      heldCredentials.set(post.id, cred)
      navigate(`/teams/${post.id}/edit`)
    } else setDeleteCred(cred)
  }

  // 삭제하면 게시판 쿼리를 다시 불러 이 글은 '삭제됨'이 된다: 그 전에 목록으로 옮겨 가도록 결과를 직접 기다린다
  const confirmDelete = async () => {
    if (!deleteCred) return
    setDeleteError(null)
    try {
      await remove.mutateAsync({ id: post.id, cred: deleteCred })
      navigate(listPath, { replace: true, state: { flash: '게시글을 삭제했습니다.' } satisfies FromList })
    } catch (e) {
      setDeleteError(errorText(e))
    }
  }

  return (
    <div className={s.detailGrid}>
      <article className={s.post} aria-labelledby="post-title">
        <header className={s.postHead}>
          <p className={s.postTags}>
            <CategoryTag category={post.category} />
            <StatusTag status={post.status} />
          </p>
          <h1 id="post-title" className={s.postTitle}>
            {post.title}
          </h1>
          <div className={s.postMeta}>
            <Avatar author={post.author} size={36} />
            <span className={s.postMetaText}>
              <span className={s.postAuthor}>{authorLabel(post.author)}</span>
              <span className={s.postSub}>
                <time dateTime={post.createdAt} title={dotDate(post.createdAt)}>
                  {timeAgo(post.createdAt, now)}
                </time>
                <span>
                  조회 <span className="num">{post.views}</span>
                </span>
                {post.editedAt && <span>수정됨</span>}
              </span>
            </span>
          </div>
        </header>

        {/* 폰: 요약 카드가 머리 바로 아래 */}
        <div className={s.cardInline}>
          <SummaryCard post={post} today={today} />
        </div>

        <div className={s.body}>{post.content}</div>

        {post.attachments.length > 0 && (
          <section className={s.files} aria-labelledby="files-title">
            <h2 id="files-title" className={s.subTitle}>
              첨부파일 <span className="num">{post.attachments.length}</span>
            </h2>
            <ul className={s.fileList}>
              {post.attachments.map((f) => (
                <li key={f.id} className={s.fileRow}>
                  <span className={s.fileType}>{FILE_TYPES[f.type] ?? '파일'}</span>
                  <a href={f.url} download={f.name} className={s.fileName}>
                    {f.name}
                  </a>
                  <span className={`${s.fileSize} num`}>{sizeLabel(f.size)}</span>
                  <a href={f.url} download={f.name} className={s.fileDown} aria-label={`${f.name} 내려받기`}>
                    내려받기
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Comments postId={post.id} count={post.commentCount} now={now} closed={post.status === '마감'} />

        <div className={s.postActions}>
          <Link to={listPath} className={`btn-secondary btn-sm ${s.lineBtn}`}>
            목록으로
          </Link>
          <span className={s.ownerActions}>
            <button type="button" className={`btn-secondary btn-sm ${s.lineBtn}`} onClick={() => setVerify('수정')}>
              수정
            </button>
            <button type="button" className={`btn-secondary btn-sm ${s.lineBtn}`} onClick={() => setVerify('삭제')}>
              삭제
            </button>
          </span>
        </div>

        <Neighbors id={post.id} from={from} />
        <Related post={post} from={from} today={today} />

        <VerifyDialog open={verify !== null} action={verify ?? '수정'} onClose={() => setVerify(null)} verify={(cred) => repo.verifyAuthor(post.id, cred)} onVerified={onVerified} />
        <ConfirmDialog
          open={deleteCred !== null}
          title="게시글을 삭제할까요?"
          description="삭제하면 달린 댓글도 함께 보이지 않습니다."
          confirmLabel={remove.isPending ? '삭제하는 중' : '삭제'}
          busy={remove.isPending}
          error={deleteError}
          onConfirm={confirmDelete}
          onClose={() => {
            setDeleteCred(null)
            setDeleteError(null)
          }}
        />
      </article>

      <aside className={s.cardSide} aria-label="모집 요약">
        <SummaryCard post={post} today={today} />
      </aside>
    </div>
  )
}

/** 요약 카드: 마감까지 · 모집 정보 · 작성자 · 연락하기 · 링크 복사 */
function SummaryCard({ post, today }: { post: TeamPost; today: string }) {
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied('ok')
    } catch {
      setCopied('fail')
    }
    window.setTimeout(() => setCopied(null), 2400)
  }
  return (
    <div className={s.summary}>
      <p className={s.summaryHead}>
        <StatusTag status={post.status} />
        <DeadlineTag endDate={post.endDate} status={post.status} today={today} />
      </p>
      <dl className={s.summaryFacts}>
        <div>
          <dt>모집 기간</dt>
          <dd className="num">{periodLabel(post.startDate, post.endDate)}</dd>
        </div>
        <div>
          <dt>구하는 파트</dt>
          <dd>
            <PartTags parts={post.parts} />
          </dd>
        </div>
        <div>
          <dt>모집 인원</dt>
          <dd>{post.headcount ? <><span className="num">{post.headcount}</span>명</> : '정하지 않음'}</dd>
        </div>
        <div>
          <dt>작성자</dt>
          <dd>{authorLabel(post.author)}</dd>
        </div>
      </dl>
      <div className={s.summaryActions}>
        {post.contactUrl && post.status === '모집중' && (
          <a className={`btn-primary btn-sm ${s.contactBtn}`} href={post.contactUrl} target="_blank" rel="noopener noreferrer nofollow">
            {contactAction(post.contactUrl)}<span aria-hidden="true">↗</span>
            <span className="visually-hidden">(새 창)</span>
          </a>
        )}
        <button type="button" className={`btn-secondary btn-sm ${s.lineBtn}`} onClick={copy}>
          링크 복사
        </button>
        <p className={s.copyMsg} role="status">
          {copied === 'ok' ? '주소를 복사했습니다.' : copied === 'fail' ? '복사하지 못했습니다. 주소창의 주소를 복사해 주세요.' : ''}
        </p>
        {!post.contactUrl && post.status === '모집중' && <p className={s.muted}>참여하고 싶다면 아래 댓글로 남겨 주세요.</p>}
      </div>
    </div>
  )
}

/** 이전 글(더 오래된) · 다음 글(더 새로운) */
function Neighbors({ id, from }: { id: string; from: string }) {
  const adj = useAdjacent(id)
  if (!adj.data || (!adj.data.prev && !adj.data.next)) return null
  const item = (label: string, p: PostBrief | null) => (
    <li className={s.neighbor}>
      <span className={s.neighborLabel}>{label}</span>
      {p ? (
        <Link to={`/teams/${p.id}`} state={{ from } satisfies FromList} className={s.neighborLink}>
          {p.title}
        </Link>
      ) : (
        <span className={s.muted}>{label === '다음 글' ? '가장 최근 글입니다' : '첫 글입니다'}</span>
      )}
    </li>
  )
  return (
    <nav className={s.neighbors} aria-label="이전 · 다음 글">
      <ul>
        {item('다음 글', adj.data.next)}
        {item('이전 글', adj.data.prev)}
      </ul>
    </nav>
  )
}

/** 같은 분류에서 지금 모집 중인 다른 글 3개 */
function Related({ post, from, today }: { post: TeamPost; from: string; today: string }) {
  const list = useTeamsList({ category: post.category, status: '모집중', page: 1 })
  const items = (list.data?.items ?? []).filter((p) => p.id !== post.id).slice(0, 3)
  if (items.length === 0) return null
  return (
    <section className={s.related} aria-labelledby="related-title">
      <h2 id="related-title" className={s.subTitle}>
        모집 중인 다른 {post.category} 글
      </h2>
      <ul className={s.relatedList}>
        {items.map((p) => (
          <li key={p.id}>
            <Link to={`/teams/${p.id}`} state={{ from } satisfies FromList} className={s.relatedCard}>
              <span className={s.rowTags}>
                <DeadlineTag endDate={p.endDate} status={p.status} today={today} />
                <PartTags parts={p.parts} />
              </span>
              <span className={s.relatedTitle}>{p.title}</span>
              <span className={s.relatedMeta}>{authorLabel(p.author)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** 댓글 (작성 순서). 학번 + PIN 으로 등록하고, 작성자는 확인된 이름 · 기수로 자동 표시. 수정 · 삭제는 없다 (부적절한 댓글은 운영진이 지운다) */
function Comments({ postId, count, now, closed }: { postId: string; count: number; now: number; closed: boolean }) {
  const comments = useTeamComments(postId)
  const add = useAddComment()
  const [cred, setCred] = useState<Credentials>(EMPTY_CRED)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const ready = credReady(cred) && text.trim().length > 0

  const submit = () => {
    if (!ready) return
    setError(null)
    setDone(false)
    add.mutate(
      { postId, content: text, cred },
      {
        onSuccess: () => {
          setText('')
          setCred(EMPTY_CRED)
          setDone(true)
        },
        onError: (e) => {
          setError(errorText(e))
          setCred((c) => ({ ...c, pin: '' }))
        },
      },
    )
  }

  const list = comments.data ?? []
  return (
    <section className={s.commentsBox} aria-labelledby="comments-title">
      <h2 id="comments-title" className={s.subTitle}>
        댓글 <span className="num">{comments.data?.length ?? count}</span>
      </h2>
      {comments.isPending ? (
        <p className={s.muted}>댓글을 불러오는 중입니다.</p>
      ) : list.length === 0 ? (
        <p className={s.muted}>{closed ? '아직 댓글이 없습니다.' : '아직 댓글이 없습니다. 궁금한 점이나 참여 의사를 댓글로 남겨 주세요.'}</p>
      ) : (
        <ol className={s.commentList}>
          {list.map((c) => (
            <li key={c.id} className={s.comment}>
              <Avatar author={c.author} size={32} />
              <div className={s.commentBody}>
                <p className={s.commentHead}>
                  <span className={s.commentName}>{authorLabel(c.author)}</span>
                  <time dateTime={c.createdAt} title={dotDate(c.createdAt)}>
                    {timeAgo(c.createdAt, now)}
                  </time>
                </p>
                <p className={s.commentText}>{c.content}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <form
        className={s.commentForm}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className={s.commentCred}>
          <CredentialFields idPrefix="comment" value={cred} onChange={setCred} invalid={Boolean(error)} />
          <p className={s.help}>댓글을 등록할 때마다 학번과 PIN을 함께 넣어 주세요. 댓글에는 이름과 기수가 표시됩니다.</p>
        </div>
        <label htmlFor="comment-text" className="visually-hidden">
          댓글 내용
        </label>
        <textarea id="comment-text" className={`${s.input} ${s.textarea} ${s.commentArea}`} placeholder="댓글 내용을 입력하세요" value={text} maxLength={COMMENT_MAX} onChange={(e) => setText(e.target.value)} />
        <div className={s.commentFoot}>
          <p className={s.formMsg} role={error ? 'alert' : 'status'}>
            {error ? <span className={s.errorText}>{error}</span> : done ? '댓글을 등록했습니다.' : ''}
          </p>
          <button type="submit" className={`btn-secondary btn-sm ${s.lineBtn}`} disabled={!ready || add.isPending}>
            {add.isPending ? '등록하는 중' : '댓글 등록'}
          </button>
        </div>
      </form>
    </section>
  )
}
