import { useRef, useState } from 'react'
import type { ContentsState, Review } from '../data/contents/types'
import { errorMessage } from '../data/common/errors'
import { useAdminRepos } from '../data/useAdminData'
import { AdminImage, Button, DataTable, EmptyState, Panel, StatusBadge, deleteConfirm, useConfirm, useToast, type Column } from '../ui'
import { useCompactTable } from '../boards/listHooks'
import { ReviewDialog } from './ReviewDialog'
import { publicSummary } from './reviewForm'
import { ChangeLine, DefaultAvatar, IconPlus } from './shared'
import s from './contents.module.css'

/**
 * 지난 기수 리뷰 (F-ACT-005, 팝업 P-ACT-02 F-ACT-007~009): 비공개 포함 전부.
 * 행 [수정] → 기존 값이 채워진 팝업, 행 [삭제] → 확인 후 삭제 (사진도 함께), [리뷰 추가] → 빈 팝업.
 */
export function ReviewsPanel({ data }: { data: ContentsState }) {
  const repos = useAdminRepos()
  const toast = useToast()
  const confirm = useConfirm()
  // 팝업은 열린 동안만 그린다 (열 때마다 새 입력 칸)
  const [dialog, setDialog] = useState<{ review: Review | null } | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const tableTop = useRef<HTMLDivElement>(null)
  const compact = useCompactTable()

  const remove = async (r: Review) => {
    if (!(await confirm(deleteConfirm('리뷰', 1, `${r.name}의 리뷰가 홈에서 사라지고, 리뷰 사진도 함께 삭제됩니다.`)))) return
    setDeleting(r.id)
    try {
      await repos.contents.deleteReview(r.id)
      toast.success(`${r.name}의 리뷰를 삭제했습니다.`)
      tableTop.current?.focus()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setDeleting(null)
    }
  }

  const columns: Column<Review>[] = [
    {
      key: 'photo',
      header: '사진',
      width: compact ? '64px' : '72px',
      cell: (r) => (
        <span className={s.avatar}>
          {r.photoUrl ? <AdminImage src={r.photoUrl} alt="" /> : <DefaultAvatar />}
          <span className="visually-hidden">{r.photoUrl ? '사진 있음' : '사진 없음 (기본 이미지)'}</span>
        </span>
      ),
    },
    ...(compact
      ? [
          // 좁을 때: 이름 아래 기수 · 트랙/파트
          {
            key: 'name',
            header: '이름 · 기수 · 트랙',
            rowHeader: true,
            width: '152px',
            cell: (r: Review) => (
              <span className={s.stack}>
                <span className={s.nowrap}>{r.name}</span>
                <span className={s.sub}>
                  {r.generation}기 · {r.track}
                </span>
              </span>
            ),
          },
        ]
      : [
          { key: 'generation', header: '기수', width: '72px', nowrap: true, cell: (r: Review) => `${r.generation}기` },
          { key: 'name', header: '이름', rowHeader: true, width: '128px', cell: (r: Review) => <span className={s.nowrap}>{r.name}</span> },
          { key: 'track', header: '트랙 / 파트', width: '120px', cell: (r: Review) => r.track },
        ]),
    { key: 'content', header: '후기', cell: (r) => <span className={s.reviewText}>{r.content}</span> },
    { key: 'public', header: '공개 여부', width: compact ? '96px' : '104px', cell: (r) => (r.isPublic ? <StatusBadge tone="success">공개</StatusBadge> : <StatusBadge tone="muted">비공개</StatusBadge>) },
    {
      key: 'actions',
      header: '관리',
      hideHeader: true,
      width: compact ? '84px' : '148px',
      align: 'end',
      cell: (r) => (
        <span className={`${s.rowActions} ${compact ? s.rowActionsStack : ''}`}>
          <Button variant="secondary" size="xs" aria-haspopup="dialog" aria-label={`${r.name}의 리뷰 수정`} onClick={() => setDialog({ review: r })}>
            수정
          </Button>
          <Button variant="secondary" size="xs" busy={deleting === r.id} aria-label={`${r.name}의 리뷰 삭제`} onClick={() => void remove(r)}>
            삭제
          </Button>
        </span>
      ),
    },
  ]

  return (
    <Panel
      flush
      title="지난 기수 리뷰"
      description={<ChangeLine stamp={data.changes.reviews} prefix={<>{`${publicSummary(data.reviews)} · `}</>} />}
      actions={
        <Button variant="secondary" aria-haspopup="dialog" onClick={() => setDialog({ review: null })}>
          <IconPlus />
          리뷰 추가
        </Button>
      }
    >
      <p className={`${s.note} ${s.flushNote}`}>공개로 둔 리뷰만 홈에 보입니다. 후기 주인공의 동의를 받은 후기만 등록합니다.</p>
      <div ref={tableTop} tabIndex={-1} role="group" aria-label="지난 기수 리뷰 목록" className={s.focusBox}>
        <DataTable
          caption={`지난 기수 리뷰 ${data.reviews.length}개`}
          columns={columns}
          rows={data.reviews}
          rowKey={(r) => r.id}
          rowTone={(r) => (r.isPublic ? undefined : 'muted')}
          empty={<EmptyState title="등록한 리뷰가 없습니다." description="리뷰가 없으면 홈의 리뷰 영역이 숨겨집니다. [리뷰 추가]로 첫 리뷰를 올려 주세요." />}
          minWidth={compact ? 640 : 820}
          bare
        />
      </div>
      {dialog && (
        <ReviewDialog
          review={dialog.review}
          onClose={() => setDialog(null)}
          onSaved={(message) => {
            setDialog(null)
            toast.success(message)
          }}
        />
      )}
    </Panel>
  )
}
