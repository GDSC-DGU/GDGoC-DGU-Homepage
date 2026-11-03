import { kstToday } from '@/lib/date'
import { TeamsError, type TeamsRepository } from './repository'
import { AUTH_TRIES, AUTH_WAIT_MS, COMMENT_MAX, closingSoon, FILE_MAX, PAGE_SIZE, fileError, guessType, isNew, isPin, isStudentId, reopenError, statusOf, validatePost } from './rules'
import { SAMPLE_ACCOUNTS, createSampleSeed, type SampleAccount, type SeedComment, type SeedPost } from './sampleSeed'
import type { Attachment, Author, Credentials, PostBrief, PostInput, TeamComment, TeamPost } from './types'

/**
 * 예시 구현: 브라우저 메모리에만 둔다 (새로고침하면 처음 예시로 돌아간다. 다른 사람에게 보이지 않는다).
 * 서버가 할 일(학번 · PIN 확인, 실패 제한, 조회수, 자동 마감, 삭제 상태)을 같은 규칙으로 흉내 낸다.
 * 테스트는 now · delay 를 넘겨 시간을 고정한다.
 */
export interface SampleOptions {
  now?: () => number
  /** 응답 지연 (ms). 화면에서 '불러오는 중'이 보이게 */
  delay?: number
}

interface AuthState {
  failures: number
  /** 15분 제한을 한 번 겪었는지 (그 뒤 다시 5번 틀리면 잠김) */
  limitedOnce: boolean
  until: number
  locked: boolean
}

const clone = <T>(v: T): T => structuredClone(v)

