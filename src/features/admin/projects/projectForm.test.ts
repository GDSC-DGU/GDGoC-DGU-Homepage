import { describe, expect, it } from 'vitest'
import { ADMIN_SAMPLE } from '../sample'
import { GENERATIONS } from '@/content'
import type { AdminProject } from '../data/projects/types'
import { GENERATION_OPTIONS, draftChanged, draftFromProject, emptyProjectDraft, fileNameOf, toProjectInput, validateProjectDraft } from './projectForm'

const project: AdminProject = {
  id: 'p1',
  no: 1,
  thumbnailUrl: '/project-images/agriguard.webp',
  title: '예시 프로젝트',
  summary: '예시 설명',
  generation: 3,
  members: '',
  githubUrl: 'https://github.com/example/repo',
  serviceUrl: null,
  isPublic: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  created: { by: { kind: 'system', name: '시스템' }, at: '2026-01-01T00:00:00.000Z' },
  updated: null,
  deleted: null,
}

describe('프로젝트 등록 · 수정 폼 (P-APJ-02)', () => {
  it('새 프로젝트는 공개가 기본값, 빈 칸은 필수 오류 4개', () => {
    const d = emptyProjectDraft()
    expect(d.isPublic).toBe(true)
    expect(Object.keys(validateProjectDraft(d)).sort()).toEqual(['generation', 'summary', 'thumbnail', 'title'])
  })

  it('수정 모드: 저장된 값으로 채우고, 그대로 보내면 같은 값', () => {
    const d = draftFromProject(project)
    expect(d).toMatchObject({ thumbnail: { url: '/project-images/agriguard.webp', name: 'agriguard.webp' }, generation: '3', githubUrl: 'https://github.com/example/repo', serviceUrl: '', isPublic: false })
    expect(toProjectInput(d)).toEqual({ thumbnailUrl: project.thumbnailUrl, title: project.title, summary: project.summary, generation: 3, members: '', githubUrl: project.githubUrl, serviceUrl: null, isPublic: false })
    expect(draftChanged(d, draftFromProject(project))).toBe(false)
    expect(draftChanged({ ...d, isPublic: true }, d)).toBe(true)
  })

  it('URL 은 비우면 통과, 쓰면 http(s) 주소', () => {
    const d = { ...draftFromProject(project), githubUrl: 'github.com/x', serviceUrl: '  ' }
    expect(Object.keys(validateProjectDraft(d))).toEqual(['githubUrl'])
  })

  it('썸네일 파일 이름 · 기수 고르기', () => {
    expect(fileNameOf('/gdg/project-images/a%20b.webp?v=1')).toBe('a b.webp')
    expect(fileNameOf('data:image/svg+xml,...')).toBe(ADMIN_SAMPLE ? '예시 이미지' : '이미지')
    expect(fileNameOf('blob:http://x/1')).toBe('올린 이미지')
    expect(GENERATION_OPTIONS.map((o) => o.value)).toEqual(GENERATIONS.map((g) => String(g.n)))
  })
})
