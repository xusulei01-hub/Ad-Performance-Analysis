import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import crypto from 'crypto'
import dayjs from 'dayjs'
import { prisma } from '../lib/prisma'
import { toUtf8Filename } from '../utils/upload'
import { toEndOfDay } from '../utils/date'
import { calcRoi, calcCtr, calcCpa } from '../utils/formulas'

// 素材存储目录（server/uploads/creatives，不进 git）
export const CREATIVE_DIR = path.resolve(__dirname, '../../uploads/creatives')
const TMP_DIR = path.join(CREATIVE_DIR, 'tmp')
for (const dir of [CREATIVE_DIR, TMP_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']
const VIDEO_EXTS = ['.mp4', '.mov', '.webm', '.m4v']
const ZIP_EXTS = ['.zip']
const IMAGE_MAX = 10 * 1024 * 1024      // 10MB
const VIDEO_MAX = 200 * 1024 * 1024     // 200MB
const ZIP_MAX = 500 * 1024 * 1024       // 500MB
const ZIP_MAX_ENTRIES = 100             // 单个压缩包最多拆出 100 个素材

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg'

type MediaKind = 'image' | 'video'

function kindOfExt(ext: string): MediaKind | 'zip' | null {
  if (IMAGE_EXTS.includes(ext)) return 'image'
  if (VIDEO_EXTS.includes(ext)) return 'video'
  if (ZIP_EXTS.includes(ext)) return 'zip'
  return null
}

function randomName(ext: string) {
  return `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`
}

/** 视频压缩：转 H.264 mp4（CRF 28，最长边 1280），完成后替换原文件并将状态置为 pending */
function compressVideoAsync(creativeId: number, inputPath: string) {
  const outputPath = inputPath.replace(/\.[^.]+$/, '') + '_c.mp4'
  const args = [
    '-y', '-i', inputPath,
    '-c:v', 'libx264', '-crf', '28', '-preset', 'veryfast',
    '-vf', "scale='min(1280,iw)':-2",
    '-c:a', 'aac', '-b:a', '96k',
    '-movflags', '+faststart',
    outputPath,
  ]
  const child = spawn(FFMPEG, args, { stdio: 'ignore' })
  child.on('error', (err) => {
    console.error(`[creative] ffmpeg spawn failed (#${creativeId}):`, err.message)
    // 压缩不可用：保留原文件直接进入待审
    prisma.creative.update({ where: { id: creativeId }, data: { status: 'pending' } }).catch(() => {})
  })
  child.on('close', async (code) => {
    try {
      if (code === 0 && fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath)
        const newStored = path.basename(outputPath)
        await prisma.creative.update({
          where: { id: creativeId },
          data: { status: 'pending', storedName: newStored, fileSize: stats.size, mimeType: 'video/mp4' },
        })
        fs.unlink(inputPath, () => {})
      } else {
        // 压缩失败：保留原文件进入待审
        if (fs.existsSync(outputPath)) fs.unlink(outputPath, () => {})
        await prisma.creative.update({ where: { id: creativeId }, data: { status: 'pending' } })
      }
    } catch (e) {
      console.error(`[creative] compress finalize failed (#${creativeId}):`, e)
      prisma.creative.update({ where: { id: creativeId }, data: { status: 'pending' } }).catch(() => {})
    }
  })
}

interface UploadContext {
  userId: number
  channel: string
  campaignId?: string
  title?: string
}

/** 单个素材落库；视频进入 processing 并异步压缩 */
async function createCreative(ctx: UploadContext, kind: MediaKind, originalName: string, sourcePath: string, fileSize: number, mimeType: string) {
  const ext = kind === 'video' ? path.extname(originalName).toLowerCase() : path.extname(originalName).toLowerCase()
  const storedName = randomName(ext)
  const finalPath = path.join(CREATIVE_DIR, storedName)
  fs.renameSync(sourcePath, finalPath)

  const isVideo = kind === 'video'
  const creative = await prisma.creative.create({
    data: {
      userId: ctx.userId,
      channel: ctx.channel,
      mediaType: kind,
      filename: toUtf8Filename(originalName),
      storedName,
      fileSize,
      mimeType,
      title: ctx.title || null,
      status: isVideo ? 'processing' : 'pending',
      campaigns: ctx.campaignId
        ? { create: { channel: ctx.channel, campaignId: ctx.campaignId } }
        : undefined,
    },
  })

  if (isVideo) compressVideoAsync(creative.id, finalPath)
  return creative
}

/** 解压 zip，逐个素材落库 */
async function extractZip(ctx: UploadContext, zipPath: string) {
  // 动态引入，避免未用到时的开销
  const unzipper = await import('unzipper')
  const directory = await unzipper.Open.file(zipPath)
  let count = 0
  const skipped: string[] = []
  for (const entry of directory.files) {
    if (count >= ZIP_MAX_ENTRIES) break
    const entryName = entry.path
    const base = path.basename(entryName)
    // 跳过目录、macOS 垃圾文件、隐藏文件
    if (entry.type === 'Directory' || !base || base.startsWith('.') || entryName.includes('__MACOSX')) continue
    const ext = path.extname(base).toLowerCase()
    const kind = kindOfExt(ext)
    if (kind === 'image' || kind === 'video') {
      try {
        const buf = await entry.buffer()
        const max = kind === 'image' ? IMAGE_MAX : VIDEO_MAX
        if (buf.length > max) { skipped.push(base); continue }
        const tmpPath = path.join(TMP_DIR, randomName(ext))
        fs.writeFileSync(tmpPath, buf)
        try {
          await createCreative(ctx, kind, base, tmpPath, buf.length, kind === 'image' ? `image/${ext.slice(1)}` : `video/${ext.slice(1)}`)
          count++
        } catch (e) {
          fs.unlink(tmpPath, () => {})
          skipped.push(base)
          console.error(`[creative] zip entry create failed: ${base}`, e)
        }
      } catch (e) {
        skipped.push(base)
        console.error(`[creative] zip entry read failed: ${base}`, e)
      }
    } else {
      skipped.push(base)
    }
  }
  return { extracted: count, skipped }
}

/** 上传入口：支持多文件批量 + zip 解压拆分。返回创建结果摘要 */
export async function processCreativeUploads(files: Express.Multer.File[], ctx: UploadContext) {
  const results = { created: 0, videosProcessing: 0, zips: 0, zipExtracted: 0, rejected: [] as { filename: string; reason: string }[] }

  for (const file of files) {
    const originalName = toUtf8Filename(file.originalname)
    const ext = path.extname(originalName).toLowerCase()
    const kind = kindOfExt(ext)

    if (!kind) {
      fs.unlink(file.path, () => {})
      results.rejected.push({ filename: originalName, reason: '不支持的文件类型（仅支持图片/视频/zip）' })
      continue
    }
    if (kind === 'image' && file.size > IMAGE_MAX) {
      fs.unlink(file.path, () => {})
      results.rejected.push({ filename: originalName, reason: '图片超过 10MB 限制' })
      continue
    }
    if (kind === 'video' && file.size > VIDEO_MAX) {
      fs.unlink(file.path, () => {})
      results.rejected.push({ filename: originalName, reason: '视频超过 200MB 限制' })
      continue
    }
    if (kind === 'zip') {
      if (file.size > ZIP_MAX) {
        fs.unlink(file.path, () => {})
        results.rejected.push({ filename: originalName, reason: '压缩包超过 500MB 限制' })
        continue
      }
      try {
        const { extracted, skipped } = await extractZip(ctx, file.path)
        results.zips++
        results.zipExtracted += extracted
        results.created += extracted
        for (const name of skipped.slice(0, 5)) {
          results.rejected.push({ filename: `${originalName} 内: ${name}`, reason: '类型不支持或超大小限制' })
        }
      } catch (e: any) {
        results.rejected.push({ filename: originalName, reason: `解压失败: ${e.message || '文件损坏'}` })
      } finally {
        fs.unlink(file.path, () => {})
      }
      continue
    }

    // 图片 / 视频
    await createCreative(ctx, kind, originalName, file.path, file.size, file.mimetype || (kind === 'image' ? 'image/*' : 'video/*'))
    results.created++
    if (kind === 'video') results.videosProcessing++
  }

  return results
}

/** 素材列表：渠道用户只看自己，admin 全部 */
export async function listCreatives(user: Express.Request['user'], query: {
  status?: string; channel?: string; campaignId?: string; page?: number; pageSize?: number
}) {
  const page = query.page && query.page > 0 ? query.page : 1
  const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20

  const where: any = {}
  if (user?.role !== 'admin') where.userId = user?.id ?? -1
  if (query.status) where.status = query.status
  if (query.channel) where.channel = query.channel
  if (query.campaignId) where.campaigns = { some: { campaignId: query.campaignId } }

  const [total, rows] = await Promise.all([
    prisma.creative.count({ where }),
    prisma.creative.findMany({
      where,
      include: { campaigns: { select: { channel: true, campaignId: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  // 附带上传人用户名（素材表与用户表无外键，手动关联）
  const userIds = Array.from(new Set(rows.map((r) => r.userId)))
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true } })
  const nameMap = new Map(users.map((u) => [u.id, u.username]))
  const records = rows.map((r) => ({ ...r, uploaderName: nameMap.get(r.userId) || `#${r.userId}` }))

  return { total, page, pageSize, records }
}

/** 待审核数量（admin 角标用） */
export async function countPending() {
  return prisma.creative.count({ where: { status: 'pending' } })
}

/** 审核：通过 / 驳回 */
export async function reviewCreative(adminName: string, id: number, action: 'approve' | 'reject', comment?: string) {
  const creative = await prisma.creative.findUnique({ where: { id } })
  if (!creative) return { success: false as const, message: '素材不存在' }
  if (creative.status !== 'pending') return { success: false as const, message: '该素材不在待审核状态' }
  if (action === 'reject' && !comment?.trim()) return { success: false as const, message: '驳回必须填写原因' }

  await prisma.creative.update({
    where: { id },
    data: {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewComment: comment?.trim() || null,
      reviewedBy: adminName,
      reviewedAt: new Date(),
    },
  })
  return { success: true as const }
}

/** 驳回后重新提交 */
export async function resubmitCreative(userId: number, id: number) {
  const creative = await prisma.creative.findUnique({ where: { id } })
  if (!creative) return { success: false as const, message: '素材不存在' }
  if (creative.userId !== userId) return { success: false as const, message: '只能操作自己上传的素材' }
  if (creative.status !== 'rejected') return { success: false as const, message: '仅被驳回的素材可重新提交' }

  await prisma.creative.update({
    where: { id },
    data: { status: 'pending', version: { increment: 1 }, reviewedAt: null, reviewedBy: null },
  })
  return { success: true as const }
}

/** 设置素材关联的计划（整体替换，1:N 预留；当前 UI 传 0~1 个） */
export async function setCreativeCampaigns(user: Express.Request['user'], id: number, campaignIds: string[]) {
  const creative = await prisma.creative.findUnique({ where: { id } })
  if (!creative) return { success: false as const, message: '素材不存在' }
  if (user?.role !== 'admin' && creative.userId !== user?.id) {
    return { success: false as const, message: '只能操作自己上传的素材' }
  }
  const clean = Array.from(new Set(campaignIds.map((c) => String(c).trim()).filter(Boolean))).slice(0, 10)

  await prisma.$transaction([
    prisma.creativeCampaign.deleteMany({ where: { creativeId: id } }),
    prisma.creativeCampaign.createMany({
      data: clean.map((campaignId) => ({ creativeId: id, channel: creative.channel, campaignId })),
    }),
  ])
  return { success: true as const }
}

/** 删除素材（含磁盘文件） */
export async function deleteCreative(user: Express.Request['user'], id: number) {
  const creative = await prisma.creative.findUnique({ where: { id } })
  if (!creative) return { success: false as const, message: '素材不存在' }
  if (user?.role !== 'admin' && creative.userId !== user?.id) {
    return { success: false as const, message: '只能删除自己上传的素材' }
  }
  await prisma.creative.delete({ where: { id } })
  const filePath = path.join(CREATIVE_DIR, path.basename(creative.storedName))
  if (fs.existsSync(filePath)) fs.unlink(filePath, () => {})
  return { success: true as const }
}

/** 素材效果：按关联计划聚合 raw_data（近 N 天或指定范围） */
export async function getCreativePerformance(user: Express.Request['user'], id: number, startDate?: string, endDate?: string) {
  const creative = await prisma.creative.findUnique({
    where: { id },
    include: { campaigns: true },
  })
  if (!creative) return { success: false as const, message: '素材不存在' }
  if (user?.role !== 'admin' && creative.userId !== user?.id) {
    return { success: false as const, message: '只能查看自己上传的素材' }
  }
  if (creative.campaigns.length === 0) return { success: true as const, data: { campaigns: [], message: '尚未关联计划' } }

  const end = endDate ? dayjs(endDate) : dayjs()
  const start = startDate ? dayjs(startDate) : end.subtract(29, 'day')

  const campaigns = []
  for (const link of creative.campaigns) {
    const agg = await prisma.rawData.aggregate({
      where: {
        channel: link.channel,
        campaignId: link.campaignId,
        recordDate: { gte: start.startOf('day').toDate(), lte: toEndOfDay(end.format('YYYY-MM-DD')) },
      },
      _sum: {
        cost: true, impressions: true, clicks: true, downloads: true,
        activations: true, formalActivations: true, leads: true, accounts: true,
      },
    })
    const s = agg._sum
    const cost = s.cost ?? 0
    const accounts = s.accounts ?? 0
    const activations = s.activations ?? 0
    campaigns.push({
      channel: link.channel,
      campaignId: link.campaignId,
      cost,
      impressions: s.impressions ?? 0,
      clicks: s.clicks ?? 0,
      downloads: s.downloads ?? 0,
      activations,
      formalActivations: s.formalActivations ?? 0,
      leads: s.leads ?? 0,
      accounts,
      ctr: calcCtr(s.clicks ?? 0, s.impressions ?? 0),
      cpa: calcCpa(cost, activations),
      roi: calcRoi(accounts, cost),
    })
  }

  return {
    success: true as const,
    data: {
      dateRange: { startDate: start.format('YYYY-MM-DD'), endDate: end.format('YYYY-MM-DD') },
      campaigns,
    },
  }
}

/** 按存储名查素材（文件服务鉴权用） */
export async function findByStoredName(storedName: string) {
  return prisma.creative.findFirst({ where: { storedName } })
}
