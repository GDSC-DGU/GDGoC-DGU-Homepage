import { useQuery } from '@tanstack/react-query'
import { useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAction } from '../boards/useAction'
import { useLeaveGuard } from '../boards/useLeaveGuard'
import { actorLabel } from '../data/common/accounts'
import { errorMessage, isAdminRepoError } from '../data/common/errors'
import { FILE_RULES } from '../data/common/fileRules'
import type { AdminProject } from '../data/projects/types'
import { adminKeys } from '../data/queryKeys'
import { useAdminRepos } from '../data/useAdminData'
import { adminPath } from '../screens'
import { Button, ButtonLink, Checkbox, EmptyState, FileDrop, PageHeader, SelectField, TextField, focusFirstInvalid, formatDate, formatDateTime, hasErrors, useConfirm, useToast } from '../ui'
import { IconErrorMark } from '../ui/icons'
import type { ProjectListReturn } from './ProjectListPage'
import { GENERATION_OPTIONS, PROJECT_SUMMARY_MAX, draftChanged, draftFromProject, emptyProjectDraft, toProjectInput, validateProjectDraft, type ProjectDraft } from './projectForm'
import s from './projects.module.css'

/** 목록으로 돌아갈 주소 (목록에서 왔으면 그때의 검색어 · 쪽 그대로) */
function useListPath() {
  const state = useLocation().state as Partial<ProjectListReturn> | null
  return `${adminPath.projects}${state?.listSearch ?? ''}`
}

/**
 * P-APJ-02 프로젝트 등록 · 수정 (F-APJ-004~006).
 * 목록의 [프로젝트 등록]으로 오면 등록, [수정]으로 오면(?id=) 저장된 값을 채운 수정 모드.
 */
export function ProjectWritePage() {
  const [params] = useSearchParams()
  const id = params.get('id')
  return id ? <EditProject id={id} /> : <ProjectForm key="new" />
}

function EditProject({ id }: { id: string }) {
  const repos = useAdminRepos()
  const listPath = useListPath()
  const project = useQuery({ queryKey: adminKeys.section('projects', 'detail', id), queryFn: () => repos.projects.get(id), staleTime: Infinity })

  if (project.isPending)
    return (
      <>
        <PageHeader back={{ to: listPath, label: '프로젝트 관리' }} title="프로젝트 수정" />
        <p className={s.state} role="status">
          프로젝트를 불러오는 중입니다
        </p>
      </>
    )
  if (project.isError || !project.data)
    return (
      <>
        <PageHeader back={{ to: listPath, label: '프로젝트 관리' }} title="프로젝트 수정" />
        <EmptyState
          title={isAdminRepoError(project.error) && project.error.code === 'NOT_FOUND' ? '프로젝트를 찾을 수 없습니다.' : errorMessage(project.error)}
          description="이미 삭제되었거나 주소가 바뀌었을 수 있습니다. 목록에서 다시 골라 주세요."
          action={
            <ButtonLink variant="secondary" to={listPath}>
              프로젝트 목록으로
            </ButtonLink>
          }
        />
      </>
    )
  // 저장된 값으로 한 번만 채운다 (뒤에서 다시 불러와도 쓰던 칸을 덮지 않게: staleTime Infinity + key)
  return <ProjectForm key={id} project={project.data} />
}

