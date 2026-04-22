# 端外买断工作台 - 广告投放数据分析仪表板

## 项目概述
端外买断工作台是一个用于监控和分析广告投放效果的Web仪表板。数据来源于运营人员上传的Excel表格，系统支持增量更新，自动去重后入库。系统帮助运营团队追踪花费、激活、开户和ROI等关键指标，支持总览视图、分渠道详细分析和数据管理。

---

## 功能需求

### 1. 数据管理模块
所有分析数据来源于Excel表格上传，系统负责解析、去重、入库。

#### 1.1 数据上传
- **上传入口**：顶部导航栏或侧边栏提供"数据上传"按钮
- **上传组件**：支持拖拽上传或点击选择文件，仅接受 `.xlsx` 和 `.xls` 格式
- **表头校验**：上传后自动校验Excel列名是否符合规范（渠道、日期、计划ID、品种/名称、曝光、点击、花费、下载、激活、授信、开户、ROI）
- **数据预览**：上传后展示前10条数据预览，供用户确认
- **确认入库**：用户确认后执行入库操作
- **上传结果反馈**：显示成功导入条数、跳过条数（重复数据）、失败条数及原因

#### 1.2 增量更新逻辑
- **去重键**：以 `(渠道, 日期, 计划ID)` 作为唯一标识
- **更新策略**：
  - 若 `(渠道, 日期, 计划ID)` 组合已存在，则更新该条记录的所有字段（覆盖）
  - 若不存在，则插入新记录
- **事务保证**：单次上传作为一个事务，全部成功或全部回滚
- **上传历史**：记录每次上传的文件名、上传时间、操作人、导入条数、跳过条数

#### 1.3 数据查看
- **数据列表页**：以表格形式展示所有已入库的原始数据
- **筛选功能**：按渠道、日期范围、计划ID筛选
- **分页功能**：每页50/100/200条，支持跳页
- **排序功能**：支持按各列升序/降序排序
- **导出功能**：支持将筛选后的数据导出为Excel

#### 1.4 数据表结构（Excel模板）
上传的Excel必须包含以下列：

| 列名 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 渠道 | string | 是 | 渠道名称，如 hihonor、oppo 等 |
| 日期 | date | 是 | 数据日期，格式 yyyy-MM-dd 或 yyyy/MM/dd |
| 计划ID | string/number | 是 | 投放计划唯一标识 |
| 品种/名称 | string | 否 | 计划名称或描述 |
| 曝光 | number | 是 | 广告曝光次数 |
| 点击 | number | 是 | 广告点击次数 |
| 花费 | number | 是 | 消耗金额（元） |
| 下载 | number | 是 | 应用下载次数 |
| 激活 | number | 是 | 用户激活数量 |
| 授信 | number | 是 | 用户授信数量 |
| 开户 | number | 是 | 用户开户数量 |
| ROI | number | 是 | 投资回报率 |

---

### 2. 总览仪表板
基于已入库数据，自动聚合计算展示全局关键指标。

#### 2.1 昨日数据卡片（4个）
- **昨日花费**：昨日总花费金额，环比变化（与前天对比）
- **昨日激活**：昨日总激活数量，环比变化
- **昨日开户**：昨日总开户数量，环比变化
- **昨日ROI**：昨日总体投资回报率，环比变化

#### 2.2 本周数据卡片（4个）
- **本周花费**：本周（周一到周日）累计花费，完成度进度条（对比周目标）
- **本周激活**：本周累计激活，完成度进度条
- **本周开户**：本周累计开户，完成度进度条
- **本周ROI**：本周平均ROI，目标对比

#### 2.3 本月数据卡片（4个）
- **本月花费**：本月累计花费，月度目标进度
- **本月激活**：本月累计激活，月度目标进度
- **本月开户**：本月累计开户，月度目标进度
- **本月ROI**：本月平均ROI，月度目标对比

#### 2.4 排名图表（2个）
- **渠道投放花费排名**：柱状图显示Top 10渠道花费排名
- **渠道投放效果排名**：复合图表显示各渠道ROI和激活成本排名

---

