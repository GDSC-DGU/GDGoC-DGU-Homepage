import { SITE } from '@/config/site'
import { BrandMark } from './BrandMark'
import s from './layout.module.css'

/** 워드마크 + 지금 기수 태그. 공식 로고 파일이 오면 BrandMark 가 앞에 붙는다 */
export function Wordmark() {
  return (
    <>
      <BrandMark />
      <span className={s.wordmark} lang="en">
        {SITE.shortName}
      </span>
      <span className="gen-tag">{SITE.generation}</span>
    </>
  )
}
