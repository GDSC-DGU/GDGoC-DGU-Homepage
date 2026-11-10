import { useReducer, type ReactNode } from 'react'
import { CampusDispatchContext, CampusStateContext } from './campusContext'
import { campusReducer, initialCampusState } from './campusReducer'

export function CampusProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(campusReducer, initialCampusState)
  return (
    <CampusDispatchContext.Provider value={dispatch}>
      <CampusStateContext.Provider value={state}>{children}</CampusStateContext.Provider>
    </CampusDispatchContext.Provider>
  )
}