### 3. 分渠道数据分析
支持按渠道和时间筛选的详细分析视图。

#### 3.1 渠道选择器
- 下拉选择框，列出所有已上传数据中存在的渠道（动态从数据库读取）
- 支持多选或单选模式
- 显示渠道总数和已选数量
- 提供"全选"、"清空"快捷操作

#### 3.2 时间筛选器
- 日期范围选择器（快捷选项：昨日、近7天、近30天、本周、本月、上月、自定义）
- 默认选中"近7天"

#### 3.3 渠道总览卡片（4个）
- **总花费**：选定渠道在时间区间内的总花费
- **总激活**：选定渠道在时间区间内的总激活数
- **总开户**：选定渠道在时间区间内的总开户数
- **ROI**：选定渠道在时间区间内的加权平均ROI

#### 3.4 分计划分析（4个图表）
- **分计划花费**：柱状图显示时间段内花费前5的计划
- **分计划激活**：柱状图显示时间段内激活前5的计划
- **分计划开户**：柱状图显示时间段内开户前5的计划
- **分计划ROI**：柱状图显示时间段内ROI前5的计划

#### 3.5 每日趋势折线图
- 可筛选渠道和时间段查看每日数据变化折线图
- 支持多指标同时展示（花费、激活、开户、ROI）
- 支持图例点击切换显示/隐藏指标

---

## 技术架构

### 前端技术栈
- **框架**：React 18 + TypeScript
- **UI组件库**：Ant Design 5.x
- **图表库**：ECharts 5.x / Ant Design Charts
- **状态管理**：Zustand（轻量级状态管理）
- **路由**：React Router v6
- **HTTP客户端**：Axios
- **构建工具**：Vite
- **代码规范**：ESLint + Prettier

### 后端技术栈
- **运行时**：Node.js 18+ / Express.js
- **数据库**：PostgreSQL 14+（或 SQLite 用于本地开发）
- **ORM**：Prisma
- **Excel解析**：xlsx / exceljs
- **API文档**：Swagger/OpenAPI
- **身份验证**：JWT（可选，初期可不做登录）

### 开发环境
- Node.js 18+
- PostgreSQL 14+（或 SQLite）
- Git

---

## 数据结构设计

### 核心数据表

#### 1. 原始数据表 (raw_data)
存储上传的Excel数据，一行对应Excel中的一行。

```sql
id: SERIAL PRIMARY KEY
channel: VARCHAR(100) NOT NULL          -- 渠道
record_date: DATE NOT NULL               -- 日期
campaign_id: VARCHAR(100) NOT NULL       -- 计划ID
campaign_name: VARCHAR(255)              -- 品种/名称（选填）
impressions: BIGINT NOT NULL DEFAULT 0   -- 曝光
clicks: BIGINT NOT NULL DEFAULT 0        -- 点击
cost: DECIMAL(15,4) NOT NULL DEFAULT 0   -- 花费
downloads: BIGINT NOT NULL DEFAULT 0     -- 下载
activations: BIGINT NOT NULL DEFAULT 0   -- 激活
credits: BIGINT NOT NULL DEFAULT 0       -- 授信
accounts: BIGINT NOT NULL DEFAULT 0      -- 开户
roi: DECIMAL(10,4) NOT NULL DEFAULT 0    -- ROI

UNIQUE(channel, record_date, campaign_id) -- 联合唯一索引，用于去重

created_at: TIMESTAMP DEFAULT NOW()      -- 首次创建时间
updated_at: TIMESTAMP DEFAULT NOW()      -- 更新时间（重复上传时更新）
```

#### 2. 上传记录表 (upload_logs)
记录每次上传操作的日志。

```sql
id: SERIAL PRIMARY KEY
filename: VARCHAR(255) NOT NULL          -- 上传文件名
record_count: INTEGER NOT NULL DEFAULT 0 -- 本次上传Excel中的总记录数
inserted_count: INTEGER NOT NULL DEFAULT 0 -- 新增条数
updated_count: INTEGER NOT NULL DEFAULT 0  -- 更新条数（重复数据）
failed_count: INTEGER NOT NULL DEFAULT 0   -- 失败条数
error_details: TEXT                         -- 错误详情JSON
uploaded_by: VARCHAR(100)                  -- 上传人
uploaded_at: TIMESTAMP DEFAULT NOW()        -- 上传时间
```

