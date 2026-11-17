import { RouterProvider } from 'react-router-dom'
import { SessionProvider } from '@/entities/session'
import { router } from './providers/router'
import './styles/index.css'

export function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  )
}
