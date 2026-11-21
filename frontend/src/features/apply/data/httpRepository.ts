import { ApplyError, type ApplyRepository } from './repository'
import type { ApiFailure, ApiSuccess, ApplicationForm, ApplicationRequest, ApplicationResult, CurrentRecruitment, DuplicateCheck } from './types'

/**
 * API 명세(docs/api/openapi.yaml)대로 Spring Boot 를 부르는 구현.
 * 주소: {baseUrl}/v1/recruitments/... (baseUrl 기본 '/api' → /api/v1/recruitments/...; Vercel rewrite · Vite 프록시로 같은 출처)
 * 응답은 { success: true, data } 를 벗겨서 data 만 돌려주고, { success: false, code, message } 는 ApplyError 로 던진다.
 */
export function createHttpApplyRepository(baseUrl = '/api', fetcher: typeof fetch = (...args) => fetch(...args)): ApplyRepository {
  const call = async <T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> => {
    let res: Response
    try {
      res = await fetcher(`${baseUrl}/v1${path}`, {
        method,
        headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new ApplyError('NETWORK', '서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.')
    }
    let json: unknown
    try {
      json = await res.json()
    } catch {
      throw new ApplyError('NETWORK', '서버 응답을 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요.', res.status)
    }
    if (isSuccess<T>(json)) return json.data
    if (isFailure(json)) throw new ApplyError(json.code, json.message, res.status)
    throw new ApplyError('NETWORK', '서버 응답을 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요.', res.status)
  }
  const rid = (id: string) => encodeURIComponent(id)

  return {
    getCurrent: () => call<CurrentRecruitment>('GET', '/recruitments/current'),
    getForm: (id) => call<ApplicationForm>('GET', `/recruitments/${rid(id)}/form`),
    checkDuplicate: (id, studentId) => call<DuplicateCheck>('POST', `/recruitments/${rid(id)}/applications/check`, { studentId }),
    submit: (id, req: ApplicationRequest) => call<ApplicationResult>('POST', `/recruitments/${rid(id)}/applications`, req),
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isSuccess = <T>(v: unknown): v is ApiSuccess<T> => isObject(v) && v.success === true && 'data' in v
const isFailure = (v: unknown): v is ApiFailure => isObject(v) && v.success === false && typeof v.code === 'string'
