import { PHOTOS } from '@/content'
import type { EventPhoto } from '@/domain/types'
import { assetUrl } from '@/features/pages/projects/exhibit'
import { StorySection, type StoryTone } from './StorySection'
import s from './photoStrip.module.css'

const dot = (ymd: string) => ymd.replaceAll('-', '.')
const srcOf = (p: EventPhoto) => (p.src.startsWith('https://') ? p.src : assetUrl(p.src))

/**
 * 행사 사진 (AI 티 점검 2026-11-05: 사람이 있는 사진이 한 장도 없어 그림 · 글만으로는 동아리가 보이지 않는다).
 * content/photos.json 에 공개 동의가 기록된 사진이 있을 때만 그린다 (없으면 섹션째 없음). 최근 사진부터 limit 장.
 * 사진 아래 행사 이름 · 날짜 한 줄. 사진은 4:3 으로 잘라 한 줄에 맞춘다 (폰은 두 칸).
 */
export function PhotoStrip({ id = 'photos', limit = 4, tone = 'paper', photos = PHOTOS }: { id?: string; limit?: number; tone?: StoryTone; photos?: readonly EventPhoto[] }) {
  const shown = photos.slice(0, limit)
  if (shown.length === 0) return null
  return (
    <StorySection id={id} tone={tone} title="행사 사진">
      <ul className={s.grid}>
        {shown.map((p) => (
          <li key={p.id} className={s.item}>
            <figure className={s.figure}>
              <img className={s.img} src={srcOf(p)} alt={p.alt} width={p.width} height={p.height} loading="lazy" decoding="async" />
              <figcaption className={s.caption}>
                {p.event} · <time className="num" dateTime={p.date}>{dot(p.date)}</time>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </StorySection>
  )
}
