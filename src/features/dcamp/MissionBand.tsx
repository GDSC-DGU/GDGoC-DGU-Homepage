import type { ReactNode } from 'react'
import { PHOTOS } from '@/content'
import { assetUrl } from '@/features/pages/projects/exhibit'
import s from './mission.module.css'

/**
 * 사진 한 면 + 한 문장 (dcamp 'Mission'): 화면 폭 가득 행사 사진, 아래로 갈수록 검정.
 * 사진 아래쪽에 두 칸 — 왼쪽 영문 이름표 | 오른쪽 흰 큰 문장 + 주황 영문 한 줄.
 * 사진은 스크롤하는 동안 화면에 머문다 (sticky). 움직임 줄이기 설정이면 그냥 한 면.
 */
export function MissionBand({ photoId, label, statement, en }: { photoId: string; label: string; statement: ReactNode; en?: string }) {
  const photo = PHOTOS.find((p) => p.id === photoId)
  return (
    <section className={`on-dark ${s.band}`} data-band="dark" aria-labelledby="mission-title">
      <div className={s.sticky}>
        {photo && <img className={s.img} src={photo.src.startsWith('https://') ? photo.src : assetUrl(photo.src)} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" />}
        <div className={s.shade} aria-hidden="true" />
        <div className={`container ${s.text}`}>
          <h2 id="mission-title" className={s.label} lang="en">
            {label}
          </h2>
          <div>
            <p className={s.statement}>{statement}</p>
            {en && (
              <p className={s.en} lang="en">
                {en}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
