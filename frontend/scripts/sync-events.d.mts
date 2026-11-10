/** sync-events.mjs 의 타입 (src/content/syncEvents.test.ts 가 가져다 쓴다) */
import type { EventKind, PlaceId, ScheduleEvent } from '../src/domain/types'

export declare const CHAPTER_ID: number
export declare const API_BASE: string
export declare const STATUSES: string[]

export declare function toKstDate(value: unknown): string | undefined
export declare function kstToday(now?: Date): string
export declare function guessGeneration(ymd: string): number | undefined
export declare function classify(title: string): { kind: EventKind; place: PlaceId }
export declare function koreanTitle(original: string): string
export declare function seriesOf(title: string): string | undefined
export declare function idFromUrl(url: string): string | undefined
export declare function normUrl(url: string): string
export declare function mapBevyEvent(raw: unknown): ScheduleEvent | null
export declare function isCommunityDevSource(e: Pick<ScheduleEvent, 'source'>): boolean
export declare function sortEvents<T extends Pick<ScheduleEvent, 'date'>>(events: readonly T[]): T[]

export interface MergeResult {
  events: ScheduleEvent[]
  added: string[]
  updated: string[]
  promoted: string[]
  removed: string[]
}
export declare function mergeEvents(existing: readonly ScheduleEvent[], fetched: readonly ScheduleEvent[], options?: { prune?: boolean }): MergeResult

export declare function formatEvent(e: object): string
export declare function formatEventsJson(doc: { events: readonly object[] } & Record<string, unknown>): string
export declare function main(argv?: string[], fetchImpl?: typeof fetch): Promise<unknown>
