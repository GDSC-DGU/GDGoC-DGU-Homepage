import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { RepositoryProvider } from '@/data/RepositoryProvider'
import { CampusProvider } from '@/state/CampusProvider'
import '@/styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RepositoryProvider>
      <CampusProvider>
        <RouterProvider router={router} />
      </CampusProvider>
    </RepositoryProvider>
  </StrictMode>,
)
