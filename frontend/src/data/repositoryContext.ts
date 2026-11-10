import { createContext } from 'react'
import type { Repositories } from './repositories'

export const RepositoryContext = createContext<Repositories | null>(null)
