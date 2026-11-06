import { describe, expect, it } from 'vitest'
import { basisLabel, dateLabel, dotMonth, hostOf, isUrl, spanDays } from './format'

const TODAY = '2026-10-17'

describe('dateLabel', () => {
  it('올해 하루는 연도 없이 월.일 요일', () => {
    expect(dateLabel('2026-10-13', undefined, TODAY)).toBe('10.13 화')
    expect(dateLabel('2026-01-01', null, TODAY)).toBe('01.01 목')
  })

  it('올해가 아닌 하루는 앞에 연도', () => {
    expect(dateLabel('2025-11-06', undefined, TODAY)).toBe('2025.11.06 목')
    expect(dateLabel('2027-01-30', undefined, TODAY)).toBe('2027.01.30 토')
  })

  it('끝날이 시작과 같으면 하루로 본다', () => {
    expect(dateLabel('2026-10-27', '2026-10-27', TODAY)).toBe('10.27 화')
  })

  it('올해 기간은 양 끝에 요일', () => {
    expect(dateLabel('2026-08-18', '2026-08-31', TODAY)).toBe('08.18 화~08.31 월')
    expect(dateLabel('2026-10-31', '2026-11-02', TODAY)).toBe('10.31 토~11.02 월')
  })

  it('올해가 아닌 기간은 앞에만 연도', () => {
    expect(dateLabel('2027-01-30', '2027-01-31', TODAY)).toBe('2027.01.30 토~01.31 일')
    expect(dateLabel('2025-07-01', '2025-07-26', TODAY)).toBe('2025.07.01 화~07.26 토')
  })

  it('해를 넘는 기간은 양쪽 모두 연도, 요일 없이', () => {
    expect(dateLabel('2026-12-31', '2027-01-01', TODAY)).toBe('2026.12.31~2027.01.01')
    expect(dateLabel('2025-12-30', '2026-01-02', TODAY)).toBe('2025.12.30~2026.01.02')
  })

  it('기준이 되는 오늘의 해가 바뀌면 표기도 바뀐다', () => {
    expect(dateLabel('2026-10-13', undefined, '2027-01-02')).toBe('2026.10.13 화')
    expect(dateLabel('2027-01-30', '2027-01-31', '2027-01-02')).toBe('01.30 토~01.31 일')
  })
})

describe('기간', () => {
  it('달 단위 기간', () => {
    expect(dotMonth('2026-09')).toBe('2026.09')
    expect(dotMonth('2026-09-15')).toBe('2026.09')
  })

  it('날 수는 양 끝을 넣어 센다', () => {
    expect(spanDays('2026-08-18', '2026-08-31')).toBe(14)
    expect(spanDays('2026-09-15', '2026-09-15')).toBe(1)
  })
})

describe('출처', () => {
  it('주소만 주소로 본다', () => {
    expect(isUrl('https://gdg.community.dev/x/')).toBe(true)
    expect(isUrl('4기 운영 계획')).toBe(false)
    expect(isUrl(undefined)).toBe(false)
  })

  it('주소는 도메인만 남긴다', () => {
    expect(hostOf('https://www.instagram.com/gdg.donggukuniv/')).toBe('instagram.com')
    expect(hostOf('not a url')).toBe('not a url')
  })

  it('기준 문구는 같은 출처를 한 번만, 많으면 줄인다', () => {
    expect(basisLabel([])).toBeNull()
    expect(basisLabel([undefined, ''])).toBeNull()
    expect(basisLabel(['https://gdg.community.dev/a/', 'https://gdg.community.dev/b/'])).toBe('gdg.community.dev')
    expect(basisLabel(['https://gdg.community.dev/a/', '4기 운영 계획'])).toBe('gdg.community.dev, 4기 운영 계획')
    expect(basisLabel(['https://github.com/x', 'https://gdg.community.dev/', '4기 운영 계획'])).toBe('github.com, gdg.community.dev 외')
  })
})
