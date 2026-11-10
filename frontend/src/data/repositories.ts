import type { PlaceId, PreviewItem, Project, Review, ScheduleEvent, SearchHit, Seminar, Stat } from '@/domain/types'

/**
 * 화면이 데이터를 가져오는 '창구' (Repository 패턴).
 * 컴포넌트는 이 인터페이스만 알고, 데이터가 예시(mock)인지 Spring Boot API(http)인지는 모른다.
 * 그래서 백엔드가 준비되면 컴포넌트를 고치지 않고 구현체만 갈아 끼우면 된다.
 */
export interface ScheduleRepository {
  /** 지난 행사와 다가오는 일정 모두 (날짜순 정렬은 화면이 lib/schedule 로 한다) */
  list(): Promise<ScheduleEvent[]>
}

export interface ProjectRepository {
  list(): Promise<Project[]>
}

/** 세미나 발표 기록 (아카이브 '세미나'). 발표 자료 주소(fileUrl)는 백엔드가 R2 에 올린 뒤 채운다 */
export interface SeminarRepository {
  list(): Promise<Seminar[]>
}

export interface StatsRepository {
  list(): Promise<Stat[]>
}

/** 소개(about)는 고정 문구(config/site.ts)라서 서버에서 받지 않는다 */
export type PreviewPlace = Exclude<PlaceId, 'about'>

export interface PreviewRepository {
  /** 장소별 최신 글 몇 개 (지도 패널의 '최신 3개') */
  latest(place: PreviewPlace, limit: number): Promise<PreviewItem[]>
}

export interface ReviewRepository {
  list(): Promise<Review[]>
}

/** 아카이브 검색. 지금은 키워드 일치, 나중에 서버를 거쳐 Gemini API 로 바꾼다 (Strategy) */
export interface SearchService {
  search(query: string): Promise<SearchHit[]>
}

export interface Repositories {
  schedule: ScheduleRepository
  projects: ProjectRepository
  seminars: SeminarRepository
  stats: StatsRepository
  previews: PreviewRepository
  reviews: ReviewRepository
  search: SearchService
}
