import { useEffect, useRef, useState } from 'react'
import { shareUrl } from './share'
import k from './recruit.module.css'

type Result = { kind: 'copied' | 'failed'; url: string } | null

/**
 * '친구에게 알려 주기': 휴대폰 공유 창(Web Share API)이 있으면 그것을, 없으면 주소를 복사하고 그 자리에 확인 문구를 띄운다.
 * 복사도 막혀 있으면 주소를 그대로 보여 준다. 모양은 className 으로 (지원 안내 머리: 두 번째 버튼 .btn-secondary, 기본: 밑줄 링크).
 * <p> 안에도 넣을 수 있게 span · button 만 쓴다.
 */
export function ShareAction({ title, text, label = '친구에게 알려 주기', className = 'link' }: { title: string; text: string; label?: string; className?: string }) {
  const [result, setResult] = useState<Result>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onClick = async () => {
    window.clearTimeout(timer.current)
    setResult(null)
    const url = shareUrl(window.location)
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url })
        return
      } catch (e) {
        // 사람이 공유 창을 닫은 것은 실패가 아니다. 그 밖의 오류는 복사로 넘어간다
        if (e instanceof DOMException && e.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setResult({ kind: 'copied', url })
      timer.current = window.setTimeout(() => setResult(null), 6000)
    } catch {
      setResult({ kind: 'failed', url })
    }
  }

  return (
    <span className={k.share}>
      <button type="button" className={`${className} ${k.shareButton}`} onClick={onClick}>
        {label}
      </button>
      <span className={k.shareStatus} role="status" data-kind={result?.kind}>
        {result?.kind === 'copied' && (
          <span key="copied" className="fade-in">
            링크를 복사했습니다. 친구에게 붙여 넣어 보내 주세요.
          </span>
        )}
        {result?.kind === 'failed' && (
          <span key="failed" className="fade-in">
            복사하지 못했습니다. 이 주소를 보내 주세요: <span className={k.shareUrl}>{result.url}</span>
          </span>
        )}
      </span>
    </span>
  )
}
