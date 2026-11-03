import { useId, useRef, useState } from 'react'
import { REVIEW_CONTENT_MAX } from '../data/contents/mockRepository'
import type { Review, ReviewInput } from '../data/contents/types'
import { errorMessage, isAdminRepoError } from '../data/common/errors'
import { FILE_RULES } from '../data/common/fileRules'
import { useAdminRepos } from '../data/useAdminData'
import { useAction } from '../boards/useAction'
import { GENERATION_OPTIONS } from '../projects/projectForm'
import { AdminImage, Button, Checkbox, Dialog, SelectField, TextArea, TextField, focusFirstInvalid, hasErrors } from '../ui'
import { IconErrorMark } from '../ui/icons'
import { generationOf, validateReviewForm, type ReviewDraft } from './reviewForm'
import { DefaultAvatar } from './shared'
import { useFilePicker } from './useFilePicker'
import s from './contents.module.css'

/**
 * P-ACT-02 리뷰 추가 · 수정 팝업 (F-ACT-007~009).
 * - 사진(선택) · 기수 · 이름 · 트랙/파트 · 후기(200자) · 공개 여부(기본 공개)
 * - [사진 선택]: JPG · PNG 2MB 이하, 올리면 원형 미리보기. 없으면 기본 이미지
 * - 오류는 팝업 안 글로 (바깥 토스트는 팝업이 열린 동안 읽히지 않는다). 저장하면 닫고 결과 토스트
 * 열 때마다 새로 그린다 (부르는 쪽이 열린 동안만 그린다): 추가는 빈 칸, 수정은 기존 값.
 */
export function ReviewDialog({ review, onClose, onSaved }: { review: Review | null; onClose: () => void; onSaved: (message: string) => void }) {
  const repos = useAdminRepos()
  const editing = !!review
  const formId = useId()
  const bodyRef = useRef<HTMLDivElement>(null)

  const [draft, setDraft] = useState<ReviewDraft>(() => ({
    photo: review?.photoUrl ? { url: review.photoUrl, fileId: null } : null,
    generation: review?.generation ? String(review.generation) : '',
    name: review?.name ?? '',
    track: review?.track ?? '',
    content: review?.content ?? '',
    isPublic: review?.isPublic ?? true,
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const update = <K extends keyof ReviewDraft>(key: K, value: ReviewDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setErrors((e) => {
      if (!(key in e)) return e
      const next = { ...e }
      delete next[key]
      return next
    })
  }

  const upload = async (file: File) => {
    setPhotoError(null)
    setUploading(true)
    try {
      const ref = await repos.uploads.upload(file, 'reviewPhoto')
      update('photo', { url: ref.url, fileId: ref.fileId })
    } catch (e) {
      setPhotoError(errorMessage(e))
    } finally {
      setUploading(false)
    }
  }
  const picker = useFilePicker(FILE_RULES.reviewPhoto, (f) => void upload(f), setPhotoError)

  const toInput = (d: ReviewDraft): ReviewInput => ({
    photoFileId: d.photo?.fileId ?? null,
    photoUrl: d.photo && !d.photo.fileId ? d.photo.url : null,
    generation: generationOf(d.generation),
    name: d.name,
    track: d.track,
    content: d.content,
    isPublic: d.isPublic,
  })
  const save = useAction((input: ReviewInput) => (review ? repos.contents.updateReview(review.id, input) : repos.contents.addReview(input)))

  const submit = async () => {
    setFormError(null)
    const found = validateReviewForm(draft)
    setErrors(found)
    if (hasErrors(found)) {
      requestAnimationFrame(() => focusFirstInvalid(bodyRef.current))
      return
    }
    try {
      const saved = await save.run(toInput(draft))
      onSaved(editing ? `${saved.name}의 리뷰를 저장했습니다.${saved.isPublic ? '' : ' 비공개라 홈에는 보이지 않습니다.'}` : `${saved.name}의 리뷰를 추가했습니다.${saved.isPublic ? ' 홈 리뷰 영역에 보입니다.' : ' 비공개로 저장해 홈에는 보이지 않습니다.'}`)
    } catch (e) {
      if (isAdminRepoError(e) && e.fields) {
        setErrors(e.fields)
        requestAnimationFrame(() => focusFirstInvalid(bodyRef.current))
      } else setFormError(errorMessage(e))
    }
  }

  const photoHelp = `${formId}-photo-help`
  const photoErr = `${formId}-photo-error`

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      title={editing ? '리뷰 수정' : '리뷰 추가'}
      description="후기 주인공의 동의를 받은 후기만 등록합니다."
      onSubmit={() => void submit()}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.pending}>
            취소
          </Button>
          <Button type="submit" busy={save.pending} disabled={uploading}>
            저장
          </Button>
        </>
      }
    >
      <div ref={bodyRef} className={s.dialogForm}>
        {formError && (
          <p className={s.fieldError} role="alert">
            <IconErrorMark />
            {formError}
          </p>
        )}
        <div className={s.photoField} role="group" aria-labelledby={`${formId}-photo-label`}>
          <span id={`${formId}-photo-label`} className={s.photoLabel}>
            사진 <span className={s.optional}>선택</span>
          </span>
          <div className={s.photoRow}>
            <span className={s.photoBig}>{draft.photo ? <AdminImage src={draft.photo.url} alt="" /> : <DefaultAvatar />}</span>
            <div className={s.photoSide}>
              <div className={s.photoButtons}>
                <Button variant="secondary" busy={uploading} aria-describedby={[photoHelp, photoError && photoErr].filter(Boolean).join(' ')} onClick={picker.open}>
                  {draft.photo ? '사진 다시 선택' : '사진 선택'}
                </Button>
                {draft.photo && (
                  <Button variant="ghost" onClick={() => update('photo', null)}>
                    사진 빼기
                  </Button>
                )}
              </div>
              <p id={photoHelp} className={s.fieldHelp}>
                {draft.photo ? '원형으로 보입니다. ' : '사진이 없으면 기본 이미지가 보입니다. '}JPG · PNG, 2MB 이하.
              </p>
              {photoError && (
                <p id={photoErr} className={s.fieldError} role="alert">
                  <IconErrorMark />
                  {photoError}
                </p>
              )}
            </div>
          </div>
          {picker.input}
        </div>
        <div className={s.row2}>
          <SelectField label="기수" placeholder="기수 없이" options={GENERATION_OPTIONS} value={draft.generation} onChange={(e) => update('generation', e.target.value)} error={errors.generation} help="비워 두면 홈 카드에 파트만 보입니다." />
          <TextField label="이름" required value={draft.name} onChange={(e) => update('name', e.target.value)} error={errors.name} placeholder="본인이 고른 표기 (실명 · 성만 · 이니셜)" autoComplete="off" />
        </div>
        <TextField label="트랙 / 파트" required value={draft.track} onChange={(e) => update('track', e.target.value)} error={errors.track} placeholder="예: Frontend · Backend · AI/ML · Product Design" autoComplete="off" />
        <TextArea label="후기" required rows={5} limit={REVIEW_CONTENT_MAX} value={draft.content} onChange={(e) => update('content', e.target.value)} error={errors.content} help={`${REVIEW_CONTENT_MAX}자 이내`} />
        <Checkbox label="홈에 공개" description="끄면 홈에서 바로 숨깁니다. 이 목록에는 그대로 남습니다." checked={draft.isPublic} onChange={(e) => update('isPublic', e.target.checked)} />
      </div>
    </Dialog>
  )
}
