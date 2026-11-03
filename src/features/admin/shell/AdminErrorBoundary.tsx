import { ADMIN_SAMPLE } from '../sample'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import s from './admin.module.css'

/**
 * 관리자 화면에서 그리다 오류가 나면 흰 화면 대신 안내 (2단계가 seed 모양을 바꾸다 옛 데이터와 어긋날 때가 많다).
 * '예시 데이터 처음으로'로 대개 풀린다. resetKey(주소)가 바뀌면 오류를 지우고 다시 그린다.
 */
export class AdminErrorBoundary extends Component<{ children: ReactNode; resetKey?: string; onResetData: () => Promise<void> | void }, { error: Error | null; key?: string }> {
  state: { error: Error | null; key?: string } = { error: null, key: this.props.resetKey }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  static getDerivedStateFromProps(props: { resetKey?: string }, state: { error: Error | null; key?: string }) {
    if (props.resetKey !== state.key) return { error: null, key: props.resetKey }
    return null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('[admin]', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className={s.error} role="alert">
        <h1 className={s.errorTitle}>화면을 그리지 못했습니다</h1>
        <p className={s.errorText}>{ADMIN_SAMPLE ? '예시 데이터가 꼬였을 수 있습니다. 예시 데이터를 처음으로 되돌리거나 새로고침해 주세요.' : '잠시 뒤 새로고침해 주세요. 계속되면 데이터를 처음 상태로 되돌려 주세요.'}</p>
        <p className={s.errorText}>
          <code>{this.state.error.message}</code>
        </p>
        <div className={s.errorActions}>
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={async () => {
              await this.props.onResetData()
              this.setState({ error: null })
            }}
          >
            {ADMIN_SAMPLE ? '예시 데이터 처음으로' : '데이터 처음 상태로'}
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => window.location.reload()}>
            새로고침
          </button>
          <a className="link" href={`${import.meta.env.BASE_URL}admin`}>
            대시보드로
          </a>
        </div>
      </div>
    )
  }
}
