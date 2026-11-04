import { FAQS, PUBLIC_PROJECTS } from '@/content'
import type { Project } from '@/domain/types'
import { IconRow, projectIcon } from '@/features/common'
import type { Fact } from './eligibility'
import { Note } from './Notes'
import { PARTS, partExamples } from './parts'
import k from './recruit.module.css'

const faq = (id: string) => FAQS.find((f) => f.id === id)

const EXAMPLES = partExamples(PUBLIC_PROJECTS, PARTS)

/** 아이콘 줄에는 실제 로고 · 앱 아이콘만 (화면 캡처 · 소개 그림은 40px 에서 알아볼 수 없다) */
const iconOf = (p: Project) => (p.cover?.kind === 'logo' ? projectIcon(p) : null)

/**
 * 네 파트 (시안 E): 2 × 2 흰 판. 판마다 파트 이름(28) → 맡는 일 → 화요일 세션에서 비교하는 것 → 지난 프로젝트 실제 아이콘 줄.
 * 아이콘은 공통 IconRow 작은 크기(40px + 이름)이고, 누르면 그 프로젝트 자세히 보기(/archive?p=id).
 * 지난 예가 없는 파트(Product Design)는 아이콘 줄 없이 둔다 (지어내지도, '없다' 고 적지도 않는다).
 * 폰은 한 칸씩.
 */
export function Parts() {
  if (!faq('parts')) return null
  const anyExamples = PARTS.some((p) => EXAMPLES[p.id])
  return (
    <>
      <ul className={k.parts} aria-label="파트">
        {PARTS.map((part) => {
          const ex = EXAMPLES[part.id]
          const icons = ex ? ex.shown.map(iconOf) : []
          return (
            <li key={part.id} className={k.part}>
              <h3 className={k.partName} lang="en">
                {part.name}
              </h3>
              <p className={k.partRole}>{part.role}</p>
              <dl className={k.partFacts}>
                <div>
                  <dt>화요일 세션에서 비교하는 것</dt>
                  <dd className={k.partCompare}>{part.compare}</dd>
                </div>
                {icons.some(Boolean) && (
                  <div>
                    <dt>지난 프로젝트</dt>
                    <dd className={k.partIcons}>
                      <IconRow label={`${part.name} 파트가 맡는 기술을 쓴 지난 프로젝트`} items={icons} size="small" />
                    </dd>
                  </div>
                )}
              </dl>
            </li>
          )
        })}
      </ul>
      {anyExamples && <Note>지난 프로젝트는 GitHub 저장소 README에 적힌 기술로 골랐습니다.</Note>}
    </>
  )
}

/** 흰 판 세 장: 작은 이름 → 값(28/38) → 풀이. 옅은 회색 면 위에 놓는다 */
export function Eligibility({ facts }: { facts: readonly Fact[] }) {
  return (
    <dl className={k.who}>
      {facts.map((f) => (
        <div key={f.id} className={k.whoCard}>
          <dt className={k.whoLabel}>{f.label}</dt>
          <dd className={k.whoValue}>{f.value}</dd>
          {f.sub && <dd className={k.whoSub}>{f.sub}</dd>}
        </div>
      ))}
    </dl>
  )
}
