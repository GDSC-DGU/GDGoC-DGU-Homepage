import { Fragment } from 'react'
import type { TermId } from '@/content/glossary'
import { Term } from '@/features/glossary/Term'
import { keepHyphenated } from '@/lib/text'
import { splitTerms, tailTerms } from './terms'

/**
 * 일정 이름 속 용어를 그 자리에서 풀어 쓴다: 'G-Sprint 중간 발표' → 'G-Sprint(한 학기 팀 프로젝트) 중간 발표'.
 * terms 는 이 자리에서 처음 나오는 용어만 (terms.ts firstMentions). 비어 있으면 글자 그대로.
 * 'G-Sprint' 같은 하이픈 낱말은 하이픈에서 줄이 바뀌지 않게 한다 (lib/text keepHyphenated).
 * 영문 낱말 중간에 걸린 용어('Gemini Study Jams')는 낱말을 자르지 않고, tail 이면 이름 뒤에 ' · Study Jam(풀이)' 를 붙인다.
 */
export function TermText({ text, terms, tail = true }: { text: string; terms?: readonly TermId[]; tail?: boolean }) {
  if (!terms || terms.length === 0) return <>{keepHyphenated(text)}</>
  const parts = splitTerms(text, terms)
  return (
    <>
      {parts.map((p, i) => ('id' in p && p.whole ? <Term key={i} id={p.id} suffix={p.suffix} /> : <Fragment key={i}>{keepHyphenated(p.text)}</Fragment>))}
      {tail &&
        tailTerms(text, terms).map((id) => (
          <Fragment key={id}>
            {' · '}
            <Term id={id} />
          </Fragment>
        ))}
    </>
  )
}
