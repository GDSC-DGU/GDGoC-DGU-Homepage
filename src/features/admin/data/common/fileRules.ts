/**
 * 파일 형식 · 용량 규칙 (명세서 세부 정책의 숫자 · 안내 문구 그대로).
 * FileDrop 부품과 예시 업로드 저장소가 같은 규칙으로 확인한다.
 */
export interface FileRule {
  /** 허용 MIME 타입 */
  accept: readonly string[]
  maxBytes: number
  /** 형식 · 용량이 맞지 않을 때 안내 (명세 문구) */
  message: string
}

const MB = 1024 * 1024
const IMAGE = ['image/jpeg', 'image/png'] as const

export const FILE_RULES = {
  /** F-APJ-005 프로젝트 썸네일 */
  projectThumbnail: { accept: IMAGE, maxBytes: 5 * MB, message: '5MB 이하 이미지만 올릴 수 있어요.' },
  /** F-ACT-002 홈 소개 이미지 */
  introImage: { accept: IMAGE, maxBytes: 5 * MB, message: 'JPG · PNG 이미지만, 5MB 이하로 올릴 수 있어요.' },
  /** F-ACT-006 모집 포스터 */
  recruitPoster: { accept: IMAGE, maxBytes: 10 * MB, message: 'JPG · PNG 이미지만, 10MB 이하로 올릴 수 있어요.' },
  /** F-ACT-009 리뷰 사진 */
  reviewPhoto: { accept: IMAGE, maxBytes: 2 * MB, message: 'JPG · PNG 이미지만, 2MB 이하로 올릴 수 있어요.' },
  /** F-ABD-013 (= F-TEM-011) 게시글 첨부: 파일당 10MB, 게시글당 3개 */
  postAttachment: { accept: ['application/pdf', ...IMAGE], maxBytes: 10 * MB, message: 'PDF · JPG · PNG 파일만, 10MB 이하로 올릴 수 있어요.' },
} as const satisfies Record<string, FileRule>

export type FileRuleId = keyof typeof FILE_RULES

/** 맞으면 null, 틀리면 안내 문구 */
export function checkFile(file: { type: string; size: number }, rule: FileRule): string | null {
  if (!rule.accept.includes(file.type)) return rule.message
  if (file.size > rule.maxBytes) return rule.message
  return null
}

/** '2.4MB' · '320KB' (첨부 목록의 파일 크기) */
export function fileSizeLabel(bytes: number): string {
  if (bytes >= MB) return `${(bytes / MB).toFixed(1).replace(/\.0$/, '')}MB`
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}

/** input[accept] 값 */
export const acceptAttr = (rule: FileRule) => rule.accept.join(',')
