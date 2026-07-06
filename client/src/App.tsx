import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import MainLayout from '@components/layout/MainLayout'
import { RefreshProvider } from '@components/layout/RefreshContext'
import { ProtectedRoute, AdminRoute } from '@components/auth/ProtectedRoute'
import { useAuthStore } from '@stores/authStore'
import Login from '@pages/Login'
import Dashboard from '@pages/Dashboard'
import ChannelAnalysis from '@pages/ChannelAnalysis'
import DataManagement from '@pages/DataManagement'
import MerchantDataManagement from '@pages/MerchantDataManagement'
import MerchantAnalysis from '@pages/MerchantAnalysis'
import Schedule from '@pages/Schedule'
import AIReportHistory from '@pages/AIReportHistory'
import UserManagement from '@pages/UserManagement'

function AppInit() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage)

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  return (
    <BrowserRouter>
      <RefreshProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Outlet />
                </MainLayout>
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/channel-analysis" element={<ChannelAnalysis />} />
            <Route path="/data-management" element={<DataManagement />} />
            <Route
              path="/merchant-data"
              element={
                <AdminRoute>
                  <MerchantDataManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/merchant-analysis"
              element={
                <AdminRoute>
                  <MerchantAnalysis />
                </AdminRoute>
              }
            />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/ai-reports" element={<AIReportHistory />} />
            <Route
              path="/user-management"
              element={
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              }
            />
          </Route>
        </Routes>
      </RefreshProvider>
    </BrowserRouter>
  )
}

export default AppInit
