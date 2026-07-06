import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuthStore } from '../../stores/authStore'

interface ProtectedRouteProps {
  children: ReactNode
}

/** 需要登录才能访问 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { token, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

/** 仅管理员可访问 */
export function AdminRoute({ children }: ProtectedRouteProps) {
  const { isAdmin, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
