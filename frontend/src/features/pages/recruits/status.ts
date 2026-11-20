import { applyTarget, type RecruitStatus } from '@/content/recruitingStatus'
import { ddayLabel, monthDay, weekday } from '@/lib/date'

/**
 * 지원 안내 머리(모집 상태)의 문구. 상태는 content/recruitingStatus.ts 가 날짜로 정하고, 여기서는 말로 바꾼다.
 * recruits.test.ts 에 테스트.
 *
 * | 상태 | 제목 | 주 버튼 |
 * |---|---|---|
 * | unscheduled | 5기 모집은 아직 열리지 않았습니다 | 5기 소식 받기 (인스타그램) |
 * | soon | 5기 모집은 08.20에 열립니다 (+ D-n) | 5기 소식 받기 |
 * | open | 5기 모집 중 · 09.05 마감 (+ D-n) | 지원서 쓰기 (갈 곳이 없으면 5기 소식 받기, applyTarget) |
 * | ended | 5기 모집이 마감됐습니다 | 5기 소식 받기 |
 *
 * 문장 안 날짜는 '09.05(일)' 처럼 요일을 괄호에 넣는다.
 */
export interface StatusView {
  title: string
  /** 제목 뒷부분 ('09.05 마감'). 넓은 화면에서는 다음 줄, 폰에서는 ' · ' 로 이어 붙인다 */
  titleSub?: string
  /** 리드 문장 (한 문장에 한 줄) */
  lines: string[]
  /** 'D-5' · 'D-day'. soon 은 열리는 날까지, open 은 마감일까지 */
  dday?: { label: string; what: string }
  /** 주 버튼: 지원서 쓰기(apply) 또는 5기 소식 받기(channel) */
  primary: 'apply' | 'channel'
}

/** '08.20' · 올해가 아니면 '2027.08.20' */
const md = (ymd: string, today: string) => (ymd.slice(0, 4) === today.slice(0, 4) ? monthDay(ymd) : `${ymd.slice(0, 4)}.${monthDay(ymd)}`)
/** '08.20(목)'. 문장 안에서는 요일을 괄호에 넣는다 ('10.25 일까지' 가 25일로 읽히지 않게) */
const mdw = (ymd: string, today: string) => `${md(ymd, today)}(${weekday(ymd)})`

export function statusView(st: RecruitStatus, today: string, handle: string, live?: boolean): StatusView {
  const gen = st.generation
  const canApply = Boolean(applyTarget(st, live))
  const notice = `열리면 인스타그램 ${handle}에 알립니다.`
  switch (st.state) {
    case 'soon': {
      const opens = st.opensAt!
      return {
        title: `${gen}기 모집은 ${md(opens, today)}에 열립니다`,
        lines: [st.deadline ? `${mdw(opens, today)}부터 ${mdw(st.deadline, today)}까지 지원서를 받습니다.` : `${mdw(opens, today)}부터 지원서를 받습니다.`, `열리는 날 인스타그램 ${handle}에도 알립니다.`],
        dday: { label: ddayLabel(opens, today), what: '열리기까지' },
        primary: 'channel',
      }
    }
    case 'open':
      return {
        title: `${gen}기 모집 중`,
        titleSub: st.deadline ? `${md(st.deadline, today)} 마감` : undefined,
        lines: [
          st.deadline ? `${mdw(st.deadline, today)}까지 지원서를 받습니다.` : '지금 지원서를 받고 있습니다.',
          // 지원서 주소를 아직 적지 않았으면 공지로 보낸다 (주소를 지어내지 않는다)
          ...(canApply ? [] : [`지원 방법은 인스타그램 ${handle}의 모집 공지에 있습니다.`]),
        ],
        dday: st.deadline ? { label: ddayLabel(st.deadline, today), what: '마감까지' } : undefined,
        primary: canApply ? 'apply' : 'channel',
      }
    case 'ended':
      return {
        title: `${gen}기 모집이 마감됐습니다`,
        lines: [st.deadline ? `${mdw(st.deadline, today)}에 지원서 접수를 마쳤습니다.` : '지원서 접수를 마쳤습니다.', `결과와 다음 소식은 인스타그램 ${handle}에 올립니다.`],
        primary: 'channel',
      }
    default:
      return {
        title: `${gen}기 모집은 아직 열리지 않았습니다`,
        lines: [...(st.lastGeneration && st.lastWindow ? [`지난 ${st.lastGeneration}기는 ${st.lastWindow}에 모집했습니다.`] : []), notice],
        primary: 'channel',
      }
  }
}
