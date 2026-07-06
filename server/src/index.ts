import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/errorHandler'
import { authenticate } from './middleware/authenticate'
import dataRoutes from './routes/dataRoutes'
import overviewRoutes from './routes/overviewRoutes'
import channelRoutes from './routes/channelRoutes'
import merchantRoutes from './routes/merchantRoutes'
import planRoutes from './routes/planRoutes'
import targetRoutes from './routes/targetRoutes'
import aiRoutes from './routes/aiRoutes'
import aiReportRoutes from './routes/aiReportRoutes'
import authRoutes from './routes/authRoutes'
import userRoutes from './routes/userRoutes'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 健康检查（无需认证）
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 认证路由（无需认证）
app.use('/api/v1/auth', authRoutes)

// === 以下路由需要认证 ===
app.use('/api/v1/user', authenticate, userRoutes)
app.use('/api/v1/data', authenticate, dataRoutes)
app.use('/api/v1/overview', authenticate, overviewRoutes)
app.use('/api/v1/channels', authenticate, channelRoutes)
app.use('/api/v1/merchants', authenticate, merchantRoutes)
app.use('/api/v1/plans', authenticate, planRoutes)
app.use('/api/v1/targets', authenticate, targetRoutes)
app.use('/api/v1/ai', authenticate, aiRoutes)
app.use('/api/v1/ai-reports', authenticate, aiReportRoutes)

// 错误处理中间件
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
