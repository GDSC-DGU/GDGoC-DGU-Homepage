import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminMe } from '../auth/authContext'
import { ATTACHMENT_MAX, COMMUNITY_CATEGORIES, type CommunityCategory } from '../data/boards/types'
import { errorMessage, isAdminRepoError } from '../data/common/errors'
import { FILE_RULES, fileSizeLabel } from '../data/common/fileRules'
import { useAdminRepos } from '../data/useAdminData'
import { adminPath, screenById } from '../screens'
import { Button, DateTimeField, FileDrop, PageHeader, RadioGroup, TextArea, TextField, focusFirstInvalid, hasErrors, useConfirm, useToast } from '../ui'
import { IconErrorMark, IconFile } from '../ui/icons'
import { useAction } from './useAction'
import { useLeaveGuard } from './useLeaveGuard'
import { categoryHelp, emptyDraft, isDirty, needsPeriod, toCommunityInput, validateDraft, type CommunityDraft } from './writeForm'
import s from './boards.module.css'

/**
 * P-ABD-03 Community 게시글 작성 (관리자, F-ABD-010 · 013).
 * - 공지 / 세션 / 행사 / 정보 공유 / 기타 모든 분류, 회원 인증 없이 '운영진' 이름으로 게시
 * - 세션 · 행사는 기간 필수 (홈 캘린더 · 대시보드 행사 일정), 공지는 목록 위 고정
 * - 첨부: PDF · JPG · PNG, 파일당 10MB, 최대 3개, 이미지도 파일 이름으로만 (업로드는 흉내: 이 브라우저 안에서만)
 * - [취소]는 쓴 내용이 있으면 '작성 중인 내용이 사라집니다.' 확인 후 목록으로
 * - 게시하면 Community 게시판 관리로 돌아가 새 글을 강조한다
 * 관리자 게시글 수정은 명세 '확정 필요'(F-ABD-010 5)라 만들지 않았다.
 */
