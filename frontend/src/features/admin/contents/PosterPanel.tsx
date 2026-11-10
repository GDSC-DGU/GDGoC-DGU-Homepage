import { useState } from 'react'
import type { ContentsState } from '../data/contents/types'
import { errorMessage } from '../data/common/errors'
import { FILE_RULES } from '../data/common/fileRules'
import { useAdminRepos } from '../data/useAdminData'
import { AdminImage, Button, Panel, useToast } from '../ui'
import { IconErrorMark } from '../ui/icons'
import { ChangeLine } from './shared'
import { useFilePicker } from './useFilePicker'
import s from './contents.module.css'

/**
 * 모집 포스터 (F-ACT-006): Recruits 모집 안내(P-RCT-01)의 모집 일정 이미지.
 * [이미지 변경]으로 고르면 올리고(흉내) 바로 바뀐다. JPG · PNG 10MB 이하. 변경자 · 시각 표시.
 * 포스터가 없으면 Recruits 에는 지원 기간 안내만 보인다.
 */
export function PosterPanel({ data }: { data: ContentsState }) {
  const repos = useAdminRepos()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const change = async (file: File) => {
    setError(null)
    setUploading(true)
    try {
      const ref = await repos.uploads.upload(file, 'recruitPoster')
      await repos.contents.setPoster(ref.fileId)
      toast.success('모집 포스터를 바꿨습니다. Recruits 모집 안내에 새 포스터가 보입니다.')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setUploading(false)
    }
  }
  const picker = useFilePicker(FILE_RULES.recruitPoster, (f) => void change(f), setError)
  const poster = data.poster

  return (
    <Panel
      title="모집 포스터"
      description={<ChangeLine stamp={data.changes.poster} />}
      actions={
        <>
          <Button variant="secondary" busy={uploading} onClick={picker.open}>
            {poster ? '이미지 변경' : '이미지 등록'}
          </Button>
          {picker.input}
        </>
      }
    >
      {error && (
        <p className={s.alert} role="alert">
          <IconErrorMark />
          {error}
        </p>
      )}
      <div className={s.poster}>
        {poster ? (
          <figure className={s.posterMedia}>
            <AdminImage src={poster.url} alt={poster.alt} />
          </figure>
        ) : (
          <p className={s.posterEmpty}>포스터가 없습니다</p>
        )}
        <ul className={s.facts}>
          <li>Recruits 모집 안내 화면에 보이는 모집 일정 이미지입니다.</li>
          <li>JPG · PNG, 10MB 이하. 새 이미지를 고르면 바로 바뀝니다.</li>
          <li>{poster ? '포스터가 없으면 Recruits에는 지원 기간 안내만 보입니다.' : '지금은 포스터가 없어 Recruits에 지원 기간 안내만 보입니다.'}</li>
        </ul>
      </div>
    </Panel>
  )
}