#### 3. 渠道维度表 (channels)
从 raw_data 中自动提取的渠道列表，用于下拉选择等。

```sql
id: SERIAL PRIMARY KEY
name: VARCHAR(100) NOT NULL UNIQUE       -- 渠道名称
first_seen: DATE NOT NULL                 -- 首次出现日期
last_seen: DATE NOT NULL                  -- 最近出现日期
total_records: INTEGER DEFAULT 0          -- 该渠道总记录数
```

> **说明**：channels 表不手动维护，而是通过定时任务或触发器，在 raw_data 插入/更新时自动维护。也可以每次查询 raw_data 时 DISTINCT channel。

---

## API接口设计

### 基础路径
`/api/v1`

### 1. 数据管理接口

#### POST `/data/upload`
上传Excel文件
- **Content-Type**: `multipart/form-data`
- **参数**: `file` (File)

**响应**：
```json
{
  "success": true,
  "data": {
    "upload_id": 123,
    "filename": "2026-01-15_data.xlsx",
    "total_records": 1500,
    "inserted_count": 1200,
    "updated_count": 300,
    "failed_count": 0,
    "preview": [
      {"channel": "hihonor", "record_date": "2026-01-15", "campaign_id": "10004127059", "cost": 86.38, "activations": 1, "accounts": 3, "roi": 1.2},
      // ... 前5条预览
    ]
  }
}
```

#### GET `/data/records`
查询原始数据列表
**参数**：
- `channel`: 渠道名称（可选，多个用逗号分隔）
- `start_date`: 开始日期（可选）
- `end_date`: 结束日期（可选）
- `campaign_id`: 计划ID（可选，模糊搜索）
- `page`: 页码（默认1）
- `page_size`: 每页条数（默认50，最大500）
- `sort_by`: 排序字段（可选，默认record_date）
- `sort_order`: 排序方向（asc/desc，默认desc）

**响应**：
```json
{
  "success": true,
  "data": {
    "total": 15000,
    "page": 1,
    "page_size": 50,
    "records": [
      {
        "id": 1,
        "channel": "hihonor",
        "record_date": "2026-01-15",
        "campaign_id": "10004127059",
        "campaign_name": "商店-商店搜索-行业词-精准-ocpd-240529",
        "impressions": 1154,
        "clicks": 16,
        "cost": 86.3815,
        "downloads": 7,
        "activations": 1,
        "credits": 2,
        "accounts": 3,
        "roi": 1.2,
        "created_at": "2026-01-16T10:00:00Z",
        "updated_at": "2026-01-16T10:00:00Z"
      }
    ]
  }
}
```

#### GET `/data/channels`
获取所有渠道列表（去重）
```json
{
  "success": true,
  "data": [
    "hihonor",
    "oppo",
    "vivo",
    "xiaomi"
  ]
}
```

#### GET `/data/upload-logs`
获取上传历史记录
**参数**：
- `page`: 页码（默认1）
- `page_size`: 每页条数（默认20）

```json
{
  "success": true,
  "data": {
    "total": 15,
    "logs": [
      {
        "id": 123,
        "filename": "2026-01-15_data.xlsx",
        "record_count": 1500,
        "inserted_count": 1200,
        "updated_count": 300,
        "failed_count": 0,
        "uploaded_by": "admin",
        "uploaded_at": "2026-01-16T10:00:00Z"
      }
    ]
  }
}
```

#### DELETE `/data/records/:id`
删除单条记录（管理员功能）

---

### 2. 总览数据接口

#### GET `/overview/daily`
获取昨日数据（基于 raw_data 聚合）
```json
{
  "date": "2026-01-15",
  "cost": 150000.00,
  "activations": 1200,
  "accounts": 800,
  "roi": 2.5,
  "cost_change": 0.15,
  "activations_change": 0.08,
  "accounts_change": 0.12,
  "roi_change": -0.05
}
```

