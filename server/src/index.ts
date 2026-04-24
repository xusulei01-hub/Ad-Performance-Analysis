import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import dataRoutes from './routes/dataRoutes'
import overviewRoutes from './routes/overviewRoutes'
import channelRoutes from './routes/channelRoutes'
import merchantRoutes from './routes/merchantRoutes'
import planRoutes from './routes/planRoutes'

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

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
  })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
