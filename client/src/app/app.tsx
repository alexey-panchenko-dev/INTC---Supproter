import { RouterProvider } from 'react-router-dom'
import { SessionProvider } from '@/entities/session'
import { LanguageProvider } from '@/shared/i18n'
import { router } from './providers/router'
import './styles/index.css'

export function App() {
  return (
    <LanguageProvider>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </LanguageProvider>
  )
}
