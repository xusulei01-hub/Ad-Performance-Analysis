# 发现与决策

## 需求
- 端外买断工作台是一个广告投放数据分析仪表板，数据来源为运营上传的 Excel。
- 当前核心需求已落地：数据上传/入库、总览仪表板、渠道分析、商户买断、AI 诊断、日程管理、目标管理。
- 本次优化聚焦：数据一致性、性能、安全、代码质量、可维护性、功能补齐。

## 研究发现

### 已实现功能
| 模块 | 完成度 | 说明 |
|------|--------|------|
| 双文件上传 | 100% | 媒体表 + 转化表，支持 xlsx/xls/csv |
| 表头解析与校验 | 100% | 支持大小写/空格模糊匹配 |
| 日期格式兼容 | 100% | yyyy-MM-dd、yyyy/MM/dd、Excel 序列号、YYYYMMDD |
| 渠道名称映射 | 100% | `channel_mappings` 表 + 管理 UI |
| 数据匹配（JOIN） | 100% | 按 (渠道, 日期, 计划ID) 匹配 |
| 增量入库（UPSERT） | 100% | 存在 update，不存在 create |
| 数据列表查询 | 100% | 分页、排序、筛选 |
| 上传历史与撤销 | 100% | 含撤销功能 |
| 总览卡片与图表 | 100% | 昨日/本周/本月、排名、漏斗 |
| 渠道分析 | 100% | 多选、趋势、Top 5、计划下钻 |
| 商户买断 / AI 诊断 / 日程 / 目标 | 100% | 超出原始需求的扩展模块 |

### 核心问题
1. **上传无事务保证**：`uploadRoutes.ts` 逐条 update/create，中途失败会导致数据半入库。
2. **N+1 批量写入**：大数据量上传时每行单独操作数据库，性能差。
3. **ROI 口径硬编码**：`REVENUE_PER_ACCOUNT = 3100`，公式 = 开户数 × 3100 / 花费，命名与业务含义需确认。
4. **HTTPS 证书校验被禁用**：`aiService.ts` 中 `rejectUnauthorized: false`。
5. **索引不足**：上传匹配查询使用 `(recordDate IN (...) AND channel IN (...))`，现有单独索引不够高效。
6. **聚合查询全量回传**：Top 10 / Top 5 排名先全量聚合再内存排序。
7. **重复代码**：`MetricCard`、漏斗图表、`getWeekRange`、`renderMarkdown` 等前后端重复。
8. **类型安全弱**：多处 `where: any`、`Promise<any[]>`。
9. **导出为 CSV 非 Excel**：`exportToExcel` 实际导出 CSV。
10. **前端状态分散**：无 Zustand，全靠 useState + RefreshContext。

### 与 CLAUDE.md 的偏差
- 数据库从 PostgreSQL 降级为 SQLite（当前可接受）。
- 单文件上传变为双文件上传（媒体 + 转化）。
- 原始 ROI/授信字段被计算型 ROI、转正、留资替代。
- 未实现 Swagger/OpenAPI、JWT、Zustand、channels 维度表。

## 技术决策
| 决策 | 理由 |
|------|------|
| 优先事务化 + 批量写入 | 解决数据一致性与性能两大核心风险 |
| 保持 SQLite | 当前并发与数据量未达 PostgreSQL 必要阈值 |
| ROI 调整需业务确认 | 避免指标口径与业务预期冲突 |
| 先局部优化状态管理 | 页面状态相对独立，Zustand 可作为后续迭代项 |
| 导出改为真正 Excel | 使用现有 `xlsx` 依赖即可实现，成本低 |

## 遇到的问题
| 问题 | 解决方案 |
|------|---------|
| 上传事务边界不清晰 | 明确事务包裹 raw_data 写入 + upload_logs 写入，失败整体回滚 |
| Prisma SQLite 批量更新限制 | 使用 `$transaction` + 批量 `update` 或拆分为 createMany + 批量 update |
| 颜色系统不统一 | 统一使用 `METRIC_COLORS` 常量 |
| **skillhub registry 下载端点 500** | **待解决：info 接口 200，download 接口对所有 skill 返回 500 Internal Server Error** |

## skillhub 安装阻塞问题（2026-06-17）

### 现象
尝试安装 `data-query`、`data-asset-query`、`std-sql-view-lineage` 均失败：
- 步骤 1（读取远端技能信息并检查安全状态）成功
- 步骤 2（下载技能包）失败，错误：`mTLS download failed for https://phonestat.hexin.cn/sdmp/skill/api/v1/download?slug=...`

### 直接验证
| 请求 | URL | 结果 |
|------|-----|------|
| skill 信息 | `.../api/v1/skills/data-query` | ✅ 200 OK，返回元数据 |
| skill 信息 | `.../api/v1/skills/data-asset-query` | ✅ 200 OK，返回元数据 |
| skill 下载 | `.../api/v1/download?slug=data-query&version=1.0.10` | ❌ 500 Internal Server Error |
| skill 下载 | `.../api/v1/download?slug=data-asset-query&version=1.0.10` | ❌ 500 Internal Server Error |
| skill 下载 | `.../api/v1/download?slug=std-sql-view-lineage&version=1.0.3` | ❌ 500 Internal Server Error |

### 已排除的原因
1. **skillhub-cli 未安装** — 已安装 v0.1.0
2. **mTLS 证书配置错误** — `~/.skillhub-cli/config.json` 已配置 `ssl_cert_file` 和 `ssl_cert_password`；openssl 可成功提取 cert/key
3. **证书失效** — 证书有效期 2026-04-16 至 2028-04-15
4. **单个 skill 不存在** — info 接口返回 200；多个 skill 下载均 500
5. **证书身份不匹配导致 403** — 实际返回的是 500，不是 403

### 可能原因
- skill registry 服务端 `/api/v1/download` 端点存在故障
- 下载服务与 info 服务部署分离，下载服务当前异常
- 服务端处理下载请求时内部报错（如存储后端、权限校验逻辑异常）

### 影响
- 无法安装 `data-query` / `data-asset-query` skill
- 无法通过 skill 方式从公司数据库获取转化数据
- 阻塞“转化数据表改为通过 skill 从公司数据库获取”这一新方向

### 建议解决方案
1. 联系 skill registry 管理员排查 `/api/v1/download` 端点
2. 寻找已安装 skill 的离线包手动部署
3. 临时绕开 skill，直接通过后端数据库连接获取转化数据

## 资源
- 项目根目录：`/Users/xusulei/端外买断工作台`
- 后端：`/server/src/`
- 前端：`/client/src/`
- 任务计划：`task_plan.md`
- 进度日志：`progress.md`

## 视觉/浏览器发现
- 暂无

---
*每执行2次查看/浏览器/搜索操作后更新此文件*
*防止视觉信息丢失*