#### GET `/overview/weekly`
获取本周数据
```json
{
  "start_date": "2026-01-08",
  "end_date": "2026-01-14",
  "cost": 850000.00,
  "activations": 6500,
  "accounts": 4200,
  "roi": 2.3,
  "target_cost": 1000000.00,
  "target_activations": 8000,
  "target_accounts": 5000,
  "target_roi": 2.5
}
```

#### GET `/overview/monthly`
获取本月数据
```json
{
  "month": "2026-01",
  "cost": 3500000.00,
  "activations": 28000,
  "accounts": 18500,
  "roi": 2.4,
  "target_cost": 5000000.00,
  "target_activations": 40000,
  "target_accounts": 25000,
  "target_roi": 2.5
}
```

#### GET `/overview/rankings`
获取排名数据
```json
{
  "cost_ranking": [
    {"channel": "hihonor", "cost": 500000.00},
    {"channel": "oppo", "cost": 450000.00}
  ],
  "performance_ranking": [
    {"channel": "hihonor", "roi": 3.2, "cpa": 120.50, "activations": 4150}
  ]
}
```

---

### 3. 渠道数据接口

#### GET `/channels/:channel/metrics`
获取指定渠道的指标数据
**参数**：
- `start_date`: 开始日期 (必填)
- `end_date`: 结束日期 (必填)

```json
{
  "channel": "hihonor",
  "date_range": {"start_date": "2026-01-08", "end_date": "2026-01-14"},
  "total_metrics": {
    "cost": 250000.00,
    "activations": 2000,
    "accounts": 1500,
    "roi": 2.8
  },
  "campaign_metrics": {
    "cost": [
      {"campaign_id": "10004127059", "campaign_name": "商店-商店搜索-行业词-精准-ocpd-240529", "cost": 120000.00}
    ],
    "activations": [...],
    "accounts": [...],
    "roi": [...]
  },
  "daily_trends": [
    {"date": "2026-01-08", "cost": 35000.00, "activations": 280, "accounts": 210, "roi": 2.9}
  ]
}
```

---

## 前端组件结构

### 页面组件
```
src/
├── pages/
│   ├── Dashboard/              # 总览仪表板
│   │   ├── index.tsx
│   │   ├── DailyCards.tsx      # 昨日数据卡片
│   │   ├── WeeklyCards.tsx     # 本周数据卡片
│   │   ├── MonthlyCards.tsx    # 本月数据卡片
│   │   ├── RankingCharts.tsx   # 排名图表
│   │   └── styles.css
│   ├── ChannelAnalysis/        # 渠道分析页面
│   │   ├── index.tsx
│   │   ├── ChannelSelector.tsx # 渠道选择器
│   │   ├── DateRangePicker.tsx # 时间筛选器
│   │   ├── OverviewCards.tsx   # 渠道总览卡片
│   │   ├── CampaignCharts.tsx  # 分计划图表
│   │   ├── DailyTrends.tsx     # 每日趋势图表
│   │   └── styles.css
│   └── DataManagement/         # 数据管理页面（新增）
│       ├── index.tsx
│       ├── FileUploader.tsx    # 文件上传组件
│       ├── UploadPreview.tsx   # 上传数据预览
│       ├── DataTable.tsx       # 数据列表表格
│       ├── UploadLogs.tsx      # 上传历史记录
│       └── styles.css
```

### 共享组件
```
src/
├── components/
│   ├── common/
│   │   ├── MetricCard/         # 指标卡片组件
│   │   ├── ChartContainer/     # 图表容器
│   │   ├── DataTable/          # 通用数据表格（带分页、排序、筛选）
│   │   └── DatePicker/         # 日期选择器
│   ├── charts/
│   │   ├── BarChart/
│   │   ├── LineChart/
│   │   ├── RankingChart/
│   │   └── utils.ts
│   └── layout/
│       ├── Header/
│       ├── Sidebar/
│       └── MainLayout/
```

