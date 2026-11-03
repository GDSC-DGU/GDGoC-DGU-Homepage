import { ADMIN_SAMPLE } from '../sample'
import { useId, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react'
import { acceptAttr, checkFile, fileSizeLabel, type FileRule } from '../data/common/fileRules'
import { Button } from './Button'
import { IconErrorMark, IconFile, IconUpload } from './icons'
import s from './controls.module.css'

/**
 * 그림 한 장. object URL 이 사라졌으면(새로고침) 빈 자리 대신 안내 글자를 보여 준다.
 * alt 는 뜻이 있을 때만 (꾸밈이면 '').
 */
export function AdminImage({ src, alt, className, style }: { src: string; alt: string; className?: string; style?: CSSProperties }) {
  const [broken, setBroken] = useState<string | null>(null)
  if (broken === src)
    return (
      <span className={s.imageMissing} role={alt ? 'img' : undefined} aria-label={alt ? `${alt} (그림을 불러오지 못함)` : undefined}>
        {ADMIN_SAMPLE ? '예시 화면이라 새로고침하면 올린 그림이 사라집니다' : '그림을 불러오지 못했습니다. 다시 올려 주세요.'}
      </span>
    )
  return <img src={src} alt={alt} className={className} style={style} loading="lazy" onError={() => setBroken(src)} />
}

export interface FileDropValue {
  url: string
  name: string
  type?: string
  size?: number
}

/**
 * 파일 고르기 + 끌어 놓기 + 미리보기 (썸네일 · 소개 이미지 · 포스터 · 리뷰 사진 · 첨부).
 * - 규칙(형식 · 용량 · 안내 문구)은 data/common/fileRules.ts 의 FILE_RULES 에서 고른다. 맞지 않으면 onSelect 를 부르지 않고 오류 문장
 * - 고른 파일은 onSelect(file) 로 넘긴다 → 화면이 repos.uploads.upload(file, 'projectThumbnail') 로 올리고 value 를 바꾼다
 * - 다시 고르면 교체 (F-APJ-005 3). 키보드: [파일 선택] 버튼 → 시스템 파일 창
 *
 *   <FileDrop label="썸네일" required rule={FILE_RULES.projectThumbnail} value={thumb} busy={uploading}
 *     onSelect={upload} onClear={() => setThumb(null)} help="16:9 권장, 다른 비율은 가운데를 기준으로 잘라 보입니다." />
 */
export function FileDrop({
  label,
  rule,
  value,
  onSelect,
  onClear,
  help,
  error,
  required,
  busy,
  shape = 'rect',
  ratio = '16 / 9',
  preview = 'image',
}: {
  label: ReactNode
  rule: FileRule
  value: FileDropValue | null
  onSelect: (file: File) => void
  onClear?: () => void
  help?: ReactNode
  /** 바깥(업로드 실패 등)에서 온 오류 */
  error?: string | null
  required?: boolean
  busy?: boolean
  /** 리뷰 사진은 원형 (F-ACT-009) */
  shape?: 'rect' | 'circle'
  ratio?: string
  /** image: 그림 미리보기 · file: 파일 이름만 (게시글 첨부는 이미지도 파일명만, F-TEM-011 6) */
  preview?: 'image' | 'file'
}) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const shown = localError ?? error ?? null
  const describedBy = [help && `${id}-help`, shown && `${id}-error`].filter(Boolean).join(' ') || undefined

  const pick = (file: File | undefined) => {
    if (!file) return
    const problem = checkFile(file, rule)
    setLocalError(problem)
    if (!problem) onSelect(file)
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    pick(e.dataTransfer.files[0])
  }

  return (
    <div className={s.field}>
      <span id={`${id}-label`} className={s.label}>
        {label}
        {required && <span className={s.req}>필수</span>}
      </span>
      <input
        ref={inputRef}
        id={`${id}-input`}
        type="file"
        accept={acceptAttr(rule)}
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {value ? (
        <div className={s.preview} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          {preview === 'image' ? (
            <span className={`${s.previewMedia} ${shape === 'circle' ? s.circle : ''}`} style={{ '--ratio': ratio } as CSSProperties}>
              <AdminImage src={value.url} alt="" />
            </span>
          ) : (
            <span className={s.previewFile}>
              <IconFile />
            </span>
          )}
          <span className={s.previewInfo}>
            <span className={s.fileName}>{value.name}</span>
            {value.size !== undefined && <span className={`${s.fileMeta} num`}>{fileSizeLabel(value.size)}</span>}
            <span className={s.previewActions}>
              <Button variant="secondary" size="xs" busy={busy} aria-labelledby={`${id}-label ${id}-replace`} id={`${id}-replace`} aria-describedby={describedBy} onClick={() => inputRef.current?.click()}>
                다시 선택
              </Button>
              {onClear && (
                <Button variant="ghost" size="xs" aria-labelledby={`${id}-label ${id}-clear`} id={`${id}-clear`} onClick={onClear}>
                  빼기
                </Button>
              )}
            </span>
          </span>
        </div>
      ) : (
        <div
          className={s.drop}
          data-over={over}
          data-invalid={shown ? true : undefined}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <IconUpload className={s.dropIcon} />
          <span className={s.dropTitle}>여기에 끌어 놓거나</span>
          <Button variant="secondary" size="md" busy={busy} aria-labelledby={`${id}-label ${id}-pick`} id={`${id}-pick`} aria-describedby={describedBy} onClick={() => inputRef.current?.click()}>
            파일 선택
          </Button>
        </div>
      )}
      {help && (
        <p id={`${id}-help`} className={s.help}>
          {help}
        </p>
      )}
      {shown && (
        <p id={`${id}-error`} className={s.error}>
          <IconErrorMark />
          {shown}
        </p>
      )}
    </div>
  )
}
