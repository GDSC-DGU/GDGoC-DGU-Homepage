import { describe, expect, it } from 'vitest'
import { guessGeneration } from '../../scripts/sync-events.mjs'
import { KIND_LABEL } from '@/config/kinds'
import { PAGE_PLANS } from '@/config/pages'
import { ABOUT_FACTS, RECRUIT_FACTS, SITE, SPRINT } from '@/config/site'
import { ARCHIVE, PREVIEWS, SCHEDULE, TEAMS_STATUS } from '@/data/mock/fixtures'
import { CHAPTER, CONTENT_ISSUES, CONTENT_UPDATED_AT, EVENTS, FAQS, GENERATIONS, isPublicProject, PROJECTS, projectsBasis, PUBLIC_PROJECTS, RECRUITING } from '.'
import chapterJson from './chapter.json'
import eventsJson from './events.json'
import faqJson from './faq.json'
import generationsJson from './generations.json'
import projectsJson from './projects.json'
import recruitingJson from './recruiting.json'
import { checkFaqs, checkGenerations, checkPhotos, checkProjects, isHttpsUrl, isValidYm, isValidYmd } from './validate'

const unique = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i)
const isUrlSource = (s: string) => s.startsWith('http')
const EVENT_PAGE = 'https://gdg.community.dev/events/details/'

/** 화면에 나오지 않는 값: id · 날짜 필드 · 주소 · 종류 이름 · 게시된 영어 원제목 · 기술 이름 · 검색 키워드 · 와이어프레임 번호 */
const NOT_SHOWN = new Set(['id', 'date', 'endDate', 'start', 'end', 'updatedAt', 'asOf', 'demoDay', 'url', 'repo', 'channel', 'chapterPage', 'github', 'email', 'emailSource', 'nameEn', 'originalTitle', 'stack', 'kind', 'place', 'status', 'keywords', 'wireframe',
  // 프로젝트의 GitHub 숫자 · 그림 경로 (언어 이름은 기술 이름처럼 그대로 보여 준다)
  'firstCommit', 'lastCommit', 'statsAsOf', 'languages', 'src'])

/** public/project-images 에 실제로 있는 그림 파일 ('/public/project-images/x.webp') */
const PUBLIC_IMAGES = new Set(Object.keys(import.meta.glob('/public/project-images/*')))
const CHAPTER_RAW = ['https://raw.githubusercontent.com/GDSC-DGU/', 'https://github.com/GDSC-DGU/']
/** 챕터 노션 '전 기수 데이터 모음집'의 줄 (팀 소개 이미지 · 발표 자료 첫 장. 4기 Organizer 결정 2026-11-04) */
const CHAPTER_NOTION = 'https://app.notion.com/p/'

interface Shown {
  where: string
  text: string
}

/** JSON · 설정 객체에서 화면(또는 출처 줄)에 나오는 문자열만 모은다 */
function shownStrings(value: unknown, where: string, out: Shown[] = []): Shown[] {
  if (typeof value === 'string') {
    if (!/^https?:\/\//.test(value)) out.push({ where, text: value })
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => shownStrings(v, `${where}[${i}]`, out))
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) if (!NOT_SHOWN.has(k)) shownStrings(v, `${where}.${k}`, out)
  }
  return out
}

const SHOWN: Shown[] = [
  ...shownStrings(chapterJson, 'chapter.json'),
  ...shownStrings(eventsJson, 'events.json'),
  ...shownStrings(faqJson, 'faq.json'),
  ...shownStrings(generationsJson, 'generations.json'),
  ...shownStrings(projectsJson, 'projects.json'),
  ...shownStrings(recruitingJson, 'recruiting.json'),
  ...shownStrings({ SITE, ABOUT_FACTS, RECRUIT_FACTS, SPRINT }, 'config/site.ts'),
  ...shownStrings(PAGE_PLANS, 'config/pages.ts'),
  ...shownStrings(KIND_LABEL, 'config/kinds.ts'),
  ...shownStrings({ SCHEDULE, PREVIEWS, ARCHIVE }, 'data/mock/fixtures.ts'),
]

