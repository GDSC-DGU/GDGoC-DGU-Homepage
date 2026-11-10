import type { CSSProperties } from 'react'
import type { Project, ProjectImage } from '@/domain/types'
import { assetUrl, languageSegments, languageSummary, monogram, monthSpan, projectCover, type LanguageSegment } from './exhibit'
import c from './plate.module.css'

/** 막대 조각 색: 먹색 단계 (색은 '어디'만 뜻하므로 언어마다 색을 주지 않는다). 기타는 가장 옅게 */
const TONES = ['var(--ink-900)', 'var(--ink-500)', 'var(--line-strong)']
const tone = (s: LanguageSegment, i: number) => (s.rest ? 'var(--line)' : TONES[Math.min(i, TONES.length - 1)])

/** GitHub 언어 비율 막대. legend: 아래에 이름 · % 를 적는다 (limit 개까지) */
export function LanguageBar({ segments, legend = true, limit, className = '' }: { segments: LanguageSegment[]; legend?: boolean; limit?: number; className?: string }) {
  if (segments.length === 0) return null
  const shown = limit ? segments.filter((s) => !s.rest).slice(0, limit) : segments
  return (
    <div className={`${c.lang} ${className}`}>
      <span className={c.langBar} role="img" aria-label={languageSummary(segments)}>
        {segments.map((s, i) => (
          <span key={s.name} style={{ flexGrow: s.share, background: tone(s, i) } as CSSProperties} />
        ))}
      </span>
      {legend && (
        <ul className={c.langLegend} aria-hidden="true" data-part="legend">
          {shown.map((s, i) => (
            <li key={s.name}>
              <i style={{ background: tone(s, i) }} />
              {s.name} <span className="num">{s.share}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * 글자 표지: 그림이 없는 프로젝트. 실제 데이터만으로 그린다 (이름 · 만든 때 · 저장소 언어 비율).
 * 화면 캡처처럼 보이지 않게 창 · 버튼 모양은 그리지 않는다.
 */
function TypeCover({ project }: { project: Project }) {
  const span = monthSpan(project.firstCommit, project.lastCommit) ?? String(project.year)
  const segs = languageSegments(project.languages)
  const long = project.name.length > 14
  const mono = monogram(project.name)
  return (
    <div className={c.type} aria-hidden="true" data-part="type">
      <p className={`${c.typeName} ${long ? c.typeLong : ''}`} data-part="name">
        {project.name}
      </p>
      {/* 작은 아이콘 표지에서만 보인다 (이름 대신 머리글자. data-len 으로 글자 수에 맞춰 크기를 줄인다) */}
      <p className={c.typeMono} data-part="mono" data-len={Math.min(5, [...mono].length)}>
        {mono}
      </p>
      <div className={c.typeFoot} data-part="foot">
        <p className={`${c.typeSpan} num`} data-part="span">
          {span}
        </p>
        <LanguageBar segments={segs} limit={2} />
      </div>
    </div>
  )
}

/**
 * 표지 한 장: 그림(화면 캡처 · 소개 이미지 · 로고)이 있으면 그림, 없으면 글자 표지.
 * 1px 괘선 틀 · radius 20, 그림자 없음. 로고 · 아이콘은 흰 판 가운데에 놓는다 (회색 자리 표시 칸처럼 보이지 않게).
 */
export function Plate({
  project,
  image,
  className = '',
  eager = false,
  sizes,
}: {
  project: Project
  /** 다른 그림을 표지로 (없으면 project.cover) */
  image?: ProjectImage
  className?: string
  eager?: boolean
  sizes?: string
}) {
  const img = image ?? projectCover(project)
  const kind = img ? img.kind : 'type'
  // 가로로 긴 글자 로고(Bravication · InGlo · Wave)는 작은 표지에서 더 넓게 쓴다
  const wide = img && img.kind === 'logo' && img.width / img.height > 2.2
  return (
    <div className={`${c.plate} ${className}`} data-kind={kind} data-wide={wide || undefined}>
      {img ? (
        <img src={assetUrl(img.src)} alt={img.alt} width={img.width} height={img.height} loading={eager ? 'eager' : 'lazy'} decoding="async" sizes={sizes} />
      ) : (
        <TypeCover project={project} />
      )}
    </div>
  )
}
