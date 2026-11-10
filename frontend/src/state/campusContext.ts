import { createContext, type Dispatch } from 'react'
import { initialCampusState, type CampusAction, type CampusState } from './campusReducer'

/** 상태와 바꾸는 함수를 나눠 둔다: 바꾸기만 하는 컴포넌트는 상태가 바뀌어도 다시 그려지지 않는다 */
export const CampusStateContext = createContext<CampusState>(initialCampusState)
export const CampusDispatchContext = createContext<Dispatch<CampusAction>>(() => {})