/** 영어 · 숫자 · 닫는 괄호 뒤에 띄어 쓴 조사 ('G-Sprint 는', 'TTS 로', 'AI 가') */
const SPACED_PARTICLE = /[A-Za-z0-9)] (은|는|이|가|을|를|으로|로|와|과|에|에서|의|에는|에서는|으로는|로는|이나|나|도|만|부터|까지|입니다|이다)(\s|$|[.,?!·)])/

const offenders = (re: RegExp) => SHOWN.filter((x) => re.test(x.text)).map((x) => `${x.where}: ${x.text}`)

describe('콘텐츠 JSON 전체', () => {
  it('틀린 줄이 없다 (있으면 어느 파일 몇 번째 줄인지 보여 준다)', () => {
    expect(CONTENT_ISSUES).toEqual([])
  })

  it('JSON 의 모든 줄이 화면까지 간다 (조용히 빠지는 줄이 없다)', () => {
    expect(EVENTS).toHaveLength(eventsJson.events.length)
    expect(PROJECTS).toHaveLength(projectsJson.projects.length)
    expect(GENERATIONS).toHaveLength(generationsJson.generations.length)
    expect(FAQS).toHaveLength(faqJson.faqs.length)
  })

  it('갱신 날짜가 YYYY-MM-DD 이다', () => {
    expect(isValidYmd(CONTENT_UPDATED_AT)).toBe(true)
  })
})

