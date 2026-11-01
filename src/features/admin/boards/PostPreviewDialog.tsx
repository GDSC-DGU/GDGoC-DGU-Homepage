import { useRef, useState } from 'react'
import { actorLabel } from '../data/common/accounts'
import { fileSizeLabel } from '../data/common/fileRules'
import { BOARD_LABEL, PERIOD_CATEGORIES, type CommunityCategory, type PostRow } from '../data/boards/types'
import { Button, Dialog, StatusBadge, formatDateTime, formatNumber, formatPeriod } from '../ui'
import { IconFile } from '../ui/icons'
import s from './boards.module.css'

/**
 * 게시글 내용 보기 (게시판 관리 안 팝업). 지울지 판단할 수 있게 목록에 없는 내용 · 기간 · 첨부 · 내부 기록을 보여 준다.
 * 명세에 따로 화면 ID 가 없는 보조 팝업: 목록 한 줄(PostRow)을 그대로 보여 주므로 따로 불러오지 않는다.
 * [삭제]는 목록의 [삭제]와 같은 흐름 (확인 → 삭제 상태 → 토스트), 지우면 팝업을 닫는다.
 */
export function PostPreviewDialog({ post, onClose, onDelete, deleting }: { post: PostRow | null; onClose: () => void; onDelete: (post: PostRow) => void; deleting: boolean }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  // 닫히는 동안에도 마지막 글을 그대로 두어 팝업이 빈 채로 접히지 않게 (렌더 중에 맞추기)
  const [last, setLast] = useState<PostRow | null>(post)
  if (post && post !== last) setLast(post)
  const p = post ?? last
  const withPeriod = p && (p.board === 'teams' || PERIOD_CATEGORIES.includes(p.category as CommunityCategory)) && p.startDate

  return (
    <Dialog
      open={!!post}
      onClose={onClose}
      size="lg"
      title={p?.title ?? ''}
      description={p ? `${BOARD_LABEL[p.board]} · ${p.category} · ${p.no}번` : undefined}
      initialFocus={closeRef}
      footer={
        <>
          <Button ref={closeRef} variant="secondary" onClick={onClose}>
            닫기
          </Button>
          {p && (
            <Button variant="secondary" busy={deleting} onClick={() => onDelete(p)}>
              이 게시글 삭제
            </Button>
          )}
        </>
      }
    >
      {p && (
        <>
          <dl className={s.facts}>
            <dt>작성자</dt>
            <dd>
              {p.authorName}
              {p.byAdmin && <StatusBadge tone="neutral">관리자 게시글</StatusBadge>}
            </dd>
            <dt>작성일</dt>
            <dd className="num">{formatDateTime(p.createdAt)}</dd>
            {p.board === 'teams' && p.recruitStatus && (
              <>
                <dt>모집 상태</dt>
                <dd>
                  <StatusBadge tone={p.recruitStatus === '모집중' ? 'success' : 'muted'}>{p.recruitStatus}</StatusBadge>
                </dd>
              </>
            )}
            {withPeriod && (
              <>
                <dt>기간</dt>
                <dd className="num">{formatPeriod(p.startDate!, p.endDate)}</dd>
              </>
            )}
            <dt>조회 · 댓글</dt>
            <dd>
              조회 <span className="num">{formatNumber(p.views)}</span> · 댓글 <span className="num">{formatNumber(p.commentCount)}</span>
            </dd>
            {p.posted && (
              <>
                <dt>게시한 계정</dt>
                <dd>
                  {actorLabel(p.posted.by)} · <span className="num">{formatDateTime(p.posted.at)}</span>
                </dd>
              </>
            )}
          </dl>
          {/* 내용 상자는 초점을 받는다: 좁은 화면에서 팝업 본문이 스크롤될 때 키보드로도 넘겨 읽게 */}
          <section className={s.body} tabIndex={0} aria-label="게시글 내용">
            {p.content}
          </section>
          {p.attachments.length > 0 && (
            <>
              <h3 className={s.subhead}>첨부파일 {p.attachments.length}개</h3>
              <ul className={s.files}>
                {p.attachments.map((f) => (
                  <li key={f.fileId} className={s.file}>
                    <IconFile />
                    <span className={s.fileName}>{f.name}</span>
                    <span className={s.fileSize}>{fileSizeLabel(f.size)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {p.posted && <p className={s.note}>홈페이지에는 작성자가 '운영진'으로만 보이고, 게시한 계정은 내부 기록으로 남습니다.</p>}
        </>
      )}
    </Dialog>
  )
}