function ProjectForm({ project }: { project?: AdminProject }) {
  const repos = useAdminRepos()
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const listPath = useListPath()
  const formRef = useRef<HTMLFormElement>(null)
  const editing = !!project

  const [initial] = useState<ProjectDraft>(() => (project ? draftFromProject(project) : emptyProjectDraft()))
  const [draft, setDraft] = useState<ProjectDraft>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const dirty = draftChanged(draft, initial)
  useLeaveGuard(dirty)

  const update = <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    const field = key === 'thumbnail' ? 'thumbnail' : key
    setErrors((e) => {
      if (!(field in e)) return e
      const next = { ...e }
      delete next[field]
      return next
    })
  }

  const save = useAction((d: ProjectDraft) => (project ? repos.projects.update(project.id, toProjectInput(d)) : repos.projects.create(toProjectInput(d))))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const found = validateProjectDraft(draft)
    setErrors(found)
    if (hasErrors(found)) {
      requestAnimationFrame(() => focusFirstInvalid(formRef.current))
      return
    }
    try {
      const saved = await save.run(draft)
      toast.success(editing ? `‘${saved.title}’ 프로젝트를 저장했습니다.${saved.isPublic ? '' : ' 비공개라 Projects 페이지에는 보이지 않습니다.'}` : `‘${saved.title}’ 프로젝트를 등록했습니다.`)
      navigate(editing ? listPath : adminPath.projects)
    } catch (err) {
      if (isAdminRepoError(err) && err.fields) {
        setErrors(err.fields)
        requestAnimationFrame(() => focusFirstInvalid(formRef.current))
      } else setFormError(errorMessage(err))
    }
  }

  const cancel = async () => {
    if (dirty && !(await confirm({ title: editing ? '수정을 그만둘까요?' : '등록을 그만둘까요?', body: '저장하지 않은 내용이 사라집니다.', confirmLabel: '나가기', tone: 'danger' }))) return
    navigate(listPath)
  }

  const upload = async (file: File) => {
    setUploadError(null)
    setUploading(true)
    try {
      const ref = await repos.uploads.upload(file, 'projectThumbnail')
      update('thumbnail', { url: ref.url, name: ref.name, size: ref.size })
    } catch (err) {
      setUploadError(errorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  const longSummary = editing && initial.summary.length > PROJECT_SUMMARY_MAX
  // 등록한 계정 · 시각, 수정한 계정 · 시각 (F-APJ-004 4 · 006 3)
  const meta = project ? (
    <>
      {project.created.by.kind === 'system' ? (
        // 예전 기록을 옮겨 온 프로젝트: 시각은 원래 기록의 날짜(첫 커밋)뿐이라 날짜만, 없으면 '-'
        <span>
          기존 기록 이전 · <span className="num">{project.createdAtUnknown ? '-' : formatDate(project.created.at)}</span>
        </span>
      ) : (
        <span>
          등록 {actorLabel(project.created.by)} · <span className="num">{formatDateTime(project.created.at)}</span>
        </span>
      )}
      {project.updated && (
        <span className={s.metaPart}>
          마지막 수정 {actorLabel(project.updated.by)} · <span className="num">{formatDateTime(project.updated.at)}</span>
        </span>
      )}
    </>
  ) : undefined

  return (
    <>
      <PageHeader
        back={{ to: listPath, label: '프로젝트 관리' }}
        title={editing ? '프로젝트 수정' : '프로젝트 등록'}
        description={editing ? '내용을 고쳐 [저장]하면 바로 반영됩니다. 공개를 끄면 Projects 페이지에서 바로 숨깁니다.' : '공개로 등록하면 Projects 페이지에 표시됩니다.'}
        meta={meta}
      />
      <form ref={formRef} className={s.form} noValidate onSubmit={submit} aria-label={editing ? '프로젝트 수정' : '프로젝트 등록'}>
        {formError && (
          <p className={s.formError} role="alert">
            <IconErrorMark />
            {formError}
          </p>
        )}
        <section className={s.card} aria-labelledby="project-basic">
          <div className={s.cardHead}>
            <h2 id="project-basic" className={s.cardTitle}>
              기본 정보
            </h2>
            <p className={s.cardDesc}>썸네일 · 제목 · 간단한 설명 · 기수는 꼭 입력합니다.</p>
          </div>
          <div className={s.drop}>
            <FileDrop
              label="썸네일"
              required
              rule={FILE_RULES.projectThumbnail}
              value={draft.thumbnail}
              busy={uploading}
              onSelect={(f) => void upload(f)}
              onClear={() => update('thumbnail', null)}
              error={uploadError ?? errors.thumbnail}
              help="JPG · PNG, 5MB 이하. 16:9 권장, 다른 비율은 카드에서 가운데를 기준으로 잘라 보입니다. 다시 고르면 바뀝니다."
            />
          </div>
          <TextField label="제목" required value={draft.title} onChange={(e) => update('title', e.target.value)} error={errors.title} autoComplete="off" />
          <TextField
            label="간단한 설명"
            required
            limit={PROJECT_SUMMARY_MAX}
            value={draft.summary}
            onChange={(e) => update('summary', e.target.value)}
            error={errors.summary}
            help={longSummary ? `저장소에서 옮겨 온 설명이라 ${PROJECT_SUMMARY_MAX}자를 넘습니다. 저장하려면 줄여 주세요.` : `프로젝트 카드에 보입니다. ${PROJECT_SUMMARY_MAX}자 이내.`}
          />
          <SelectField className={s.genField} label="기수" required placeholder="기수 선택" options={GENERATION_OPTIONS} value={draft.generation} onChange={(e) => update('generation', e.target.value)} error={errors.generation} />
        </section>

        <section className={s.card} aria-labelledby="project-more">
          <div className={s.cardHead}>
            <h2 id="project-more" className={s.cardTitle}>
              팀원 · 링크 · 공개
            </h2>
            <p className={s.cardDesc}>팀원과 주소는 선택입니다. 주소는 https:// 로 시작해야 합니다.</p>
          </div>
          <TextField label="팀원" value={draft.members} onChange={(e) => update('members', e.target.value)} help="팀원 이름을 쉼표로 구분해 적습니다." autoComplete="off" />
          <div className={s.row2}>
            <TextField label="GitHub 저장소 URL" type="url" inputMode="url" placeholder="https://github.com/…" value={draft.githubUrl} onChange={(e) => update('githubUrl', e.target.value)} error={errors.githubUrl} autoComplete="off" />
            <TextField label="서비스 · 데모 URL" type="url" inputMode="url" placeholder="https://" value={draft.serviceUrl} onChange={(e) => update('serviceUrl', e.target.value)} error={errors.serviceUrl} autoComplete="off" />
          </div>
          <Checkbox label="Projects 페이지에 공개" description="끄면 Projects 페이지에서 바로 숨깁니다. 관리 목록에는 그대로 남습니다." checked={draft.isPublic} onChange={(e) => update('isPublic', e.target.checked)} />
        </section>

        <div className={s.formActions}>
          <Button variant="secondary" onClick={() => void cancel()} disabled={save.pending}>
            취소
          </Button>
          <Button type="submit" busy={save.pending} disabled={uploading}>
            {editing ? '저장' : '등록'}
          </Button>
        </div>
      </form>
    </>
  )
}
