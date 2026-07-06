import { useAuthStore } from '../stores/authStore'

export function usePermissions() {
  const { user, isAdmin } = useAuthStore()

  return {
    isAdmin,
    /** 是否可以看到某个指标字段 */
    canSeeField: (field: string) => {
      if (isAdmin) return true
      // leads, accounts 仅管理员可见
      if (field === 'leads' || field === 'accounts') return false
      return true
    },
    /** 是否可以看到期商模块 */
    canSeeMerchant: () => isAdmin,
    /** 是否可以上传（所有登录用户均可） */
    canUpload: () => !!user,
    /** 是否可以管理用户 */
    canManageUsers: () => isAdmin,
    /** 是否可以管理目标 */
    canManageTargets: () => isAdmin,
    /** 获取用户有权限的渠道列表 */
    getUserChannels: (): string[] => {
      if (isAdmin || !user?.permittedChannels) return []
      try {
        return JSON.parse(user.permittedChannels)
      } catch {
        return []
      }
    },
  }
}
