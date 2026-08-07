/**
 * 端到端测试：上传全量校验 / 填反检测 / 事务化入库 / 快照撤销
 * 运行前提：本地后端已在 3001 端口启动（使用 dev.db）
 * 用法：node scripts/e2e-upload-test.mjs
 */
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import * as XLSX from 'xlsx'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })
const prisma = new PrismaClient()
const BASE = 'http://localhost:3001'
const CH = 'e2e_test'

const results = []
function check(name, cond, detail = '') {
  results.push({ name, pass: !!cond, detail })
  console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}

function xlsxBuffer(rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

async function postFile(path, buf, filename, fields = {}) {
  const fd = new FormData()
  fd.append('file', new Blob([buf]), filename)
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  const resp = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: fd,
  })
  return { status: resp.status, body: await resp.json() }
}

let TOKEN = ''
let createdLogIds = []

async function cleanup() {
  await prisma.rawData.deleteMany({ where: { channel: CH } })
  await prisma.convData.deleteMany({ where: { channel: CH } })
  for (const id of createdLogIds) {
    await prisma.uploadLog.deleteMany({ where: { id } })
  }
}

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } })
  if (!admin) throw new Error('本地 dev.db 没有 admin 用户')
  TOKEN = jwt.sign({ userId: admin.id }, process.env.JWT_SECRET || 'epw-dev-secret-change-in-production')

  // ---------- 场景 A：转化表正常上传 ----------
  const convBuf = xlsxBuffer([
    ['付费拉新时间', '外部投放渠道', '广告计划ID', '激活用户数', '转正激活新用户数', '留号码新用户数', '累计开户用户数'],
    ['2026-08-01', CH, '1001', 10, 5, 3, 2],
    ['2026-08-01', CH, '1002', 20, 8, 6, 4],
    ['2026-08-01', CH, '1003', 30, 12, 9, 6],
  ])
  const a = await postFile('/api/v1/data/upload-conv', convBuf, 'conv.xlsx')
  check('A1 转化表上传成功', a.status === 200 && a.body.success, JSON.stringify(a.body.data || a.body))
  if (a.body?.data?.uploadLogId) createdLogIds.push(a.body.data.uploadLogId)
  const convCount = await prisma.convData.count({ where: { channel: CH } })
  check('A2 conv_data 写入 3 条', convCount === 3, `实际 ${convCount}`)

  // ---------- 场景 B：媒体表计划ID/名称填反 → 整体拒绝 ----------
  const swappedBuf = xlsxBuffer([
    ['日期', '渠道', '计划ID', '计划名称', '曝光', '点击', '花费', '下载'],
    ['2026-08-01', CH, '商店-搜索-行业词-精准', '1001', 1000, 50, 200, 10],
    ['2026-08-01', CH, '商店-搜索-品牌词-精准', '1002', 2000, 80, 300, 20],
    ['2026-08-01', CH, '信息流-兴趣定向-通投', '1003', 3000, 120, 500, 30],
  ])
  const b = await postFile('/api/v1/data/upload-media', swappedBuf, 'swapped.xlsx', { channel: CH })
  check('B1 填反的媒体表被 400 拒绝', b.status === 400 && !b.body.success, b.body.message)
  check('B2 拒绝信息指出填反', /填反/.test(b.body.message || ''))
  const rawAfterB = await prisma.rawData.count({ where: { channel: CH } })
  check('B3 拒绝后 raw_data 无脏数据', rawAfterB === 0, `实际 ${rawAfterB}`)

  // ---------- 场景 C：媒体表含坏行 → 整体拒绝，一行都不入 ----------
  const badRowBuf = xlsxBuffer([
    ['日期', '渠道', '计划ID', '计划名称', '曝光', '点击', '花费', '下载'],
    ['2026-08-01', CH, '1001', '正常计划A', 1000, 50, 200, 10],
    ['不是日期', CH, '1002', '正常计划B', 2000, 80, 300, 20],
  ])
  const c = await postFile('/api/v1/data/upload-media', badRowBuf, 'badrow.xlsx', { channel: CH })
  check('C1 含坏行的媒体表被 400 拒绝', c.status === 400 && !c.body.success, c.body.message)
  check('C2 返回行级错误明细', Array.isArray(c.body?.data?.errors) && c.body.data.errors.length > 0, JSON.stringify(c.body?.data?.errors))
  const rawAfterC = await prisma.rawData.count({ where: { channel: CH } })
  check('C3 部分正确行也未入库（全量校验）', rawAfterC === 0, `实际 ${rawAfterC}`)

  // ---------- 场景 D：正常媒体表上传（事务化 + 快照） ----------
  const goodBuf = xlsxBuffer([
    ['日期', '渠道', '计划ID', '计划名称', '曝光', '点击', '花费', '下载'],
    ['2026-08-01', CH, '1001', '正常计划A', 1000, 50, 200, 10],
    ['2026-08-01', CH, '1002', '正常计划B', 2000, 80, 300, 20],
    ['2026-08-01', CH, '1003', '正常计划C', 3000, 120, 500, 30],
  ])
  const d = await postFile('/api/v1/data/upload-media', goodBuf, 'good.xlsx', { channel: CH })
  check('D1 媒体表上传成功', d.status === 200 && d.body.success, JSON.stringify(d.body.data || d.body))
  check('D2 转化匹配 3 条', d.body?.data?.matchedCount === 3, `实际 ${d.body?.data?.matchedCount}`)
  if (d.body?.data?.uploadLogId) createdLogIds.push(d.body.data.uploadLogId)
  const log1 = await prisma.uploadLog.findUnique({ where: { id: d.body.data.uploadLogId } })
  const backup1 = log1?.backupData ? JSON.parse(log1.backupData) : null
  check('D3 快照已保存（3 条插入 id）', backup1?.rawData?.insertedIds?.length === 3, `实际 ${backup1?.rawData?.insertedIds?.length}`)

  // ---------- 场景 E：重复上传（覆盖更新）+ 快照记录旧值 ----------
  const updBuf = xlsxBuffer([
    ['日期', '渠道', '计划ID', '计划名称', '曝光', '点击', '花费', '下载'],
    ['2026-08-01', CH, '1001', '正常计划A-改名', 1111, 55, 999, 11],
  ])
  const e = await postFile('/api/v1/data/upload-media', updBuf, 'upd.xlsx', { channel: CH })
  check('E1 覆盖上传成功（更新 1 条）', e.status === 200 && e.body?.data?.updatedCount === 1, JSON.stringify(e.body.data || e.body))
  if (e.body?.data?.uploadLogId) createdLogIds.push(e.body.data.uploadLogId)
  const rowAfterE = await prisma.rawData.findFirst({ where: { channel: CH, campaignId: '1001' } })
  check('E2 覆盖后花费=999', rowAfterE?.cost === 999, `实际 ${rowAfterE?.cost}`)
  const log2 = await prisma.uploadLog.findUnique({ where: { id: e.body.data.uploadLogId } })
  const backup2 = log2?.backupData ? JSON.parse(log2.backupData) : null
  check('E3 快照记录被覆盖行旧值（花费 200）', backup2?.rawData?.updatedRows?.[0]?.cost === 200, `实际 ${backup2?.rawData?.updatedRows?.[0]?.cost}`)

  // ---------- 场景 F：非最近一次上传不可撤销（E 还活跃时撤销 D） ----------
  const earlyRollback = await fetch(`${BASE}/api/v1/data/upload-logs/${d.body.data.uploadLogId}/rollback`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  const earlyRollbackBody = await earlyRollback.json()
  check('F1 有更新上传时，更早记录被拒（409）', earlyRollback.status === 409, earlyRollbackBody.message)

  // ---------- 场景 G：撤销 E（应恢复旧值） ----------
  const rollbackE = await fetch(`${BASE}/api/v1/data/upload-logs/${e.body.data.uploadLogId}/rollback`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${TOKEN}` },
  }).then((r) => r.json())
  check('G1 撤销成功', rollbackE.success, rollbackE?.data?.message || rollbackE.message)
  check('G2 恢复 1 条', rollbackE?.data?.restoredCount === 1, `实际 ${rollbackE?.data?.restoredCount}`)
  const rowAfterG = await prisma.rawData.findFirst({ where: { channel: CH, campaignId: '1001' } })
  check('G3 花费恢复为 200、名称恢复', rowAfterG?.cost === 200 && rowAfterG?.campaignName === '正常计划A', `实际 cost=${rowAfterG?.cost} name=${rowAfterG?.campaignName}`)

  // ---------- 场景 H：撤销 D（应删除 3 条新增） ----------
  const rollbackD = await fetch(`${BASE}/api/v1/data/upload-logs/${d.body.data.uploadLogId}/rollback`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${TOKEN}` },
  }).then((r) => r.json())
  check('H1 撤销成功', rollbackD.success, rollbackD?.data?.message || rollbackD.message)
  check('H2 删除 3 条', rollbackD?.data?.deletedCount === 3, `实际 ${rollbackD?.data?.deletedCount}`)
  const rawAfterH = await prisma.rawData.count({ where: { channel: CH } })
  check('H3 raw_data 测试数据已清空', rawAfterH === 0, `实际 ${rawAfterH}`)

  // ---------- 场景 I：撤销 A（转化表快照，应删除 3 条 conv） ----------
  const rollbackA = await fetch(`${BASE}/api/v1/data/upload-logs/${createdLogIds[0]}/rollback`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${TOKEN}` },
  }).then((r) => r.json())
  check('I1 A 成为最新活跃上传后可撤销', rollbackA.success, rollbackA?.data?.message || rollbackA.message)
  const convAfterI = await prisma.convData.count({ where: { channel: CH } })
  check('I2 conv_data 测试数据已清空', convAfterI === 0, `实际 ${convAfterI}`)

  // ---------- 场景 J：重复撤销被拒 ----------
  const rollbackAgain = await fetch(`${BASE}/api/v1/data/upload-logs/${e.body.data.uploadLogId}/rollback`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  const rollbackAgainBody = await rollbackAgain.json()
  check('J1 已撤销记录不能重复撤销（400）', rollbackAgain.status === 400, rollbackAgainBody.message)

  const failed = results.filter((r) => !r.pass)
  console.log(`\n===== ${results.length - failed.length}/${results.length} 通过 =====`)
  if (failed.length > 0) process.exitCode = 1
}

main()
  .catch((err) => {
    console.error('测试执行异常:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await cleanup()
    await prisma.$disconnect()
  })
