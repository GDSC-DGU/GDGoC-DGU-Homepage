import { useRef } from 'react'
import { acceptAttr, checkFile, type FileRule } from '../data/common/fileRules'

/**
 * 버튼으로 여는 파일 고르기 (숨긴 input[type=file]). 형식 · 용량이 맞지 않으면 onInvalid(명세 안내 문구).
 *   const picker = useFilePicker(FILE_RULES.introImage, upload, setError)
 *   <Button onClick={picker.open}>이미지 추가</Button>{picker.input}
 */
export function useFilePicker(rule: FileRule, onFile: (file: File) => void, onInvalid: (message: string) => void) {
  const ref = useRef<HTMLInputElement>(null)
  const input = (
    <input
      ref={ref}
      type="file"
      accept={acceptAttr(rule)}
      className="visually-hidden"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        const problem = checkFile(file, rule)
        if (problem) onInvalid(problem)
        else onFile(file)
      }}
    />
  )
  return { input, open: () => ref.current?.click() }
}
