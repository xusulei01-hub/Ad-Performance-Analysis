import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/errorHandler'
import dataRoutes from './routes/dataRoutes'
import overviewRoutes from './routes/overviewRoutes'
import channelRoutes from './routes/channelRoutes'
import merchantRoutes from './routes/merchantRoutes'
import planRoutes from './routes/planRoutes'
import targetRoutes from './routes/targetRoutes'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API 路由
app.use('/api/v1/data', dataRoutes)
app.use('/api/v1/overview', overviewRoutes)
app.use('/api/v1/channels', channelRoutes)
app.use('/api/v1/merchants', merchantRoutes)
app.use('/api/v1/plans', planRoutes)
app.use('/api/v1/targets', targetRoutes)

// 错误处理中间件
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