export function createSampleTeamsRepository({ now = () => Date.now(), delay = 250 }: SampleOptions = {}): TeamsRepository {
  const today = () => kstToday(new Date(now()))
  const seed = createSampleSeed(today(), now())
  const posts: SeedPost[] = seed.posts
  const comments: SeedComment[] = seed.comments
  const accounts = new Map<string, SampleAccount>(SAMPLE_ACCOUNTS.map((a) => [a.studentId, a]))
  const auth = new Map<string, AuthState>()
  /** 올렸지만 아직 글에 붙지 않은 파일 */
  const uploads = new Map<string, Attachment>()
  let seq = 0

  const respond = <T>(fn: () => T): Promise<T> =>
    new Promise((resolve, reject) => {
      const run = () => {
        try {
          resolve(clone(fn()))
        } catch (e) {
          reject(e)
        }
      }
      if (delay > 0) setTimeout(run, delay)
      else queueMicrotask(run)
    })

  const authorOf = (studentId: string): Author => {
    const a = accounts.get(studentId)
    return a ? { name: a.name, generation: a.generation } : { name: '알 수 없음', generation: 0 }
  }

  const view = (p: SeedPost): TeamPost => ({
    id: p.id,
    no: posts.filter((x) => x.createdAt <= p.createdAt).length,
    category: p.category,
    title: p.title,
    content: p.content,
    author: authorOf(p.authorId),
    createdAt: p.createdAt,
    editedAt: p.editedAt,
    views: p.views,
    startDate: p.startDate,
    endDate: p.endDate,
    status: statusOf(p.endDate, p.closedByAuthor, today()),
    parts: p.parts,
    headcount: p.headcount,
    contactUrl: p.contactUrl,
    attachments: p.attachments,
    commentCount: comments.filter((c) => c.postId === p.id).length,
  })

  const brief = (p: SeedPost): PostBrief => ({
    id: p.id,
    category: p.category,
    title: p.title,
    status: statusOf(p.endDate, p.closedByAuthor, today()),
    endDate: p.endDate,
    views: p.views,
    commentCount: comments.filter((c) => c.postId === p.id).length,
  })
  const live = () => posts.filter((p) => !p.deleted)

  const find = (id: string): SeedPost => {
    const p = posts.find((x) => x.id === id)
    if (!p) throw new TeamsError('NOT_FOUND', '없는 게시글입니다.')
    if (p.deleted) throw new TeamsError('DELETED', '삭제된 게시글입니다.')
    return p
  }

  /** 학번 · PIN 확인 + 실패 제한 (5번 → 15분, 그 뒤 다시 5번 → 잠김). 없는 학번도 같은 안내 */
  const checkCred = (cred: Credentials): string => {
    const studentId = cred.studentId.trim()
    if (!isStudentId(studentId) || !isPin(cred.pin)) throw new TeamsError('AUTH_WRONG', '학번 10자리와 PIN 4자리를 확인해 주세요.')
    const st = auth.get(studentId) ?? { failures: 0, limitedOnce: false, until: 0, locked: false }
    auth.set(studentId, st)
    if (st.locked) throw new TeamsError('AUTH_LOCKED', '여러 번 틀려서 계정이 잠겼습니다. 운영진에게 잠금 해제를 요청해 주세요.')
    if (st.until > now()) throw new TeamsError('AUTH_LIMITED', `5번 틀려서 15분 동안 확인할 수 없습니다. ${clock(st.until)} 이후에 다시 시도해 주세요.`, { until: st.until })
    const acc = accounts.get(studentId)
    if (acc && acc.pin === null) throw new TeamsError('PIN_NOT_SET', 'PIN을 아직 설정하지 않았습니다. 메일로 받은 PIN 설정 링크를 확인해 주세요.')
    if (!acc || acc.pin !== cred.pin) {
      st.failures += 1
      if (st.failures >= AUTH_TRIES) {
        st.failures = 0
        if (st.limitedOnce) {
          st.locked = true
          throw new TeamsError('AUTH_LOCKED', '여러 번 틀려서 계정이 잠겼습니다. 운영진에게 잠금 해제를 요청해 주세요.')
        }
        st.limitedOnce = true
        st.until = now() + AUTH_WAIT_MS
        throw new TeamsError('AUTH_LIMITED', `5번 틀려서 15분 동안 확인할 수 없습니다. ${clock(st.until)} 이후에 다시 시도해 주세요.`, { until: st.until })
      }
      throw new TeamsError('AUTH_WRONG', `학번 또는 PIN이 맞지 않습니다. (${AUTH_TRIES - st.failures}번 더 틀리면 15분 동안 막힙니다)`)
    }
    auth.set(studentId, { failures: 0, limitedOnce: false, until: 0, locked: false })
    return studentId
  }

  const checkInput = (input: PostInput) => {
    const fields = validatePost(input)
    if (Object.keys(fields).length) throw new TeamsError('INVALID', '입력한 내용을 확인해 주세요.', { fields })
  }

  const takeFiles = (ids: string[], keep: Attachment[] = []): Attachment[] =>
    ids.map((id) => {
      const f = uploads.get(id) ?? keep.find((a) => a.id === id)
      if (!f) throw new TeamsError('INVALID', '첨부파일을 다시 올려 주세요.', { fields: { attachmentIds: '첨부파일을 다시 올려 주세요.' } })
      uploads.delete(id)
      return f
    })

  const clean = (input: PostInput) => ({
    category: input.category,
    title: input.title.trim(),
    content: input.content.trim(),
    startDate: input.startDate,
    endDate: input.endDate,
    parts: [...new Set(input.parts)],
    headcount: input.headcount,
    contactUrl: input.contactUrl?.trim() || null,
  })

  return {
    list: (q) =>
      respond(() => {
        const t = today()
        const words = (q.q ?? '').toLowerCase().split(/\s+/).filter(Boolean)
        const rows = posts
          .filter((p) => !p.deleted)
          .filter((p) => !q.category || p.category === q.category)
          .filter((p) => !q.status || statusOf(p.endDate, p.closedByAuthor, t) === q.status)
          .filter((p) => !q.part || p.parts.includes(q.part))
          .filter((p) => {
            if (!words.length) return true
            const hay = `${p.title} ${p.content} ${authorOf(p.authorId).name}`.toLowerCase()
            return words.every((w) => hay.includes(w))
          })
          .sort((a, b) => {
            if (q.sort === 'views') return b.views - a.views || b.createdAt.localeCompare(a.createdAt)
            if (q.sort === 'deadline') {
              // 모집 중인 글을 종료일 가까운 순으로 먼저, 마감된 글은 뒤에 최신순
              const sa = statusOf(a.endDate, a.closedByAuthor, t) === '모집중'
              const sb = statusOf(b.endDate, b.closedByAuthor, t) === '모집중'
              if (sa !== sb) return sa ? -1 : 1
              if (sa) return a.endDate.localeCompare(b.endDate) || b.createdAt.localeCompare(a.createdAt)
            }
            return b.createdAt.localeCompare(a.createdAt)
          })
        const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
        const page = Math.min(q.page, pageCount)
        return { items: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(view), total: rows.length, page, pageCount }
      }),

    summary: () =>
      respond(() => {
        const t = today()
        const weekAgo = now() - 7 * 86_400_000
        const open = live().filter((p) => statusOf(p.endDate, p.closedByAuthor, t) === '모집중')
        return {
          open: open.length,
          newToday: live().filter((p) => isNew(p.createdAt, now())).length,
          total: live().length,
          closingSoon: open
            .filter((p) => closingSoon(p.endDate, '모집중', t))
            .sort((a, b) => a.endDate.localeCompare(b.endDate))
            .slice(0, 3)
            .map(brief),
          popular: live()
            .filter((p) => Date.parse(p.createdAt) >= weekAgo)
            .sort((a, b) => b.views - a.views)
            .slice(0, 5)
            .map(brief),
        }
      }),

    adjacent: (id) =>
      respond(() => {
        const p = find(id)
        const sorted = live().sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        const i = sorted.indexOf(p)
        return { prev: i > 0 ? brief(sorted[i - 1]) : null, next: i < sorted.length - 1 ? brief(sorted[i + 1]) : null }
      }),

    get: (id) => respond(() => view(find(id))),

    countView: (id) =>
      respond(() => {
        const p = find(id)
        p.views += 1
        return p.views
      }),

    comments: (postId) =>
      respond(() => {
        find(postId)
        return comments
          .filter((c) => c.postId === postId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .map((c): TeamComment => ({ id: c.id, postId: c.postId, author: authorOf(c.authorId), content: c.content, createdAt: c.createdAt }))
      }),

    upload: (file, cred) =>
      respond(() => {
        if (!isStudentId(cred.studentId.trim()) || !isPin(cred.pin)) throw new TeamsError('AUTH_WRONG', '학번 10자리와 PIN 4자리를 먼저 넣어 주세요.')
        const err = fileError(file)
        if (err) throw new TeamsError('INVALID', err)
        const a: Attachment = { id: `file-${Date.now().toString(36)}-${++seq}`, name: file.name, type: file.type || guessType(file.name), size: file.size, url: typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '' }
        uploads.set(a.id, a)
        return a
      }),

    create: (input, cred) =>
      respond(() => {
        checkInput(input)
        const studentId = checkCred(cred)
        const at = new Date(now()).toISOString()
        const p: SeedPost = { id: `post-${String(posts.length + 1).padStart(2, '0')}`, ...clean(input), authorId: studentId, createdAt: at, editedAt: null, views: 0, closedByAuthor: false, attachments: takeFiles(input.attachmentIds.slice(0, FILE_MAX)), deleted: false }
        posts.push(p)
        return view(p)
      }),

    verifyAuthor: (id, cred) =>
      respond(() => {
        const p = find(id)
        const studentId = checkCred(cred)
        if (p.authorId !== studentId) throw new TeamsError('NOT_AUTHOR', '작성자만 수정 · 삭제할 수 있어요.')
      }),

    update: (id, input, cred) =>
      respond(() => {
        const p = find(id)
        checkInput(input)
        if (input.status === '모집중') {
          const err = reopenError(input.endDate, today())
          if (err) throw new TeamsError('INVALID', err, { fields: { status: err } })
        }
        const studentId = checkCred(cred)
        if (p.authorId !== studentId) throw new TeamsError('NOT_AUTHOR', '작성자만 수정 · 삭제할 수 있어요.')
        Object.assign(p, clean(input), {
          attachments: takeFiles(input.attachmentIds.slice(0, FILE_MAX), p.attachments),
          closedByAuthor: input.status === '마감',
          editedAt: new Date(now()).toISOString(),
        })
        return view(p)
      }),

    remove: (id, cred) =>
      respond(() => {
        const p = find(id)
        const studentId = checkCred(cred)
        if (p.authorId !== studentId) throw new TeamsError('NOT_AUTHOR', '작성자만 수정 · 삭제할 수 있어요.')
        p.deleted = true
      }),

    addComment: (postId, content, cred) =>
      respond(() => {
        find(postId)
        const text = content.trim()
        if (!text) throw new TeamsError('INVALID', '댓글 내용을 적어 주세요.')
        if (text.length > COMMENT_MAX) throw new TeamsError('INVALID', `댓글은 ${COMMENT_MAX.toLocaleString()}자까지 적을 수 있습니다.`)
        const studentId = checkCred(cred)
        const c: SeedComment = { id: `comment-${now().toString(36)}-${++seq}`, postId, authorId: studentId, content: text, createdAt: new Date(now()).toISOString() }
        comments.push(c)
        return { id: c.id, postId, author: authorOf(studentId), content: text, createdAt: c.createdAt }
      }),
  }
}

/** '14:35' (한국 시각) */
function clock(ms: number): string {
  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Seoul' }).format(new Date(ms))
}
