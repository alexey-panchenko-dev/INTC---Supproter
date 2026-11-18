import type { RouteObject } from 'react-router-dom'
import { AuthPage } from '@/pages/auth'
import { ApplicationsPage } from '@/pages/applications'
import { ChatPage } from '@/pages/chat'
import { DocumentsPage } from '@/pages/documents'
import { HomePage } from '@/pages/home'
import { NotFoundPage } from '@/pages/not-found'
import { ProfilePage } from '@/pages/profile'
import { SchedulePage } from '@/pages/schedule'
import { PortalLayout } from '@/widgets/portal-layout'
import { AccessGuard } from '@/features/access-guard'

export const routeConfig: RouteObject[] = [
  {
    path: '/',
    Component: PortalLayout,
    children: [
      { path: 'auth', Component: AuthPage },
      { index: true, Component: HomePage },
      {
        path: 'schedule',
        element: (
          <AccessGuard>
            <SchedulePage />
          </AccessGuard>
        ),
      },
      {
        path: 'documents',
        element: (
          <AccessGuard>
            <DocumentsPage />
          </AccessGuard>
        ),
      },
      {
        path: 'applications',
        element: (
          <AccessGuard>
            <ApplicationsPage />
          </AccessGuard>
        ),
      },
      {
        path: 'chat',
        element: (
          <AccessGuard>
            <ChatPage />
          </AccessGuard>
        ),
      },
      {
        path: 'profile',
        element: (
          <AccessGuard>
            <ProfilePage />
          </AccessGuard>
        ),
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
]
