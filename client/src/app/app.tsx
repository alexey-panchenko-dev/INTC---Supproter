import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ApplicationsPage } from '@/pages/applications'
import { ChatPage } from '@/pages/chat'
import { DocumentsPage } from '@/pages/documents'
import { HomePage } from '@/pages/home'
import { NotFoundPage } from '@/pages/not-found'
import { SchedulePage } from '@/pages/schedule'
import { PortalLayout } from '@/widgets/portal-layout'
import { AccessGuard } from '@/features/access-guard'
import './styles/index.css'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PortalLayout />}>
          <Route index element={<HomePage />} />
          <Route
            path="schedule"
            element={
              <AccessGuard>
                <SchedulePage />
              </AccessGuard>
            }
          />
          <Route
            path="documents"
            element={
              <AccessGuard>
                <DocumentsPage />
              </AccessGuard>
            }
          />
          <Route
            path="applications"
            element={
              <AccessGuard>
                <ApplicationsPage />
              </AccessGuard>
            }
          />
          <Route
            path="chat"
            element={
              <AccessGuard>
                <ChatPage />
              </AccessGuard>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
