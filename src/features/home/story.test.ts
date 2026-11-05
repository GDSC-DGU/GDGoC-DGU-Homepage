import { describe, expect, it } from 'vitest'
import { FAQS, PROJECTS, PUBLIC_PROJECTS, isPublicProject } from '@/content'
import { BAND, CLOSING, FEATURED_PROJECTS, HERO, PROJECTS_STORY, SPRINT_LINE, VOICES, voices, WAYS } from '@/content/story'
import { isShowableVoice, projectCounts, restProjects, voicesShown } from './homeData'

/** 화면에 나오는 홈 문장 */
const shown: { where: string; text: string }[] = [
  { where: 'HERO.fullName', text: HERO.fullName },
  { where: 'HERO.pitch', text: HERO.pitch.join(' ') },
  { where: 'PROJECTS_STORY.eyebrow', text: PROJECTS_STORY.eyebrow },
  { where: 'PROJECTS_STORY.title', text: PROJECTS_STORY.title },
  ...PROJECTS_STORY.sub.map((t, i) => ({ where: `PROJECTS_STORY.sub[${i}]`, text: t })),
  { where: 'PROJECTS_STORY.more', text: PROJECTS_STORY.more },
  { where: 'BAND.title', text: BAND.title },
  { where: 'BAND.next.kicker', text: BAND.next.kicker },
  ...BAND.lines.map((t, i) => ({ where: `BAND.lines[${i}]`, text: t })),
  ...WAYS.flatMap((w) => [
    { where: `WAYS.${w.id}.label`, text: w.label },
    { where: `WAYS.${w.id}.name`, text: w.name },
    { where: `WAYS.${w.id}.key`, text: w.key },
    { where: `WAYS.${w.id}.body`, text: w.body },
    { where: `WAYS.${w.id}.link`, text: w.link.label },
  ]),
  { where: 'SPRINT_LINE.key', text: SPRINT_LINE.key },
  { where: 'SPRINT_LINE.before', text: SPRINT_LINE.before },
  { where: 'SPRINT_LINE.after', text: SPRINT_LINE.after },
  ...Object.entries(CLOSING.status).map(([k, t]) => ({ where: `CLOSING.status.${k}`, text: t })),
  { where: 'CLOSING.title', text: CLOSING.title },
  { where: 'VOICES.title', text: VOICES.title },
]

/** 주장 제목 (이야기 섹션 h2): 질문형 금지 */
const claims = [PROJECTS_STORY.title, BAND.lines.join(' '), CLOSING.title, VOICES.title]

/** 끝나는 문장 (~니다.) 만 */
const sentences = shown.filter((x) => /[.]$/.test(x.text))

/** content.test.ts 와 같은 규칙: 영어 · 숫자 · 닫는 괄호 뒤에 띄어 쓴 조사 */
const SPACED_PARTICLE = /[A-Za-z0-9)] (은|는|이|가|을|를|으로|로|와|과|에|에서|의|에는|에서는|으로는|로는|이나|나|도|만|부터|까지|입니다|이다)(\s|$|[.,?!·)])/

