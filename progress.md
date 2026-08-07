# 进度日志

## 会话：2026-06-17

### 阶段 1：现状确认与风险评估
- **状态：** in_progress
- **开始时间：** 2026-06-17
- 执行的操作：
  - 调用通用代理全面遍历代码库
  - 对比 CLAUDE.md 与实际实现，梳理功能完成度
  - 识别核心风险点与优化方向
  - 创建 `task_plan.md`、`findings.md`、`progress.md`
- 创建/修改的文件：
  - `/Users/xusulei/端外买断工作台/task_plan.md`
  - `/Users/xusulei/端外买断工作台/findings.md`
  - `/Users/xusulei/端外买断工作台/progress.md`

### 阶段 2：核心稳定性改造
- **状态：** pending
- 执行的操作：
  - 暂无
- 创建/修改的文件：
  - 暂无

## 测试结果
| 测试 | 输入 | 预期结果 | 实际结果 | 状态 |
|------|------|---------|---------|------|
| 代码库遍历 | 全项目 | 识别主要问题 | 已识别 10+ 项问题 | complete |

## 错误日志
| 时间戳 | 错误 | 尝试次数 | 解决方案 |
|--------|------|---------|---------|
| 暂无 | - | - | - |

## 五问重启检查
| 问题 | 答案 |
|------|------|
| 我在哪里？ | 阶段 1：现状确认与风险评估 |
| 我要去哪里？ | 阶段 2：核心稳定性改造（上传事务化、批量写入、HTTPS 修复） |
| 目标是什么？ | 修复核心风险点，提升数据一致性、性能与安全性 |
| 我学到了什么？ | 见 findings.md |
| 我做了什么？ | 完成代码遍历并创建三份规划文件 |

## 会话：2026-06-17（新方向：接入 data-query skill）

### 阶段：环境准备与 skill 安装
- **状态：** in_progress
- **开始时间：** 2026-06-17
- 执行的操作：
  - 用户确认 ROI 保持原有口径，原优化计划先搁置
  - 用户要求将转化数据表改为通过 skill 从公司数据库获取
  - 检查 skillhub-cli 已安装（版本 v0.1.0）
  - 修正 skill 名称：用户指定为 `data-query`（非 `sql-data-query`）
  - 定位 mTLS 证书配置：`~/.skillhub-cli/config.json` 已配置 `ssl_cert_file` 和 `ssl_cert_password`
  - 验证证书有效性：openssl 可成功提取 cert/key；curl 调用 skill 信息接口返回 200
  - 尝试 `skillhub install data-query` 失败：步骤 2 下载技能包时报 `mTLS download failed`
  - 使用 curl 直接测试下载端点 `https://phonestat.hexin.cn/sdmp/skill/api/v1/download?slug=data-query&version=1.0.10` 返回 HTTP 500 Internal Server Error
  - 测试其他 skill（`std-sql-view-lineage`）下载同样返回 500，确认是服务端下载端点问题，非证书或单个 skill 问题
- 创建/修改的文件：
  - 暂无

### 当前阻塞
- skillhub registry 的 `/api/v1/download` 端点持续返回 500 Internal Server Error，导致无法安装任何 skill。
- 可能原因：服务端故障、下载端点与 info 端点权限/实现分离、证书身份与 skill 所有者不一致导致服务端异常等。

## 测试结果
| 测试 | 输入 | 预期结果 | 实际结果 | 状态 |
|------|------|---------|---------|------|
| skillhub 安装 data-query | `skillhub install data-query` | 安装成功 | mTLS download failed | failed |
| curl 获取 skill 信息 | `https://phonestat.hexin.cn/sdmp/skill/api/v1/skills/data-query` | 200 + JSON | 200，返回 skill 元数据 | complete |
| curl 直接下载 skill | `/api/v1/download?slug=data-query&version=1.0.10` | 200 + zip | 500 Internal Server Error | failed |
| curl 下载其他 skill | `/api/v1/download?slug=std-sql-view-lineage&version=1.0.3` | 200 + zip | 500 Internal Server Error | failed |

