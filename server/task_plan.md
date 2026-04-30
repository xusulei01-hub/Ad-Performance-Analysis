# 任务计划：后端代码结构重构

## 目标
消除重复代码、拆分超大路由文件、引入服务层分层架构，在业务逻辑和数据绑定绝对不变的前提下优化后端代码结构。

## 当前阶段
全部完成

## 各阶段

### 阶段 1：需求与发现
- [x] 通读全部 6 个路由文件（共 2,329 行）
- [x] 识别重复代码（parseBuffer、normalizeDate、parseRows、getWeekRange、ROI/CTR 公式等）
- [x] 识别跨模块导入（overviewRoutes 从 targetRoutes 导入）
- [x] 识别硬编码常量（3100、默认目标值、分页默认值）
- [x] 识别文件过大问题（dataRoutes 612 行、merchantRoutes 568 行）
- [x] 将发现记录到 findings.md
- **状态：** complete

### 阶段 2：规划与结构
- [x] 确定技术方案（提取共享层 → 拆分路由 → 服务层 → 验证增强）
- [x] 设计目标目录结构（constants/types/utils/services/middleware/routes）
- [x] 记录 4 处 plan 修正点（见已做决策）
- **状态：** complete

### 阶段 3：提取共享基础设施（Phase 1）
- [x] 新建 `src/utils/upload.ts`（parseBuffer、normalizeDate、parseRows、createMulterUpload）
- [x] 新建 `src/utils/date.ts`（getWeekRange、toEndOfDay）
- [x] 新建 `src/utils/pagination.ts`（parsePagination）
- [x] 新建 `src/utils/formulas.ts`（calcRoi、calcCtr、calcCpa、calcChange、toNum）
- [x] 新建 `src/constants/index.ts`（REVENUE_PER_ACCOUNT、DEFAULT_TARGETS、PAGE_SIZES）
- [x] 新建 `src/types/index.ts`（ParsedMedia、ParsedConv、MatchedRow、ParsedMerchantRow 等）
- [x] 更新所有路由文件引用（删除重复代码，改为导入）
- [x] 编译检查 `./node_modules/.bin/tsc --noEmit` — 通过
- [x] 启动服务 + 接口冒烟测试 — 通过
- [x] 前端联调确认正常 — 通过
- **状态：** complete

### 阶段 4：拆分大型路由文件（Phase 2）
- [x] 新建 `src/routes/data/` 目录（upload/mapping/record/uploadLog 子路由）
- [x] 新建 `src/routes/merchant/` 目录（upload/record/report/mapping 子路由）
- [x] 保留 `dataRoutes.ts` 和 `merchantRoutes.ts` 作为重导出文件（兼容）
- [x] 更新 `src/index.ts` 导入路径
- [x] 编译检查 + 冒烟测试 + 前端联调 — 全部通过
- **状态：** complete

### 阶段 5：提取服务层（Phase 3）
- [x] 新建 `src/services/overviewService.ts`
- [x] 新建 `src/services/channelService.ts`
- [x] 新建 `src/services/targetService.ts`（修复跨模块导入）
- [x] 新建 `src/services/uploadService.ts`（保留匹配诊断逻辑）
- [x] 新建 `src/services/merchantService.ts`
- [x] 精简路由文件为薄层（参数解析 → 调用服务 → 返回 JSON）
- [x] 编译检查 + 冒烟测试 + 前端联调 — 全部通过
- **状态：** complete

### 阶段 6：输入验证与错误处理增强（Phase 4）
- [x] 新建 `src/middleware/validate.ts`（requireFields、requireEnum 中间件）
- [x] 新建 `src/middleware/errorHandler.ts`（从 index.ts 提取并增强）
- [x] 在关键路由应用验证（data/mapping、merchant/mapping、target、plan）
- [x] 编译检查 + 冒烟测试 + 前端联调 — 全部通过
- **状态：** complete

### 阶段 7：最终验证与交付
- [x] 完整接口冒烟测试（14 个端点全部通过）
- [x] 验证中间件测试（缺失字段/无效枚举均正确返回 400）
- [x] 前端代理联调通过
- [x] 更新 progress.md
- **状态：** complete

## 关键问题
1. 无

## 已做决策
| 决策 | 理由 |
|------|------|
| Phase 1 先提取共享层再拆分 | 后续 Phase 都依赖共享 utils，前置可避免重复修改 |
| 保留原 dataRoutes.ts / merchantRoutes.ts 作为重导出 | 避免 index.ts 改动，向后兼容 |
| merchant 查询接口（records/merchants/channels）独立为 recordRoutes.ts | 与上传业务无关，独立更清晰 |
| uploadService 返回 `{success: false, diagnosis}` 结构 | 保留原"未匹配诊断"400 响应，不丢失业务逻辑 |
| 不引入 zod/joi 等验证库 | 减少依赖，用简单中间件函数即可 |
| 每个 handler "不超过 10 行"为软目标 | 上传诊断分支会让 handler 稍长（约 12-15 行），允许 |

## 遇到的错误
| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| npm workspaces 冲突导致 tsc/tsx 失败 | 1 | 使用 `./node_modules/.bin/tsc` 和 `node ./node_modules/.bin/tsx` 直接调用 |
| 无 | - | - |

## 备注
- 重构全部完成，后端代码从 6 个超大路由文件（2,329 行）重构为 8 个子路由 + 5 个服务 + 4 个工具模块 + 2 个中间件 + 2 个共享层（constants/types）
- 消除重复代码约 120+ 行，硬编码常量全部集中到 constants/index.ts
- 业务逻辑和数据绑定完全未变，所有 API 响应格式保持不变
