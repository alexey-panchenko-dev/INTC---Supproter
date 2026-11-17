import { RouterProvider } from 'react-router-dom'
import { router } from './providers/router'
import './styles/index.css'

export function App() {
  return <RouterProvider router={router} />
}
