import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/useAuth.js';
import { PublicLayout } from './components/layout/PublicLayout.js';
import { DashboardLayout } from './components/layout/DashboardLayout.js';
import { ProtectedRoute } from './components/layout/ProtectedRoute.js';
import { GuestRoute } from './components/layout/GuestRoute.js';

// Public pages
import { HomePage } from './pages/public/HomePage.js';
import { FeaturesPage } from './pages/public/FeaturesPage.js';
import { SolutionsPage } from './pages/public/SolutionsPage.js';
import { AboutPage } from './pages/public/AboutPage.js';
import { ContactPage } from './pages/public/ContactPage.js';

// Auth pages
import { LoginPage } from './pages/auth/LoginPage.js';
import { SsoLoginPage } from './pages/auth/SsoLoginPage.js';
import { AuthCallbackPage } from './pages/auth/AuthCallbackPage.js';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage.js';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage.js';

// Dashboard pages
import { OverviewPage } from './pages/dashboard/OverviewPage.js';
import { OrganizationPage } from './pages/dashboard/OrganizationPage.js';
import { MembersPage } from './pages/dashboard/MembersPage.js';
import { SsoPage } from './pages/dashboard/SsoPage.js';
import { SecurityPage } from './pages/dashboard/SecurityPage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30 seconds
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Marketing & Auth Pages */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/solutions" element={<SolutionsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />

              {/* Guest-only Auth Pages */}
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/login/sso" element={<SsoLoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
              </Route>
            </Route>

            {/* SSO Callback (Direct Route) */}
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* Authenticated Dashboard Pages */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<OverviewPage />} />
                <Route path="/dashboard/organization" element={<OrganizationPage />} />
                <Route path="/dashboard/members" element={<MembersPage />} />
                <Route path="/dashboard/sso" element={<SsoPage />} />
                <Route path="/dashboard/security" element={<SecurityPage />} />
              </Route>
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