### 状态管理
```
src/
├── stores/
│   ├── dashboardStore.ts       # 仪表板数据状态
│   ├── channelStore.ts         # 渠道数据状态
│   ├── dataManageStore.ts      # 数据管理状态（新增）
│   └── uiStore.ts
```

### API服务
```
src/
├── services/
│   ├── api/
│   │   ├── client.ts
│   │   ├── endpoints.ts
│   │   └── interceptors.ts
│   ├── dashboardService.ts
│   ├── channelService.ts
│   └── dataManageService.ts    # 数据管理服务（新增）
```

---

## 开发任务清单

### 第一阶段：项目初始化与数据库
- [ ] 创建 React + TypeScript + Vite 项目
- [ ] 配置 Ant Design、ECharts、Zustand
- [ ] 搭建 Express 后端项目结构
- [ ] 配置 Prisma ORM，创建数据库连接
- [ ] 设计并创建数据表（raw_data、upload_logs）

### 第二阶段：数据管理模块（核心）
- [ ] 实现 Excel 文件上传接口（解析 xlsx，校验表头）
- [ ] 实现增量入库逻辑（UPSERT：channel + date + campaign_id）
- [ ] 实现上传结果反馈（成功/更新/失败条数）
- [ ] 前端：文件上传组件（拖拽 + 点击）
- [ ] 前端：上传数据预览（前10条）
- [ ] 前端：上传结果提示
- [ ] 实现数据列表查询接口（分页、排序、筛选）
- [ ] 前端：数据列表页面（表格 + 分页 + 筛选）
- [ ] 实现上传历史记录接口
- [ ] 前端：上传历史页面

### 第三阶段：总览仪表板
- [ ] 实现昨日/本周/本月聚合查询接口（基于 raw_data）
- [ ] 实现渠道排名查询接口
- [ ] 前端：实现昨日/本周/本月数据卡片
- [ ] 前端：实现排名图表（花费排名、效果排名）

### 第四阶段：渠道分析页面
- [ ] 实现渠道列表接口（从 raw_data DISTINCT 获取）
- [ ] 实现渠道指标聚合接口
- [ ] 实现分计划排名接口
- [ ] 实现每日趋势接口
- [ ] 前端：渠道选择器 + 时间筛选器
- [ ] 前端：渠道总览卡片
- [ ] 前端：分计划分析图表
- [ ] 前端：每日趋势折线图

### 第五阶段：优化与完善
- [ ] 数据量大时的查询优化（索引、缓存）
- [ ] 图表性能优化
- [ ] 响应式布局适配
- [ ] 错误处理和边界情况
- [ ] 数据导出功能

---

## 数据流说明

```
用户上传Excel
    ↓
前端校验文件格式（.xlsx / .xls）
    ↓
后端解析Excel，提取数据
    ↓
后端校验每一行数据（类型、必填项）
    ↓
后端按 (渠道, 日期, 计划ID) 去重
    ↓
UPSERT 到 raw_data 表（存在则更新，不存在则插入）
    ↓
返回上传结果（成功/更新/失败条数）
    ↓
前端展示结果，刷新页面数据
    ↓
总览/渠道分析页面自动读取 raw_data 聚合数据
```

---

## 关键设计决策

1. **单表存储**：所有原始数据存储在一张 `raw_data` 表中，通过聚合查询生成报表，避免数据冗余。
2. **增量更新**：使用 `ON CONFLICT (channel, record_date, campaign_id) DO UPDATE` 实现 UPSERT，保证数据不重复。
3. **动态渠道列表**：渠道下拉框不维护静态配置表，而是从 `raw_data` 中 `SELECT DISTINCT channel` 动态获取， uploaded 什么渠道就显示什么渠道。
4. **日期处理**：Excel中的日期可能为多种格式（yyyy-MM-dd、yyyy/MM/dd、Excel序列号），后端解析时需兼容处理。
5. **数值精度**：花费使用 DECIMAL(15,4)，ROI 使用 DECIMAL(10,4)，避免浮点精度问题。

---

**开发说明**：此文档为ClaudeCode理解项目需求而编写。数据管理模块（上传、去重、入库）是项目的核心基础设施，应优先实现，之后总览和渠道分析页面才能正常工作。
