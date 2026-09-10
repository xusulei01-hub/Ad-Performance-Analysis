/** 每账户收益（元） */
export const REVENUE_PER_ACCOUNT = 3100

/** 正式环境渠道主清单（转化表口径全集；新渠道数据上传后仍会自动并入动态列表） */
export const MASTER_CHANNELS = [
  'apple', 'baidusearch', 'harmonymarket', 'huawei', 'huaweiads', 'kwai', 'mi',
  'oppo', 'oppoinfo', 'rednote', 'rongyao', 'vivo', 'vivofeed', 'wangyi',
  'weibo', 'ximalaya', 'youngcrowd',
]

/** 每个期商留资的估算获客成本（元） */
export const COST_PER_MERCHANT_LEAD = 1000

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
