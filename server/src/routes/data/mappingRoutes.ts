import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { requireFields } from '../../middleware/validate'

const router = Router()

// GET /api/v1/data/channel-mappings
router.get('/channel-mappings', async (req, res, next) => {
  try {
    const rows = await prisma.channelMapping.findMany({ orderBy: { createdAt: 'desc' } })
    res.json({ success: true, data: rows })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/data/channel-mappings
router.post('/channel-mappings', requireFields('sourceName', 'targetName'), async (req, res, next) => {
  try {
    const normalizedSource = String(req.body.sourceName).trim().toLowerCase()
    const normalizedTarget = String(req.body.targetName).trim()

    const existing = await prisma.channelMapping.findFirst({
      where: { sourceName: normalizedSource },
    })

    let row
    if (existing) {
      row = await prisma.channelMapping.update({
        where: { id: existing.id },
        data: { targetName: normalizedTarget },
      })
    } else {
      row = await prisma.channelMapping.create({
        data: {
          sourceName: normalizedSource,
          targetName: normalizedTarget,
        },
      })
    }
    res.json({ success: true, data: row })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/data/channel-mappings/:id
router.delete('/channel-mappings/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    await prisma.channelMapping.delete({ where: { id } })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
