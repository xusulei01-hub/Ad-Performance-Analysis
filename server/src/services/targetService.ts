import dayjs from 'dayjs'
import { prisma } from '../lib/prisma'
import { getWeekRange } from '../utils/date'
import { parsePagination } from '../utils/pagination'
import { PAGE_SIZES, DEFAULT_TARGETS } from '../constants'

/** 获取当前周期目标，找不到则返回 null */
export async function getCurrentTarget(periodType: 'weekly' | 'monthly') {
  const now = dayjs()

  let periodStart: dayjs.Dayjs
  if (periodType === 'weekly') {
    const { startOfWeek } = getWeekRange(now)
    periodStart = startOfWeek
  } else {
    periodStart = now.startOf('month')
  }

  const target = await prisma.target.findFirst({
    where: {
      periodType,
      periodStart: { gte: periodStart.toDate(), lte: periodStart.endOf('day').toDate() },
    },
  })

  return target
}

/** 列表查询目标 */
export async function listTargets(params: { periodType?: string; page?: number; pageSize?: number }) {
  const { page, pageSize, skip } = parsePagination(
    { page: params.page, page_size: params.pageSize },
    PAGE_SIZES.DEFAULT,
    PAGE_SIZES.TARGETS_MAX,
  )

  const where: any = {}
  if (params.periodType) where.periodType = params.periodType

  const [total, targets] = await Promise.all([
    prisma.target.count({ where }),
    prisma.target.findMany({
      where,
      orderBy: { periodStart: 'desc' },
      skip,
      take: pageSize,
    }),
  ])

  return { total, page, pageSize, targets }
}

/** 获取当前周期目标（含默认值兜底） */
export async function getCurrentTargetWithDefaults(periodType: 'weekly' | 'monthly') {
  const target = await getCurrentTarget(periodType)
  const defaults = DEFAULT_TARGETS[periodType]

  return {
    periodType,
    configured: !!target,
    targets: target
      ? {
          targetCost: target.targetCost,
          targetActivations: target.targetActivations,
          targetAccounts: target.targetAccounts,
          targetRoi: target.targetRoi,
        }
      : defaults,
  }
}

/** 创建或更新目标 */
export async function createOrUpdateTarget(data: {
  periodType: string
  periodStart: string
  periodEnd: string
  targetCost?: number
  targetActivations?: number
  targetAccounts?: number
  targetRoi?: number
}) {
  const start = dayjs(data.periodStart).startOf('day').toDate()
  const end = dayjs(data.periodEnd).endOf('day').toDate()

  const existing = await prisma.target.findFirst({
    where: { periodType: data.periodType, periodStart: { gte: start, lte: dayjs(start).endOf('day').toDate() } },
  })

  if (existing) {
    return prisma.target.update({
      where: { id: existing.id },
      data: {
        periodEnd: end,
        targetCost: Number(data.targetCost) || 0,
        targetActivations: Number(data.targetActivations) || 0,
        targetAccounts: Number(data.targetAccounts) || 0,
        targetRoi: Number(data.targetRoi) || 0,
      },
    })
  }

  return prisma.target.create({
    data: {
      periodType: data.periodType,
      periodStart: start,
      periodEnd: end,
      targetCost: Number(data.targetCost) || 0,
      targetActivations: Number(data.targetActivations) || 0,
      targetAccounts: Number(data.targetAccounts) || 0,
      targetRoi: Number(data.targetRoi) || 0,
    },
  })
}

/** 删除目标 */
export async function deleteTarget(id: number) {
  await prisma.target.delete({ where: { id } })
}