export function CommunityWritePage() {
  const repos = useAdminRepos()
  const me = useAdminMe()
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const screen = screenById('P-ABD-03')
  const formRef = useRef<HTMLFormElement>(null)
  const removeRefs = useRef<(HTMLButtonElement | null)[]>([])
  const attachHeadRef = useRef<HTMLParagraphElement>(null)

  const [draft, setDraft] = useState<CommunityDraft>(emptyDraft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const dirty = isDirty(draft)
  useLeaveGuard(dirty)

  const update = <K extends keyof CommunityDraft>(key: K, value: CommunityDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    // 고친 칸의 오류는 지운다 (기간은 두 칸이 서로 걸려 있어 함께)
    setErrors((e) => {
      if (!(key in e) && !(key === 'startDate' && e.endDate)) return e
      const next = { ...e }
      delete next[key]
      if (key === 'startDate') delete next.endDate
      return next
    })
  }

  const create = useAction(() => repos.boards.createCommunityPost(toCommunityInput(draft)))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const found = validateDraft(draft)
    setErrors(found)
    if (hasErrors(found)) {
      requestAnimationFrame(() => focusFirstInvalid(formRef.current))
      return
    }
    try {
      const row = await create.run()
      toast.success(`게시글을 게시했습니다. Community 목록에 '운영진' 이름으로 보입니다.`)
      navigate(`${adminPath.community}?post=${encodeURIComponent(row.id)}`)
    } catch (err) {
      if (isAdminRepoError(err) && err.fields) {
        setErrors(err.fields)
        requestAnimationFrame(() => focusFirstInvalid(formRef.current))
      } else setFormError(errorMessage(err))
    }
  }

  const cancel = async () => {
    if (dirty && !(await confirm({ title: '작성을 그만둘까요?', body: '작성 중인 내용이 사라집니다.', confirmLabel: '나가기', tone: 'danger' }))) return
    navigate(adminPath.community)
  }

  const upload = async (file: File) => {
    setUploadError(null)
    setUploading(file.name)
    try {
      const ref = await repos.uploads.upload(file, 'postAttachment')
      setDraft((d) => ({ ...d, attachments: [...d.attachments, ref].slice(0, ATTACHMENT_MAX) }))
      setErrors((x) => {
        const next = { ...x }
        delete next.attachments
        return next
      })
    } catch (err) {
      setUploadError(errorMessage(err))
    } finally {
      setUploading(null)
    }
  }

  const removeAttachment = (index: number) => {
    const next = draft.attachments.filter((_, i) => i !== index)
    setDraft((d) => ({ ...d, attachments: next }))
    // 다음(없으면 앞) 첨부의 [삭제]로, 하나도 없으면 첨부 제목으로 초점
    requestAnimationFrame(() => {
      const target = removeRefs.current[Math.min(index, next.length - 1)]
      if (next.length && target) target.focus()
      else attachHeadRef.current?.focus()
    })
  }

  const full = draft.attachments.length >= ATTACHMENT_MAX

  return (
    <>
      <PageHeader back={{ to: adminPath.community, label: 'Community 게시판 관리' }} title={screen.title} description="공지 · 세션 · 행사를 포함한 모든 분류로, 회원 인증 없이 '운영진' 이름으로 게시합니다." />
      <form ref={formRef} className={s.form} noValidate onSubmit={submit} aria-label="Community 게시글 작성">
        {formError && (
          <p className={s.formError} role="alert">
            <IconErrorMark />
            {formError}
          </p>
        )}
        <div className={s.formCard}>
          <RadioGroup<CommunityCategory>
            legend="분류"
            name="category"
            required
            options={COMMUNITY_CATEGORIES.map((c) => ({ value: c, label: c }))}
            value={draft.category}
            onChange={(v) => update('category', v)}
            help={categoryHelp(draft.category)}
            error={errors.category}
          />
          <TextField label="제목" required value={draft.title} onChange={(e) => update('title', e.target.value)} error={errors.title} autoComplete="off" />
          {needsPeriod(draft.category) && (
            <fieldset className={s.period}>
              <legend>기간</legend>
              <div className={s.periodRow}>
                <DateTimeField label="시작일" required value={draft.startDate} onChange={(e) => update('startDate', e.target.value)} error={errors.startDate} />
                <DateTimeField label="종료일" required value={draft.endDate} min={draft.startDate || undefined} onChange={(e) => update('endDate', e.target.value)} error={errors.endDate} help="하루 행사면 시작일과 같은 날" />
              </div>
            </fieldset>
          )}
          <TextArea label="내용" required rows={10} value={draft.content} onChange={(e) => update('content', e.target.value)} error={errors.content} help="일반 텍스트로 보입니다 (글자 서식 · 본문 이미지 없음)." />

          <div className={`${s.attachList} ${s.drop}`}>
            {full ? (
              <>
                <p ref={attachHeadRef} tabIndex={-1} className={s.attachHead}>
                  첨부파일 <span className="num">{draft.attachments.length}</span>/{ATTACHMENT_MAX}
                </p>
                <p className={s.attachLimit}>첨부파일은 게시글당 최대 {ATTACHMENT_MAX}개까지 올릴 수 있습니다. 다른 파일을 올리려면 목록에서 하나를 삭제해 주세요.</p>
              </>
            ) : (
              <>
                <p ref={attachHeadRef} tabIndex={-1} className="visually-hidden">
                  첨부파일 {draft.attachments.length}개
                </p>
                <FileDrop
                  label={`첨부파일 (${draft.attachments.length}/${ATTACHMENT_MAX})`}
                  rule={FILE_RULES.postAttachment}
                  value={null}
                  preview="file"
                  busy={!!uploading}
                  onSelect={(f) => void upload(f)}
                  error={uploadError ?? errors.attachments}
                  help="PDF · JPG · PNG, 파일당 10MB 이하, 최대 3개. 이미지도 파일 이름으로만 보입니다. 예시 화면이라 파일은 이 브라우저 안에만 있습니다."
                />
              </>
            )}
            {(draft.attachments.length > 0 || uploading) && (
              <ul className={s.attachList} aria-label="올린 첨부파일">
                {draft.attachments.map((f, i) => (
                  <li key={f.fileId} className={s.attach}>
                    <IconFile />
                    <span className={s.fileName}>{f.name}</span>
                    <span className={s.fileSize}>{fileSizeLabel(f.size)}</span>
                    <Button
                      ref={(el) => {
                        removeRefs.current[i] = el
                      }}
                      variant="secondary"
                      size="xs"
                      aria-label={`${f.name} 첨부 삭제`}
                      onClick={() => removeAttachment(i)}
                    >
                      삭제
                    </Button>
                  </li>
                ))}
                {uploading && (
                  <li className={s.attach} role="status">
                    <IconFile />
                    <span className={s.fileName}>{uploading}</span>
                    <span className={s.fileSize}>올리는 중…</span>
                  </li>
                )}
              </ul>
            )}
          </div>

          <p className={s.authorRow}>
            <span>
              작성자 <strong>운영진</strong>
            </span>
            <span>
              게시한 계정({me.name} · {me.role})은 내부 기록으로만 남습니다.
            </span>
          </p>
        </div>
        <div className={s.formActions}>
          <Button variant="secondary" onClick={() => void cancel()} disabled={create.pending}>
            취소
          </Button>
          <Button type="submit" busy={create.pending} disabled={!!uploading}>
            게시
          </Button>
        </div>
      </form>
    </>
  )
}