describe('홈 문구 (content/story.ts)', () => {
  it('모든 블록에 출처가 있다', () => {
    for (const x of [HERO, PROJECTS_STORY, FEATURED_PROJECTS, BAND, ...WAYS, CLOSING]) {
      const src = Array.isArray(x.source) ? x.source : [x.source]
      expect(src.length, JSON.stringify(x).slice(0, 60)).toBeGreaterThan(0)
      for (const s of src) expect(String(s).trim().length).toBeGreaterThan(0)
    }
  })

  it('조사는 붙여 쓰고, 화면 날짜는 점으로 쓴다', () => {
    expect(shown.filter((x) => SPACED_PARTICLE.test(x.text)).map((x) => `${x.where}: ${x.text}`)).toEqual([])
    expect(shown.filter((x) => /\d{4}-\d{2}-\d{2}/.test(x.text)).map((x) => x.where)).toEqual([])
  })

  it('말투는 모두 ~습니다체 (해요체가 섞이지 않는다)', () => {
    expect(sentences.length).toBeGreaterThan(8)
    for (const x of sentences) expect(x.text, x.where).toMatch(/니다\.$/)
    for (const x of shown) expect(x.text, x.where).not.toMatch(/(해요|어요|아요|예요|돼요|세요)\.$/)
  })

  it('첫 화면은 이름 + 짧은 소개 (긴 문장은 G-Sprint 칸으로 옮겼다)', () => {
    expect(HERO.name).toBe('GDGoC DGU')
    expect(HERO.pitch.join(' ').length).toBeLessThanOrEqual(40)
    expect(shown.filter((x) => /9월에 처음 만난/.test(x.text)).map((x) => x.where)).toEqual(['SPRINT_LINE.before', 'SPRINT_LINE.after'])
  })

  it('G-Sprint 칸 문장은 데모데이 앞뒤로 시제만 바뀐다', () => {
    expect(SPRINT_LINE.before.replace(/냅니다\.$/, '')).toBe(SPRINT_LINE.after.replace(/냈습니다\.$/, ''))
    expect(SPRINT_LINE.before).toMatch(/냅니다\.$/)
    expect(SPRINT_LINE.after).toMatch(/냈습니다\.$/)
  })

  it('주장 제목은 질문형으로 쓰지 않는다', () => {
    for (const t of claims) {
      expect(t, t).not.toMatch(/[?？]/)
      expect(t, t).not.toMatch(/^(어떻게|왜|무엇|누가|언제|어디)/)
    }
  })

  it('한 사실은 한 번: 띠 문장의 말 · G-Sprint 규모가 다른 문장에 다시 나오지 않는다', () => {
    const others = shown.filter((x) => !x.where.startsWith('BAND.'))
    expect(others.filter((x) => /각자 풀/.test(x.text)).map((x) => x.where)).toEqual([])
    // G-Sprint 규모는 칸의 큰 숫자 한 곳에서만 말한다 (문장은 말하지 않는다)
    expect(shown.filter((x) => /\{teams\}|\{members\}/.test(x.text)).map((x) => x.where)).toEqual(['SPRINT_LINE.key'])
    // 화요일 세션: 시각은 큰 숫자, '매주 화요일' 은 작은 이름, 문장은 파트만
    const sessions = WAYS.find((w) => w.id === 'sessions')!
    expect(sessions.key).toMatch(/^\d{2}:\d{2}$/)
    expect(sessions.label).toMatch(/화요일/)
    expect(sessions.body).not.toMatch(/\d시|\d{2}:\d{2}/)
  })

  it('띠 안은 정확히 세 칸 (화요일 세션 · G-Sprint · 연합 행사), 칸마다 작은 이름 · 사이트 안 링크 하나', () => {
    expect(WAYS.map((w) => w.id)).toEqual(['sessions', 'sprint', 'joint'])
    for (const w of WAYS) {
      expect(w.label.trim().length, w.id).toBeGreaterThan(0)
      // 큰 숫자는 숫자로 시작한다 ('매주 18:00' 처럼 단위가 숫자 앞에 오지 않게)
      expect(w.key, w.id).toMatch(/^(\d|\{day\})/)
      expect(w.link.to, w.id).toMatch(/^\/[a-z]/)
      expect(w.body.split(/(?<=\.)\s/), w.id).toHaveLength(1)
    }
    expect(SPRINT_LINE.key).toMatch(/^\{teams\}/)
    expect(new Set(WAYS.map((w) => w.link.to)).size).toBe(3)
    expect(BAND.next.to).toMatch(/^\/about/)
  })

  it('연합 행사 칸의 큰 숫자는 문장에 적은 챕터 수와 같다', () => {
    const joint = WAYS.find((w) => w.id === 'joint')!
    const n = Number(joint.key.match(/\d+/)?.[0])
    const names = joint.body.split('챕터와')[0].split('·').map((x) => x.trim()).filter(Boolean)
    expect(names.length).toBeGreaterThan(1)
    expect(n).toBe(names.length)
  })

  it('프로젝트 숫자는 문구에 적지 않고 데이터에서 센다', () => {
    expect(PROJECTS_STORY.title).toContain('{n}')
    // 버튼은 숫자 없이 '프로젝트 전체 보기' (같은 숫자를 제목 · 버튼에 두 번 쓰지 않는다: AI 티 점검 2026-11-05)
    expect(PROJECTS_STORY.more).not.toMatch(/\d/)
    expect(PROJECTS_STORY.sub.join(' ')).toContain('{sc}')
    for (const t of [PROJECTS_STORY.title, ...PROJECTS_STORY.sub, PROJECTS_STORY.more]) expect(t.replace(/\{\w+\}/g, ''), t).not.toMatch(/\d/)
    // 지금 콘텐츠로 센 값: 완성된 공개 프로젝트가 있고, Solution Challenge 수는 그보다 많지 않다. 커밋 수는 쓰지 않는다
    const { done, solutionChallenge } = projectCounts(PUBLIC_PROJECTS)
    expect(done).toBeGreaterThan(0)
    expect(solutionChallenge).toBeGreaterThan(0)
    expect(solutionChallenge).toBeLessThanOrEqual(done)
    expect(shown.filter((x) => /커밋/.test(x.text)).map((x) => x.where)).toEqual([])
  })

  it('홈의 프로젝트 · 자주 묻는 질문은 콘텐츠에 있는 것', () => {
    const faqIds = new Set(FAQS.map((f) => f.id))
    for (const id of CLOSING.faqIds) expect(faqIds.has(id), id).toBe(true)
    expect(CLOSING.faqIds).toHaveLength(3)
    const byId = new Map(PROJECTS.map((p) => [p.id, p]))
    // 큰 타일: 설명과 실제 그림(화면 · 소개 그림)이 있다. 첫째는 실제 데스크톱 화면 + 폰 화면이 있다 (겹쳐 건다)
    expect(FEATURED_PROJECTS.big).toHaveLength(2)
    for (const id of FEATURED_PROJECTS.big) {
      const p = byId.get(id)
      expect(p?.summary, id).toBeTruthy()
      expect([p?.cover, ...(p?.images ?? [])].some((img) => img?.kind === 'screen' || img?.kind === 'promo'), id).toBe(true)
    }
    const first = byId.get(FEATURED_PROJECTS.big[0])
    const kinds = new Set([first?.cover, ...(first?.images ?? [])].map((img) => img?.kind))
    expect(kinds.has('screen') && kinds.has('mobile')).toBe(true)
    // 나머지 목록 = 큰 타일을 뺀 완성 프로젝트 전부 (homeData.restProjects)
    const rest = restProjects(PROJECTS.filter(isPublicProject), FEATURED_PROJECTS.big)
    const done = PROJECTS.filter(isPublicProject).filter((p) => p.status === 'done')
    expect(rest.length).toBe(done.length - FEATURED_PROJECTS.big.length)
    for (const id of FEATURED_PROJECTS.big) expect(rest.map((p) => p.id)).not.toContain(id)
    for (let i = 1; i < rest.length; i++) expect(rest[i - 1].year).toBeGreaterThanOrEqual(rest[i].year)
  })

  it('사람: 비어 있거나, 모두 공개 동의 기록이 있다 (지어낸 후기 금지)', () => {
    for (const v of voices) expect(isShowableVoice(v), v.id).toBe(true)
  })

  it('멤버 회고: 한국어 제목, 끝맺음을 한 말투로 맞추지 않는다 (원문 그대로), 처음엔 세 사람', () => {
    expect(VOICES.title).toBe('멤버 회고')
    const endings = new Set(voices.map((v) => (v.quote.trim().endsWith('습니다.') ? '습니다' : 'other')))
    expect(endings.size).toBe(2)
    expect(voicesShown(voices, false, 3)).toHaveLength(3)
    expect(voicesShown(voices, true, 3)).toHaveLength(voices.length)
  })
})
