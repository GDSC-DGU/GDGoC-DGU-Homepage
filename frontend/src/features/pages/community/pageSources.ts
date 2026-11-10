import { hostOf, isUrl } from '../format'

/**
 * 페이지 끝 출처 줄: 페이지가 쓴 출처(주소 · 글)를 한 줄 목록으로 접는다. community.test.ts 에 테스트.
 * 줄마다 '출처 · 기준' 을 붙이지 않고, 페이지 맨 끝에 한 번만 적기 위한 것이다 (커뮤니티 · 지원 안내).
 *
 * - 주소는 사이트(도메인)마다 하나: 행사 페이지 수십 개 → 'gdg.community.dev' 하나. 주소는 hubs 의 대표 주소, 없으면 처음 나온 주소
 * - 글로 된 출처는 괄호 · 콜론 뒤를 빼고 이름만: '4기 Organizer 이도윤 확인 (2026.10.17): …' → '4기 Organizer 이도윤 확인'
 * - '인스타그램 … 게시물' 같은 글은 인스타그램 주소와 하나로
 * - 'src/…' 처럼 저장소 안 파일을 가리키는 출처는 화면에 보이지 않는다
 */
/** 'YYYY-MM-DD' → '2026.10.17' (출처 줄의 갱신 날짜: 요일 '일' 이 '10.18 일 갱신' 처럼 읽히지 않게 요일 없이) */
export const dotDate = (ymd: string) => ymd.slice(0, 10).replaceAll('-', '.')

export interface SourceItem {
  key: string
  label: string
  href?: string
}

/** 도메인 → 화면 이름 */
const HOST_LABEL: Record<string, string> = {
  'gdg.community.dev': 'gdg.community.dev',
  'instagram.com': '인스타그램',
  'forms.gle': '지원서(forms.gle)',
  'linktr.ee': 'Linktree',
  'github.com': 'GitHub',
}

const textName = (src: string) =>
  src
    .split(':')[0]
    .replace(/\s*\([^)]*\)/g, '')
    .trim()

export function pageSources(sources: readonly (string | readonly string[] | undefined | null)[], hubs: Readonly<Record<string, string>> = {}): SourceItem[] {
  const out: SourceItem[] = []
  const seen = new Set<string>()
  // 주소 여러 개를 ' · ' 로 이은 것만 나눈다 ('인스타그램 4기 모집 게시물 · D-day 게시물' 같은 글은 통째로 하나)
  const split = (s: string) => {
    const parts = s.split(' · ')
    return parts.every((x) => isUrl(x.trim())) ? parts : [s]
  }
  const flat = sources.flatMap((s) => (s == null ? [] : typeof s === 'string' ? split(s) : s.flatMap(split)))
  for (const raw of flat) {
    const src = raw.trim()
    if (!src || src.startsWith('src/') || src.startsWith('config/')) continue
    let key: string
    let item: SourceItem
    if (isUrl(src)) {
      const host = hostOf(src)
      key = host
      item = { key, label: HOST_LABEL[host] ?? host, href: hubs[host] ?? src }
    } else if (/인스타그램/.test(src)) {
      key = 'instagram.com'
      item = { key, label: HOST_LABEL[key], href: hubs[key] }
    } else {
      key = textName(src)
      item = { key, label: key }
    }
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}