## 错误日志
| 时间戳 | 错误 | 尝试次数 | 解决方案 |
|--------|------|---------|---------|
| 2026-06-17 | skillhub download 500 Internal Server Error | 2 | 待排查，疑似服务端问题 |

## 五问重启检查
| 问题 | 答案 |
|------|------|
| 我在哪里？ | 搁置原优化计划，正在尝试安装 data-query skill |
| 我要去哪里？ | 安装 skill 后，用它查询公司数据库中的转化数据 |
| 目标是什么？ | 将转化数据来源从 Excel 上传改为公司数据库 skill 查询 |
| 我学到了什么？ | skill 信息接口可用，但下载端点 500；证书有效 |
| 我做了什么？ | 完成环境检查、证书验证、skill 安装尝试，发现服务端阻塞 |

---
*每个阶段完成后或遇到错误时更新此文件*

## 会话：2026-06-17（尝试安装 data-asset-query）

### 阶段：尝试替代 skill 安装
- **状态：** blocked
- 执行的操作：
  - 按用户要求执行 `skillhub install data-asset-query`
  - 结果与 data-query 相同：步骤 1 读取远端信息成功，步骤 2 下载失败
  - 错误：`mTLS download failed for https://phonestat.hexin.cn/sdmp/skill/api/v1/download?slug=data-asset-query&version=1.0.10`
- 创建/修改的文件：
  - 暂无

### 当前结论
- skill registry 的 `/api/v1/download` 端点对多个 skill（data-query、data-asset-query、std-sql-view-lineage）均返回 500。
- 这是服务端通用故障，与 skill slug 无关。

---
*每个阶段完成后或遇到错误时更新此文件*

## 会话：2026-06-17（开代理后重试 data-query）

### 阶段：代理验证
- **状态：** blocked
- 执行的操作：
  - 用户开启代理后，再次执行 `skillhub install data-query`
  - 结果仍然失败，错误相同：`mTLS download failed for https://phonestat.hexin.cn/sdmp/skill/api/v1/download?slug=data-query&version=1.0.10`
- 创建/修改的文件：
  - 暂无

### 结论
- 已排除代理因素。
- 问题确定为 skill registry `/api/v1/download` 服务端端点故障。

---
*每个阶段完成后或遇到错误时更新此文件*

## 会话：2026-06-17（尝试安装 sql-data-query）

### 阶段：验证原始 skill 名称
- **状态：** blocked
- 执行的操作：
  - 按用户要求执行 `skillhub install sql-data-query`
  - 结果：步骤 1（读取远端技能信息）直接失败
  - 错误：`mTLS request failed for https://phonestat.hexin.cn/sdmp/skill/api/v1/skills/sql-data-query`
- 创建/修改的文件：
  - 暂无

### 结论
- `sql-data-query` 在 skill registry 中不存在或无法访问。
- 正确的 SQL 查询类 skill 应为 `data-query` 或 `data-asset-query`，但两者均因 download 端点 500 无法安装。

---
*每个阶段完成后或遇到错误时更新此文件*

## 会话：2026-08-07（上传事务化 + 快照撤销落地）

