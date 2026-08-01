import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { SiteLayout } from '@/components/layout/site-layout'
import { Skeleton } from '@/components/ui/skeleton'
import type { UserRole } from '@/types/api'
import { accountDestination } from '@/lib/session'

const HomePage = lazy(() => import('@/pages/home-page').then((module) => ({ default: module.HomePage })))
const LawyersPage = lazy(() => import('@/pages/lawyers-page').then((module) => ({ default: module.LawyersPage })))
const RankingsPage = lazy(() => import('@/pages/rankings-page').then((module) => ({ default: module.RankingsPage })))
const LawyerDetailPage = lazy(() => import('@/pages/lawyer-detail-page').then((module) => ({ default: module.LawyerDetailPage })))
const AuthPage = lazy(() => import('@/pages/auth-page').then((module) => ({ default: module.AuthPage })))
const ClientWorkspacePage = lazy(() => import('@/pages/client-workspace-page').then((module) => ({ default: module.ClientWorkspacePage })))
const LawyerDashboardPage = lazy(() => import('@/pages/lawyer-dashboard-page').then((module) => ({ default: module.LawyerDashboardPage })))
const LawyerOnboardingPage = lazy(() => import('@/pages/lawyer-onboarding-page').then((module) => ({ default: module.LawyerOnboardingPage })))
const VideoConsultationPage = lazy(() => import('@/pages/video-consultation-page').then((module) => ({ default: module.VideoConsultationPage })))
const NotFoundPage = lazy(() => import('@/pages/not-found-page').then((module) => ({ default: module.NotFoundPage })))
const UnsupportedAccountPage = lazy(() => import('@/pages/unsupported-account-page').then((module) => ({ default: module.UnsupportedAccountPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function ProtectedRoute({ children, role }: { children: React.ReactNode; role: Exclude<UserRole, 'admin'> }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (user.role !== role) {
    return <Navigate to={accountDestination(user.role)} replace />
  }

  return children
}

// Unlike ProtectedRoute above, this doesn't pin to one specific role — the
// video consultation page is used by both clients and lawyers on the same
// booking, and per-booking authorization already happens server-side in
// consultationController.getVideoToken. This wrapper only needs to keep
// out logged-out visitors and the (here, workspace-less) admin role.
function AuthenticatedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (user.role === 'admin') {
    return <Navigate to="/unsupported-account" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <SiteLayout>
      <Suspense fallback={<div className="mx-auto max-w-7xl space-y-5 px-4 py-12 sm:px-6 lg:px-8" aria-label="Loading page" aria-busy="true"><Skeleton className="h-5 w-28" /><Skeleton className="h-12 max-w-xl" /><Skeleton className="h-64 w-full" /></div>}>
        <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lawyers" element={<LawyersPage />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/lawyers/:lawyerId" element={<LawyerDetailPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/unsupported-account" element={<UnsupportedAccountPage />} />
        <Route
          path="/workspace/*"
          element={(
            <ProtectedRoute role="client">
              <ClientWorkspacePage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/lawyer/onboarding"
          element={(
            <ProtectedRoute role="lawyer">
              <LawyerOnboardingPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/lawyer/dashboard/*"
          element={(
            <ProtectedRoute role="lawyer">
              <LawyerDashboardPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/consultation/:bookingId/call"
          element={(
            <AuthenticatedRoute>
              <VideoConsultationPage />
            </AuthenticatedRoute>
          )}
        />
        <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </SiteLayout>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  )
}
