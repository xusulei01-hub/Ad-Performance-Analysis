# 任务计划：端外买断工作台后续优化开发计划

## 目标
修复当前项目核心风险点（数据一致性、性能瓶颈、安全漏洞），提升代码质量与可维护性，并为后续功能扩展打好基础。

## 当前阶段
阶段 1

## 各阶段

### 阶段 1：现状确认与风险评估
- [x] 遍历代码库，识别已实现功能与缺失点
- [x] 整理性能、安全、代码质量问题
- [ ] 与业务方确认 ROI 计算口径（若可行）
- [x] 将发现记录到 findings.md
- **状态：** in_progress

### 阶段 2：核心稳定性改造
- [x] **2.1 上传操作事务化**（2026-08-07 完成：全量校验 + `$transaction` 入库 + 快照）
- [x] **2.2 批量写入替代逐条操作**（2026-08-07 完成：createMany 分批 + 事务内逐条更新）
- [x] **2.3 HTTPS 证书校验修复**（2026-08-07 完成：移除 `rejectUnauthorized: false`，线上真实调用验证通过；另发现并修复线上 JWT_SECRET 缺失问题）
- **状态：** complete

### 阶段 3：数据与性能优化
- [x] **3.1 补齐 raw_data 复合索引**（2026-08-07 完成：新增 `(recordDate, channel)`，删除两个冗余索引，本地+线上已 ANALYZE，聚合查询不再全索引扫描）
- [x] **3.2 聚合查询 LIMIT 优化**（2026-08-07 完成：ROI/开户 Top5、总览 Top10 均在数据库层 ORDER BY + LIMIT，新旧逻辑 5/5 一致性验证通过）
- [ ] **3.3 ROI 口径明确化与可配置**
  - 关键文件：`server/src/constants/index.ts`、`server/src/services/overviewService.ts`、`server/src/services/channelService.ts`
  - 工作：确认 ROI 公式，将 `REVENUE_PER_ACCOUNT` 改为可配置目标项或常量并补充注释
  - 依赖：需业务确认（阶段 1）
  - 验收：指标名称与公式在文档、UI、代码中一致
- **状态：** pending

### 阶段 4：前端体验与代码质量
- [x] **4.1 图表响应式与颜色统一**
  - 关键文件：`client/src/pages/Dashboard/index.tsx`、`client/src/pages/ChannelAnalysis/index.tsx`
  - 工作：统一使用 `METRIC_COLORS`，补充 resize 处理
  - 验收：窗口缩放后图表自适应；Dashboard 与 ChannelAnalysis 漏斗颜色一致
- [ ] **4.2 前端请求防抖**
  - 关键文件：`client/src/pages/DataManagement/index.tsx`
  - 工作：分页/筛选切换使用防抖或取消旧请求
  - 验收：快速切换分页不产生并发竞争
- [ ] **4.3 重复代码抽取**
  - 关键文件：`client/src/pages/Dashboard/index.tsx`、`client/src/pages/ChannelAnalysis/index.tsx`、`client/src/utils/dates.ts`、`server/src/utils/date.ts`
  - 工作：抽取 `MetricCard`、漏斗图表组件、`getWeekRange` 等公共函数
  - 验收：重复代码块消失，功能验证通过
- [ ] **4.4 类型安全改进**
  - 关键文件：`server/src/routes/data/*.ts`、`server/src/services/*.ts`、`client/src/services/*.ts`
  - 工作：替换 `where: any`、`Promise<any[]>` 等弱类型
  - 验收：`tsc --noEmit` 与 ESLint 无新增错误
- **状态：** pending

### 阶段 5：功能补齐
- [ ] **5.1 数据导出真正 Excel**
  - 关键文件：`client/src/pages/DataManagement/index.tsx`、新增 `client/src/utils/excelExport.ts`
  - 工作：使用 `xlsx` 库生成 `.xlsx` 文件
  - 验收：导出的文件可在 Excel 中正常打开，包含表头与数据
- [ ] **5.2 Swagger/OpenAPI 文档（可选）**
  - 关键文件：`server/src/app.ts`、新增 `server/src/routes/*.ts` 文档注释
  - 工作：集成 swagger-ui-express
  - 验收：`/api-docs` 可查看主要接口文档
- [ ] **5.3 API 限流与文件上传校验**
  - 关键文件：`server/src/app.ts`、`server/src/routes/data/uploadRoutes.ts`
  - 工作：AI 分析接口加限流；上传接口严格校验文件大小与类型
  - 验收：异常请求返回 429 / 413 等合适状态码
- **状态：** pending

### 阶段 6：测试与验证
- [ ] 为后端核心服务补充单元测试（上传、聚合、ROI 计算）
- [ ] 执行端到端上传-查看-分析流程测试
- [ ] 将测试结果记录到 progress.md
- [ ] 修复回归问题
- **状态：** pending

### 阶段 7：交付
- [ ] 检查所有输出文件与规划文件
- [ ] 汇总优化清单与后续建议
- [ ] 交付给用户
- **状态：** pending

## 关键问题
1. ROI 计算口径：当前为“开户数 × 3100 / 花费”，业务上期望的指标名称是 ROI、ROAS 还是收益成本比？单账户收益 3100 是否长期固定？
2. 上传事务化范围：是否仅包裹 raw_data 写入，还是需要同时包裹 upload_logs 写入？
3. 状态管理：是否需要引入 Zustand，还是先通过局部优化满足当前需求？

## 已做决策
| 决策 | 理由 |
|------|------|
| 优先处理上传事务化与批量写入 | 直接影响数据一致性与大文件上传性能，是核心基础设施风险 |
| 先不改数据库选型（SQLite） | 当前数据量与并发尚未达到 PostgreSQL 必要阈值，迁移成本高 |
| ROI 公式调整需业务确认后再改代码 | 避免指标口径与业务预期不一致 |
| 暂不强制引入 Zustand | 当前页面状态相对独立，优先用局部优化解决并发和共享问题 |

## 遇到的错误
| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| 暂无 | - | - |

## 备注
- 阶段状态流转：pending → in_progress → complete
- 每个阶段完成后更新 progress.md
- 做重大决策前重新读取此计划
