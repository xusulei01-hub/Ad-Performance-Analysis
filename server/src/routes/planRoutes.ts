import { Router } from 'express'
import { prisma } from '../lib/prisma'
import dayjs from 'dayjs'
import { requireFields } from '../middleware/validate'

const router = Router()

// GET /api/v1/plans?month=YYYY-MM
router.get('/', async (req, res, next) => {
  try {
    const month = req.query.month ? String(req.query.month) : dayjs().format('YYYY-MM')
    const start = dayjs(month).startOf('month').toDate()
    const end = dayjs(month).endOf('month').toDate()

    const plans = await prisma.plan.findMany({
      where: {
        OR: [
          { startDate: { gte: start, lte: end } },
          { endDate: { gte: start, lte: end } },
          { AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }] },
        ],
      },
      include: { milestones: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ priority: 'asc' }, { startDate: 'asc' }],
    })

    res.json({ success: true, data: plans })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/plans/top5
router.get('/top5', async (req, res, next) => {
  try {
    const month = req.query.month ? String(req.query.month) : dayjs().format('YYYY-MM')
    const start = dayjs(month).startOf('month').toDate()
    const end = dayjs(month).endOf('month').toDate()

    const plans = await prisma.plan.findMany({
      where: {
        status: { not: 'completed' },
        OR: [
          { startDate: { gte: start, lte: end } },
          { endDate: { gte: start, lte: end } },
          { AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }] },
        ],
      },
      include: { milestones: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ priority: 'asc' }, { endDate: 'asc' }],
      take: 5,
    })

    res.json({ success: true, data: plans })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/plans
router.post('/', requireFields('title', 'startDate', 'endDate'), async (req, res, next) => {
  try {
    const { title, content, priority, status, startDate, endDate, progress, tag, tagIcon, milestones } = req.body

    const plan = await prisma.plan.create({
      data: {
        title: String(title).trim(),
        content: content ? String(content).trim() : null,
        priority: Number(priority) || 3,
        status: status || 'pending',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        progress: Number(progress) || 0,
        tag: tag ? String(tag).trim() : null,
        tagIcon: tagIcon ? String(tagIcon).trim() : null,
        milestones: {
          create: (milestones || []).map((m: any, i: number) => ({
            title: String(m.title).trim(),
            dueDate: new Date(m.dueDate),
            completed: !!m.completed,
            sortOrder: i,
          })),
        },
      },
      include: { milestones: { orderBy: { sortOrder: 'asc' } } },
    })

    res.json({ success: true, data: plan })
  } catch (err) {
    next(err)
  }
})

// PUT /api/v1/plans/:id
router.put('/:id', requireFields('title', 'startDate', 'endDate'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const { title, content, priority, status, startDate, endDate, progress, tag, tagIcon, milestones } = req.body

    // Delete existing milestones and recreate
    await prisma.milestone.deleteMany({ where: { planId: id } })

    const plan = await prisma.plan.update({
      where: { id },
      data: {
        title: title !== undefined ? String(title).trim() : undefined,
        content: content !== undefined ? (content ? String(content).trim() : null) : undefined,
        priority: priority !== undefined ? Number(priority) : undefined,
        status: status !== undefined ? status : undefined,
        startDate: startDate !== undefined ? new Date(startDate) : undefined,
        endDate: endDate !== undefined ? new Date(endDate) : undefined,
        progress: progress !== undefined ? Number(progress) : undefined,
        tag: tag !== undefined ? (tag ? String(tag).trim() : null) : undefined,
        tagIcon: tagIcon !== undefined ? (tagIcon ? String(tagIcon).trim() : null) : undefined,
        milestones: {
          create: (milestones || []).map((m: any, i: number) => ({
            title: String(m.title).trim(),
            dueDate: new Date(m.dueDate),
            completed: !!m.completed,
            sortOrder: i,
          })),
        },
      },
      include: { milestones: { orderBy: { sortOrder: 'asc' } } },
    })

    res.json({ success: true, data: plan })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/plans/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    await prisma.plan.delete({ where: { id } })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
