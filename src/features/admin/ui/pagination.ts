/** 보여 줄 쪽 번호 (null = …): 처음 · 끝 · 지금 앞뒤 하나씩 */
export function pageList(page: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total))
  if (page <= 3) [2, 3, 4].forEach((p) => set.add(p))
  if (page >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => set.add(p))
  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | null)[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null)
    out.push(p)
  })
  return out
}
