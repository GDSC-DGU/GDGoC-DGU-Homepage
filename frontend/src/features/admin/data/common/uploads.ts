import { AdminRepoError } from './errors'
import { checkFile, FILE_RULES, type FileRuleId } from './fileRules'
import { newId } from './list'
import { requireActor, respond, type MockContext } from './mockContext'
import type { FileRef } from './types'

/**
 * 파일 업로드 (API-COM-005: 파일을 올리고 fileId · url 을 받는다).
 * 예시 화면에서는 서버로 보내지 않는다: 브라우저 안 object URL 로 미리보기만 한다.
 * object URL 은 새로고침하면 사라진다 → 저장된 기록은 남고 그림만 빈다 (ui/FileDrop · AdminImage 가 안내를 보여 준다).
 */
export interface UploadRepository {
  upload(file: File, rule: FileRuleId): Promise<FileRef>
}

export function createMockUploadRepository(ctx: MockContext): UploadRepository {
  return {
    upload: (file, rule) =>
      respond(() => {
        requireActor(ctx)
        const problem = checkFile(file, FILE_RULES[rule])
        if (problem) throw new AdminRepoError('VALIDATION', problem)
        const ref: FileRef = { fileId: newId('file'), url: URL.createObjectURL(file), name: file.name, type: file.type, size: file.size }
        ctx.files.set(ref.fileId, ref)
        return ref
      }),
  }
}
