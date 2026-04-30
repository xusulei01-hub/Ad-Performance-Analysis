# 发现与决策

## 需求
- 重构后端代码结构，消除重复代码
- 业务逻辑和数据绑定绝对不变
- 确保前后端正常运行

## 研究发现

### 文件规模
| 文件 | 行数 | 问题 |
|------|------|------|
| `src/routes/dataRoutes.ts` | 613 | 过大，含 6 个功能域 |
| `src/routes/merchantRoutes.ts` | 569 | 过大，含 4 个功能域 |
| `src/routes/overviewRoutes.ts` | 289 | 可瘦身 |
| `src/routes/channelRoutes.ts` | 276 | 可瘦身 |
| `src/routes/targetRoutes.ts` | 182 | 可瘦身 |
| `src/routes/planRoutes.ts` | 148 | 合理 |

### 重复代码清单
1. **`parseBuffer`** — `dataRoutes.ts:72-106` == `merchantRoutes.ts:24-58`（35 行完全相同）
2. **`normalizeDate`** — `dataRoutes.ts:41-68` == `merchantRoutes.ts:62-84`（23 行完全相同）
3. **`parseRows`** — `dataRoutes.ts:136-162` == `merchantRoutes.ts:100-124`（25 行完全相同）
4. **`multer` 配置** — `dataRoutes.ts:9-20` == `merchantRoutes.ts:9-20`（12 行完全相同）
5. **`getWeekRange`** — `overviewRoutes.ts:110-116` == `targetRoutes.ts:8-14`（7 行完全相同）
6. **ROI 公式** `(accounts * 3100) / cost` — 出现 8+ 次
7. **CTR 公式** `clicks / impressions` — 出现 6+ 次
8. **分页参数解析** `Math.max/Math.min` 模式 — 出现 5+ 次
9. **end-of-day 处理** — 3 种不同写法散落各处

### 跨模块导入
- `overviewRoutes.ts` 第 4 行：`import { getCurrentTarget, DEFAULT_TARGETS } from './targetRoutes'`
- 反模式：路由文件互相导入

### 硬编码常量
- `3100` — 每账户收益，出现 8+ 次
- `{ weekly: { cost: 1000000, activations: 8000, accounts: 5000, roi: 1.5 } }` — 默认周目标
- `{ monthly: { cost: 5000000, activations: 40000, accounts: 25000, roi: 1.5 } }` — 默认月目标
- `50 * 1024 * 1024` — 文件大小限制
- 分页默认值：50、20、500、100

## 技术决策
| 决策 | 理由 |
|------|------|
| 使用 `export { default } from './data/index'` 重导出模式 | 零改动 index.ts 导入路径，向后兼容 |
| uploadService 返回诊断结构而非抛异常 | 保留原 400 诊断响应，不丢失业务逻辑 |
| 不引入 zod/joi | 减少依赖，简单中间件即可满足需求 |
| 不拆分 overviewRoutes/channelRoutes | 行数可控，服务层瘦身即可 |

## 资源
- Prisma schema: `prisma/schema.prisma`（7 个模型）
- SQLite 数据库: `prisma/dev.db`
- 现有端点总数: 24 个

## 视觉/浏览器发现
- 无
