/** 每账户收益（元） */
export const REVENUE_PER_ACCOUNT = 3100

/** 文件上传大小限制（50MB） */
export const FILE_SIZE_LIMIT = 50 * 1024 * 1024

/** 分页默认值 */
export const PAGE_SIZES = {
  DEFAULT: 50,
  UPLOAD_LOGS: 20,
  MAX: 500,
  TARGETS_MAX: 100,
} as const

/** 目标管理默认值 */
export const DEFAULT_TARGETS = {
  weekly: {
    targetCost: 1000000,
    targetActivations: 8000,
    targetAccounts: 5000,
    targetRoi: 1.5,
  },
  monthly: {
    targetCost: 5000000,
    targetActivations: 40000,
    targetAccounts: 25000,
    targetRoi: 1.5,
  },
} as const
