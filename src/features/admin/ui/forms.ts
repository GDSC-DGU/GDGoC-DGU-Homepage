/**
 * 폼 도우미.
 * 제출할 때 오류가 있으면 첫 오류 칸으로 초점을 옮긴다 (화면 읽기는 칸 이름 + 오류 문장을 읽는다).
 *   const onSubmit = (e) => { e.preventDefault(); const errs = validate(); setErrors(errs); if (hasErrors(errs)) requestAnimationFrame(() => focusFirstInvalid(formRef.current)) }
 */
export function focusFirstInvalid(root: HTMLElement | null) {
  const el = root?.querySelector<HTMLElement>('[aria-invalid="true"]')
  if (!el) return
  // radiogroup(fieldset)이면 그 안 첫 선택지로
  const target = el.matches('fieldset') ? (el.querySelector<HTMLElement>('input:not([disabled])') ?? el) : el
  target.focus()
}

export const hasErrors = (errors: Record<string, string | null | undefined>) => Object.values(errors).some(Boolean)
