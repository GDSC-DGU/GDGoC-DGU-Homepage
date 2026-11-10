/**
 * 자세히 보기 창 주소: /archive?p=<id>. 주소를 그대로 보내면 같은 창이 열린다.
 * 페이지 안에서 연 창은 history 에 한 칸 쌓으므로(state.sheet), 닫을 때 뒤로 가기로 한 칸 돌아간다.
 */
export const SHEET_PARAM = 'p'

export const sheetSearch = (id: string) => `?${SHEET_PARAM}=${encodeURIComponent(id)}`

export interface SheetState {
  sheet: true
}

export const SHEET_STATE: SheetState = { sheet: true }

export const isSheetState = (v: unknown): v is SheetState => typeof v === 'object' && v !== null && (v as Partial<SheetState>).sheet === true