### 阶段 2.1/2.2：上传稳定性改造 + 最近一次上传可回溯
- **状态：** complete
- 背景：线上一次媒体表「计划ID/计划名称」填反仍成功入库，且旧撤销功能无法安全清理（媒体上传会把被更新的老行也打上新 uploadLogId，撤销会误删老数据；旧版双文件上传的更新行无 uploadLogId，撤销恢复不了旧值）。
- 执行的操作：
  - UploadLog 新增 `backupData`（JSON 快照：本次插入行 id + 被更新行旧值）、`rolledBackAt` 字段，迁移 `20260807054000_upload_rollback_snapshot`
  - 新增 `server/src/utils/ingest.ts`：事务内 createMany 批量插入 + 逐条更新 + 快照生成；文件内主键去重；填反检测（名称列纯数字≥4位且ID列非纯数字，占比≥50% 拒绝）
  - 三个上传路由（upload-media / upload-conv / upload 双文件）全部改为：全量行级校验（任何一行不合格整体 400 拒绝，不入库）→ `$transaction`（timeout 60s）内建日志、写入、存快照，失败整体回滚
  - 撤销接口重写：仅最近一次未撤销上传可撤销（否则 409）；优先按快照精确回滚（删新增 + 恢复旧值），事务内完成；旧格式无快照记录回退为 legacy 删除；已撤销记录拒绝重复撤销；撤销需 admin
  - 前端：上传历史按 `rolledBackAt` 显示已撤销、仅最近一次显示撤销按钮、按 hasBackup 区分提示文案；上传被拒时弹窗展示行号级错误明细
  - 修复潜在 bug：`index.ts` 中 `dotenv.config()` 在 import 之后执行，导致 `utils/auth.ts` 读不到 JWT_SECRET，一直用兜底密钥——改为首行 `import 'dotenv/config'`（注意：部署后旧 token 失效，用户需重新登录）
- 创建/修改的文件：
  - `server/prisma/schema.prisma`、`server/prisma/migrations/20260807054000_upload_rollback_snapshot/`
  - `server/src/utils/ingest.ts`（新增）、`server/src/index.ts`
  - `server/src/routes/data/{uploadRoutes,mediaUploadRoutes,convUploadRoutes,uploadLogRoutes}.ts`
  - `client/src/pages/DataManagement/index.tsx`、`client/src/services/dataManageService.ts`、`client/src/types/index.ts`
  - `server/scripts/e2e-upload-test.mjs`（新增，24 项端到端断言）

## 测试结果
| 测试 | 输入 | 预期结果 | 实际结果 | 状态 |
|------|------|---------|---------|------|
| server tsc --noEmit | 全量后端代码 | 无错误 | 无错误 | complete |
| client vite build + tsc | 全量前端代码 | 构建成功 | 构建成功 | complete |
| E2E：正常转化/媒体上传 | 3 行 xlsx | 入库+快照 | 通过 | complete |
| E2E：计划ID/名称填反 | 3 行填反 xlsx | 400 整体拒绝无脏数据 | 通过 | complete |
| E2E：含坏行文件 | 1 行坏日期 | 400 且正确行也不入库 | 通过 | complete |
| E2E：覆盖上传+撤销 | 更新 1 条后撤销 | 旧值精确恢复 | 通过 | complete |
| E2E：撤销顺序/重复撤销 | 撤销更早记录/重复撤销 | 409 / 400 | 通过 | complete |

## 待办（部署相关）
- 线上需先执行 `prisma migrate deploy` 加列，再重启
- 线上脏数据清理：部署后按 uploadLogId 撤销或 SQL 删除填反产生的垃圾行（campaignId 为中文计划名称的行）
- 部署后 JWT_SECRET 真正生效，所有已登录用户需重新登录

## 会话：2026-08-07（部署 + 线上脏数据清理）
- 提交 `29558ed` 推送并部署到 8.136.157.93：服务器 reset 到最新、`prisma migrate deploy` 应用快照迁移、`tsc` 编译、PM2 重启，前端 dist 已上传（已删 sourcemap）
- 验证：首页 200、API 正常响应（未带 token 返回 401 符合预期）
- 脏数据清理：上传记录 #107（rednote，计划ID/名称填反）的 7471 条脏行已删除，修正版 #109 的 7469 条完好；清理前已备份线上库为 `prisma/dev.db.bak-20260807`；#107 已标记 rolledBackAt
- 发现同类历史遗留：#57（kwai，304 条，同样填反且日期错乱到 9998 年等）——待用户确认后清理
- 注意：dotenv 修复后线上 JWT_SECRET 真正生效，所有旧登录 token 失效，用户需重新登录
