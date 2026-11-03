import { useQuery } from '@tanstack/react-query'
import { errorMessage } from '../data/common/errors'
import { adminKeys } from '../data/queryKeys'
import { useAdminRepos } from '../data/useAdminData'
import { ADMIN_SAMPLE } from '../sample'
import { screenById } from '../screens'
import { Button, PageHeader, Panel } from '../ui'
import { IconErrorMark } from '../ui/icons'
import { IntroImagesPanel } from './IntroImagesPanel'
import { PosterPanel } from './PosterPanel'
import { ReviewsPanel } from './ReviewsPanel'
import s from './contents.module.css'

function LoadingPanel({ title }: { title: string }) {
  return (
    <Panel title={title}>
      <div className={s.skeleton} aria-hidden="true">
        <span style={{ width: '72%' }} />
        <span style={{ width: '54%' }} />
        <span style={{ width: '63%' }} />
      </div>
    </Panel>
  )
}

/**
 * P-ACT-01 홈페이지 콘텐츠 관리 (F-ACT-001~006, 팝업 P-ACT-02).
 * 한 번에 불러와(API-ACT-001) 영역으로 나눈다: 홈 소개 이미지 · 지난 기수 리뷰 · 모집 포스터.
 * 공개 사이트에는 아직 홈 소개 이미지 · 모집 포스터 자리가 없어서, 프로토타입 보기에서는 지난 기수 리뷰(홈 Interview)만 보인다.
 * 각 영역에 마지막 변경자 · 시각. Lead · Core 모두 쓸 수 있다.
 */
export function ContentsPage() {
  const repos = useAdminRepos()
  const screen = screenById('P-ACT-01')
  const contents = useQuery({ queryKey: adminKeys.section('contents'), queryFn: () => repos.contents.get() })

  return (
    <>
      <PageHeader
        title={screen.title}
        description={
          ADMIN_SAMPLE
            ? '홈 소개 이미지 · 지난 기수 리뷰 · 모집 포스터를 관리합니다. 바꾼 내용은 저장하는 즉시 홈페이지에 반영됩니다 (예시 화면에서는 공개 사이트에 반영되지 않습니다).'
            : '홈 Interview에 보이는 지난 기수 리뷰를 관리합니다. 바꾼 내용은 저장하는 즉시 홈페이지에 반영됩니다.'
        }
      />
      <div className={s.stack}>
        {contents.isPending ? (
          <>
            <p className="visually-hidden" role="status">
              홈페이지 콘텐츠를 불러오는 중입니다
            </p>
            {ADMIN_SAMPLE && <LoadingPanel title="홈 소개 이미지" />}
            <LoadingPanel title="지난 기수 리뷰" />
            {ADMIN_SAMPLE && <LoadingPanel title="모집 포스터" />}
          </>
        ) : contents.isError || !contents.data ? (
          <div className={s.loadError} role="alert">
            <IconErrorMark />
            {errorMessage(contents.error)}
            <Button variant="secondary" size="xs" onClick={() => void contents.refetch()}>
              다시 불러오기
            </Button>
          </div>
        ) : (
          <>
            {ADMIN_SAMPLE && <IntroImagesPanel data={contents.data} />}
            <ReviewsPanel data={contents.data} />
            {ADMIN_SAMPLE && <PosterPanel data={contents.data} />}
          </>
        )}
      </div>
    </>
  )
}