describe('한글 꼴', () => {
  it('콘텐츠 JSON 글자는 모두 NFC (풀어 쓴 한글은 검색에서 안 맞는다)', async () => {
    const files = import.meta.glob('./*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    const bad = Object.entries(files).filter(([, text]) => text !== text.normalize('NFC')).map(([name]) => name)
    expect(bad).toEqual([])
  })
})

describe('photos.json', () => {
  const photo = { id: 'ot', src: 'photos/2026-09-ot.webp', alt: '4기 OT에서 자기소개하는 멤버들', width: 1600, height: 1067, date: '2026-09-15', event: '4기 OT', consent: { date: '2026-09-20', by: '4기 Organizer' } }
  it('공개 동의 기록이 없는 사진은 화면에 나오지 않는다', () => {
    expect(checkPhotos([photo]).items).toHaveLength(1)
    const { consent: _drop, ...noConsent } = photo
    void _drop
    const r = checkPhotos([noConsent, { ...photo, id: 'b', consent: { date: '', by: '' } }])
    expect(r.items).toEqual([])
    expect(r.issues.map((x) => x.problem)).toEqual(['consent(공개 동의: date · by)가 없습니다', 'consent(공개 동의: date · by)가 없습니다'])
  })
  it('파일은 public/photos 나 https 주소, 설명(alt)이 있어야 한다', () => {
    expect(checkPhotos([{ ...photo, src: 'http://x.test/a.jpg' }]).items).toEqual([])
    expect(checkPhotos([{ ...photo, alt: ' ' }]).items).toEqual([])
    expect(checkPhotos([{ ...photo, src: 'https://lh3.googleusercontent.com/a.jpg' }]).items).toHaveLength(1)
  })
})

describe('events.json', () => {
  it('id 가 겹치지 않는다', () => {
    expect(unique(EVENTS.map((e) => e.id))).toEqual([])
  })

  it('날짜가 올바르고, 여러 날 행사는 끝나는 날이 시작보다 늦다', () => {
    for (const e of EVENTS) {
      expect(isValidYmd(e.date), e.id).toBe(true)
      if (e.endDate) {
        expect(isValidYmd(e.endDate), e.id).toBe(true)
        expect(e.endDate > e.date, e.id).toBe(true)
      }
    }
  })

  it('날짜순으로 적혀 있다', () => {
    const dates = EVENTS.map((e) => e.date)
    expect(dates).toEqual([...dates].sort())
  })

  it('모든 행사에 출처가 있고, 상세 페이지가 출처면 url 도 같은 주소다', () => {
    for (const e of EVENTS) {
      expect(e.source, e.id).toBeTruthy()
      if (e.source?.startsWith(EVENT_PAGE)) expect(e.url, e.id).toBe(e.source)
      if (e.url) expect(isHttpsUrl(e.url), e.id).toBe(true)
    }
  })

  it('기수는 날짜(9월 시작 학년)와 맞는다', () => {
    for (const e of EVENTS) expect(e.generation, `${e.id} ${e.date}`).toBe(guessGeneration(e.date))
  })

  it('종류와 장소가 맞는다 (OT → 지원 안내, 발표 · G-Sprint → 프로젝트, 세션 → 커뮤니티)', () => {
    for (const e of EVENTS) {
      if (e.kind === 'recruit') expect(e.place, e.id).toBe('recruits')
      if (e.kind === 'sprint' || e.kind === 'project') expect(e.place, e.id).toBe('projects')
      if (e.kind === 'session' || e.kind === 'rest') expect(e.place, e.id).toBe('community')
    }
  })

  it('운영 계획(내부 출처) 일정에는 공개 주소를 적지 않는다', () => {
    for (const e of EVENTS.filter((x) => x.source && !isUrlSource(x.source))) expect(e.url, e.id).toBeUndefined()
  })
})

describe('projects.json', () => {
  it('id 가 겹치지 않는다', () => {
    expect(unique(PROJECTS.map((p) => p.id))).toEqual([])
  })

  it('끝난 프로젝트는 저장소나 서비스 주소가 있고, 모든 프로젝트에 출처가 있다', () => {
    for (const p of PROJECTS) {
      if (p.status === 'done') expect(Boolean(p.repo || p.url), p.id).toBe(true)
      expect(p.source, p.id).toBeTruthy()
    }
  })

  it('공개 프로젝트(PUBLIC_PROJECTS)는 챕터 GitHub 조직 저장소만 센다', () => {
    expect(projectsBasis).toBe('GitHub 공개 저장소 기준')
    expect(PUBLIC_PROJECTS.length).toBeGreaterThan(0)
    for (const p of PUBLIC_PROJECTS) expect(p.repo?.startsWith('https://github.com/GDSC-DGU/'), p.id).toBe(true)
    // 개인 저장소에서 만드는 홈페이지 리뉴얼은 목록에는 있지만 공개 숫자에서는 빠진다
    expect(PROJECTS.some((p) => p.id === 'homepage-renewal')).toBe(true)
    expect(PUBLIC_PROJECTS.some((p) => p.id === 'homepage-renewal')).toBe(false)
    expect(isPublicProject({ repo: 'https://github.com/someone/gdghomepage' })).toBe(false)
    expect(isPublicProject({})).toBe(false)
  })

  it('프로그램 이름은 한 가지로 쓴다 (Solution Challenge 2024 · 2025 · 2026)', () => {
    for (const p of PROJECTS.filter((x) => /solution challenge/i.test(x.program))) {
      expect(['Solution Challenge 2024', 'Solution Challenge 2025', 'Solution Challenge 2026'], p.id).toContain(p.program)
    }
  })

  it('기술은 4개까지만 적는다', () => {
    for (const p of PROJECTS) expect((p.stack ?? []).length, p.id).toBeLessThanOrEqual(4)
  })

  it('기수는 연혁에 있는 기수다', () => {
    const ns = new Set(GENERATIONS.map((g) => g.n))
    for (const p of PROJECTS) if (p.generation !== undefined) expect(ns.has(p.generation), p.id).toBe(true)
  })

  it('그림 파일이 public/project-images 에 있고, 원본은 챕터 GitHub 조직 저장소나 챕터 노션 모음집이다 (바깥 호스팅 그림은 팀 확인 전까지 넣지 않는다)', () => {
    for (const p of PROJECTS) {
      for (const img of [...(p.cover ? [p.cover] : []), ...(p.images ?? [])]) {
        expect(PUBLIC_IMAGES.has(`/public/${img.src}`), `${p.id}: ${img.src}`).toBe(true)
        expect(img.src.startsWith('project-images/'), `${p.id}: ${img.src}`).toBe(true)
        expect([...CHAPTER_RAW, CHAPTER_NOTION].some((prefix) => img.source.startsWith(prefix)), `${p.id}: ${img.source}`).toBe(true)
        expect(typeof img.teamCleared, `${p.id}: ${img.src}`).toBe('boolean')
      }
    }
  })

  it('같은 그림을 두 번 싣지 않는다', () => {
    const srcs = PROJECTS.flatMap((p) => [...(p.cover ? [p.cover.src] : []), ...(p.images ?? []).map((i) => i.src)])
    expect(unique(srcs)).toEqual([])
  })

  it('GitHub 숫자에는 확인한 날이 있고, 저장소가 있는 프로젝트의 숫자다', () => {
    for (const p of PROJECTS) {
      if (p.contributors !== undefined || p.commits !== undefined || p.languages) {
        expect(p.statsAsOf, p.id).toBeTruthy()
        expect(p.repo, p.id).toBeTruthy()
      }
      if (p.firstCommit && p.lastCommit) expect(p.firstCommit <= p.lastCommit, p.id).toBe(true)
    }
  })

  it('진행 중 프로젝트는 지금 기수 것이다', () => {
    const current = GENERATIONS.find((g) => g.current)?.n
    for (const p of PROJECTS.filter((x) => x.status === 'in-progress')) expect(p.generation, p.id).toBe(current)
  })
})

describe('generations.json', () => {
  it('1기부터 빠짐없이 이어진다', () => {
    expect(GENERATIONS.map((g) => g.n)).toEqual(GENERATIONS.map((_, i) => i + 1))
  })

  it('지금 기수는 하나이고, 가장 마지막 기수다', () => {
    const current = GENERATIONS.filter((g) => g.current)
    expect(current).toHaveLength(1)
    expect(current[0].n).toBe(GENERATIONS.length)
    expect(current[0].end).toBeUndefined()
  })

  it('기간이 YYYY-MM 이고 서로 겹치지 않는다', () => {
    let prevEnd = ''
    for (const g of GENERATIONS) {
      if (g.start) {
        expect(isValidYm(g.start), `${g.n}기`).toBe(true)
        expect(g.start > prevEnd, `${g.n}기`).toBe(true)
      }
      if (g.end) {
        expect(isValidYm(g.end), `${g.n}기`).toBe(true)
        prevEnd = g.end
      }
    }
  })

  it('행사 기록과 기간이 맞는다 (그 기수 행사는 start 이후)', () => {
    for (const g of GENERATIONS) {
      const mine = EVENTS.filter((e) => e.generation === g.n)
      if (g.start && mine.length) expect(mine[0].date.slice(0, 7) >= g.start, `${g.n}기`).toBe(true)
    }
  })

  it('대표 기록의 숫자는 events · projects 에서 센 값과 같다 (부풀리지 않는다)', () => {
    for (const g of GENERATIONS) {
      for (const h of g.highlights) {
        const where = `${g.n}기 '${h}'`
        // 'Camping Seminar 공개 기록 8건' = events.json 에서 그 기수 · 그 시리즈 줄 수
        const rec = h.match(/^(.+) 공개 기록 (\d+)건$/)
        if (rec) expect(EVENTS.filter((e) => e.generation === g.n && e.series === rec[1]).length, where).toBe(Number(rec[2]))
        if (/Camping Seminar/.test(h)) expect(rec, `${where}: 'Camping Seminar 공개 기록 N건' 으로 씁니다`).not.toBeNull()
        // 'Solution Challenge 2026 프로젝트 6개' · 'Solution Challenge 2024 프로젝트 9개' = projects.json 에서 그 기수 · 그 프로그램 줄 수
        const proj = h.match(/^(.+?) (?:프로젝트 )?(\d+)개$/)
        if (proj && PROJECTS.some((p) => p.program === proj[1])) {
          expect(PROJECTS.filter((p) => p.generation === g.n && p.program === proj[1]).length, where).toBe(Number(proj[2]))
        }
      }
    }
  })

  it('대표 기록은 2~4개, 출처는 1개 이상', () => {
    for (const g of GENERATIONS) {
      expect(g.highlights.length, `${g.n}기`).toBeGreaterThanOrEqual(2)
      expect(g.highlights.length, `${g.n}기`).toBeLessThanOrEqual(4)
      expect(g.source.length, `${g.n}기`).toBeGreaterThan(0)
    }
  })
})

describe('faq.json', () => {
  it('id 가 겹치지 않고, 모든 답에 출처가 있다', () => {
    expect(unique(FAQS.map((f) => f.id))).toEqual([])
    for (const f of FAQS) expect(f.source, f.id).toBeTruthy()
  })

  it('질문은 물음표로, 답은 ~습니다체로 끝난다', () => {
    for (const f of FAQS) {
      expect(f.q.endsWith('?'), f.id).toBe(true)
      expect(/니다\.$/.test(f.a), f.id).toBe(true)
    }
  })
})

describe('chapter.json · recruiting.json', () => {
  it('확인된 G-Sprint 숫자에는 공개 출처가 있다', () => {
    if (CHAPTER.sprint.verified) expect(isHttpsUrl(CHAPTER.sprint.source)).toBe(true)
    expect(isValidYmd(CHAPTER.sprint.demoDay)).toBe(true)
  })

  it('지난 모집 단계의 날짜가 올바르다', () => {
    for (const h of RECRUITING.history) {
      for (const s of h.steps as Array<{ id: string; start: string; end?: string }>) {
        expect(isValidYmd(s.start), s.id).toBe(true)
        if (s.end) expect(s.end >= s.start, s.id).toBe(true)
      }
    }
  })
})

describe('화면 문구 (콘텐츠 JSON · config · mock)', () => {
  it('영어 · 숫자 뒤 조사는 붙여 쓴다 (G-Sprint는, TTS로, AI가)', () => {
    expect(offenders(SPACED_PARTICLE)).toEqual([])
  })

  it('날짜는 2026.08.18 · 2026.09.08–09.10 처럼 점으로 쓴다 (2026-08-18 · 09-08~09-10 금지)', () => {
    expect(offenders(/\d{4}-\d{2}|\b\d{2}-\d{2}\b/)).toEqual([])
  })

  it('같은 것을 한 이름으로 부른다', () => {
    expect(offenders(/구글|Core Member|2024 Solution Challenge|APAC Solution Challenge|\(APAC\)|주제 발표/)).toEqual([])
  })

  it('검사가 실제로 잡는다 (예시)', () => {
    for (const bad of ['G-Sprint 는 팀 프로젝트', 'TTS 로 읽어 줌', 'AI 가 짚어 줌', 'gdsc.dgu@gmail.com 이나', '@gdg.donggukuniv 로', '(4기) 의']) expect(SPACED_PARTICLE.test(bad), bad).toBe(true)
    for (const ok of ['G-Sprint는', 'Camping Seminar 공개 기록 8건', 'Product Design 네 파트', 'GDSC(GDSC) 이름으로']) expect(SPACED_PARTICLE.test(ok), ok).toBe(false)
  })

  it('지어낸 예시 글(sample)이 없고, 팀원 모집 미리보기는 날짜 없는 상태 줄이다', () => {
    expect([...ARCHIVE, ...Object.values(PREVIEWS).flat()].filter((x) => x.sample)).toEqual([])
    expect(TEAMS_STATUS.length).toBeGreaterThan(0)
    for (const t of TEAMS_STATUS) {
      expect(t.date, t.id).toBeUndefined()
      expect(t.label, t.id).toBeTruthy()
    }
  })
})

describe('검사기 (validate.ts) 가 틀린 JSON 을 잡는다', () => {
  it('프로젝트: 주소 없음 · 상태 오타 · 기술 5개', () => {
    const { items, issues } = checkProjects([
      { id: 'a', name: 'A', program: 'X', year: 2025, status: 'done', source: 's' },
      { id: 'b', name: 'B', program: 'X', year: 2025, status: 'finished', repo: 'https://github.com/x', source: 's' },
      { id: 'c', name: 'C', program: 'X', year: 2025, status: 'done', url: 'https://x.dev', stack: ['1', '2', '3', '4', '5'], source: 's' },
      { id: 'd', name: 'D', program: 'X', year: 2025, status: 'done', url: 'https://x.dev', source: 's' },
      // 진행 중이면 아직 공개 주소가 없어도 된다
      { id: 'e', name: 'E', program: 'G-Sprint', year: 2026, status: 'in-progress', source: 's' },
    ])
    expect(items.map((p) => p.id)).toEqual(['d', 'e'])
    expect(issues.map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('프로젝트 그림 · 숫자: 경로 · 원본 주소 · 확인 여부 · 언어 비율 · 커밋 날짜', () => {
    const base = { name: 'A', program: 'X', year: 2025, status: 'done', repo: 'https://github.com/GDSC-DGU/a', source: 's' }
    const img = { src: 'project-images/a.webp', alt: 'A 화면', kind: 'screen', width: 960, height: 600, source: 'https://raw.githubusercontent.com/GDSC-DGU/a/main/a.png', teamCleared: false }
    const { items, issues } = checkProjects([
      { ...base, id: 'ok', cover: img, images: [{ ...img, kind: 'diagram', caption: '구조' }], languages: [{ name: 'Dart', share: 90 }], contributors: 3, commits: 10, firstCommit: '2025-04-01', lastCommit: '2025-05-01', statsAsOf: '2026-10-17', demo: ['https://youtu.be/x'] },
      { ...base, id: 'abs-src', cover: { ...img, src: '/projects/a.webp' } },
      { ...base, id: 'no-teamCleared', cover: { ...img, teamCleared: undefined } },
      { ...base, id: 'http-source', images: [{ ...img, source: 'http://x.dev/a.png' }] },
      { ...base, id: 'too-much', languages: [{ name: 'A', share: 80 }, { name: 'B', share: 40 }], statsAsOf: '2026-10-17' },
      { ...base, id: 'no-basis', contributors: 3 },
      { ...base, id: 'backwards', firstCommit: '2025-05-01', lastCommit: '2025-04-01' },
    ])
    expect(items.map((p) => p.id)).toEqual(['ok'])
    expect(items[0].cover?.teamCleared).toBe(false)
    expect(items[0].images?.[0].caption).toBe('구조')
    expect([...new Set(issues.map((i) => i.id))]).toEqual(['abs-src', 'no-teamCleared', 'http-source', 'too-much', 'no-basis', 'backwards'])
  })

  it('기수: 날짜 모양 · 출처 없음', () => {
    const { items, issues } = checkGenerations([
      { n: 1, name: 'GDSC DGU', start: '2023-9', summary: 's', highlights: ['a'], source: ['x'] },
      { n: 2, name: 'GDGoC DGU', summary: 's', highlights: ['a'], source: [] },
    ])
    expect(items).toEqual([])
    expect(issues).toHaveLength(2)
  })

  it('FAQ: 출처 없음', () => {
    expect(checkFaqs([{ id: 'a', q: '?', a: '답입니다.' }]).issues[0].problem).toMatch('source')
  })

  it('없는 날짜를 잡는다', () => {
    expect(isValidYmd('2026-02-30')).toBe(false)
    expect(isValidYmd('2026-02-28')).toBe(true)
  })
})
