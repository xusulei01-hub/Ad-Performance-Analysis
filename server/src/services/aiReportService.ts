import { prisma } from '../lib/prisma'

const MAX_REPORT_COUNT = 100

export async function createReport(data: {
  title: string
  type: string
  analysis: string
  dataSnapshot?: string | null
}) {
  const count = await prisma.aiReport.count()

  if (count >= MAX_REPORT_COUNT) {
    const error = new Error('报告数量已达上限（100条），请删除旧报告后再保存')
    ;(error as any).statusCode = 429
    throw error
  }

  const report = await prisma.aiReport.create({
    data: {
      title: data.title,
      type: data.type,
      analysis: data.analysis,
      dataSnapshot: data.dataSnapshot ?? null,
    },
  })

  const warning = count >= MAX_REPORT_COUNT * 0.8
    ? `报告数量已接近上限（${count + 1}/100），建议清理旧报告`
    : undefined

  return { report, warning }
}

export async function listReports(type?: string) {
  const where: any = {}
  if (type) where.type = type

  const reports = await prisma.aiReport.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return reports
}

export async function getReport(id: number) {
  return prisma.aiReport.findUnique({ where: { id } })
}

export async function deleteReport(id: number) {
  await prisma.aiReport.delete({ where: { id } })
}

export async function getStorageStats() {
  const totalCount = await prisma.aiReport.count()
  const reports = await prisma.aiReport.findMany({
    select: { analysis: true, dataSnapshot: true, title: true },
  })

  const totalChars = reports.reduce(
    (sum, r) => sum + r.analysis.length + (r.dataSnapshot?.length || 0) + r.title.length,
    0,
  )

  // 估算大小：UTF-8 中文约 3 字节/字符
  const estimatedKb = Math.round(totalChars * 3 / 1024)

  return { totalCount, totalChars, estimatedKb }
}
