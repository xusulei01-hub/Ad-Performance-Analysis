# 问题排查手册

本文档记录项目开发及部署过程中遇到的问题、根因分析和解决方案，供后续参考。

---

## 一、后端开发问题

### 1. Prisma upsert 与 @@unique 约束冲突

**现象**
```
Argument where of type ChannelMappingWhereUniqueInput needs at least one of id or unique_source_name
```

**根因**
Prisma 的 `upsert` 方法要求 `where` 条件必须包含 `@id` 或 `@@unique` 中的字段。如果 `@@unique` 的字段名和 upsert 传入的不匹配，就会报错。

**修复方案**
放弃 `upsert`，改用 `findFirst` + `update`/`create` 组合：
```typescript
const existing = await prisma.channelMapping.findFirst({
  where: { sourceName: normalizedSource },
})
if (existing) {
  await prisma.channelMapping.update({ where: { id: existing.id }, data: ... })
} else {
  await prisma.channelMapping.create({ data: ... })
}
```

---

### 2. Excel 上传匹配失败（日期格式 / 计划 ID 不一致）

**现象**
上传后系统提示日期格式和计划 ID 不一致，数据无法正确入库。

**根因**
- Excel 表头命名不统一（如 `渠道` vs `channel`，`日期` vs `date`）
- 日期格式多样（`2026/01/15`、`20260115`、Excel 序列号等）
- 计划 ID 可能混用数字和字符串

**修复方案**
1. **模糊表头匹配**：建立 header map，支持大小写、空格、下划线变体
2. **日期标准化函数**：兼容 `YYYY-MM-DD`、`YYYY/MM/DD`、`YYYYMMDD`、Excel 序列号等格式
3. **字段强制转字符串**：`String(val).trim()` 统一处理

---

### 3. 大文件上传事务超时

**现象**
```
Transaction not found. Transaction ID is invalid
```

**根因**
Prisma 的单条事务包裹大量插入/更新操作，SQLite 在并发或大事务下容易超时。

**修复方案**
去掉事务包裹，分三步处理：
1. `findMany` 批量查出已有记录，建立内存映射
2. `createMany` 批量插入新记录（每批 200 条）
3. 逐条 `update` 已有记录（避免事务竞争）

---

### 4. 同一 Excel 内重复 user_id 导致 unique constraint

**现象**
```
Unique constraint failed on the fields: (user_id)
```

**根因**
上传的 Excel 文件中存在重复 `user_id`，后端直接批量插入时触发数据库唯一索引。

**修复方案**
解析后、入库前，在内存中按 `user_id` 去重（保留第一条出现的记录）：
```typescript
const seen = new Set<string>()
const uniqueParsed = parsed.filter((row) => {
  if (seen.has(row.userId)) return false
  seen.add(row.userId)
  return true
})
```

---

### 5. 日期范围筛选参数命名不匹配

**现象**
期商分析页面筛选时间后，后端返回的数据未按时间过滤。

**根因**
前端发送的是 camelCase（`startDate`/`endDate`），但后端 Express 路由期望的是 snake_case（`start_date`/`end_date`）。

**修复方案**
统一使用 snake_case 作为 API 参数：
```typescript
// merchantService.ts
params.start_date = dateRange[0].format('YYYY-MM-DD')
params.end_date = dateRange[1].format('YYYY-MM-DD')
```

---

## 二、前端构建问题

### 6. Vite 构建内存溢出（2G 服务器）

**现象**
在 2G 内存的 ECS 上执行 `npm run build` 时：
```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed
JavaScript heap out of memory
```

**根因**
Vite + Ant Design + ECharts 等依赖打包时，2G 内存不足以完成 tree-shaking 和 chunk 生成。

**修复方案**
1. **首选方案：本地构建后上传**
   ```bash
   # 本地（Mac）
   cd client && ./node_modules/.bin/vite build
   scp -r -i alang-key.pem client/dist root@IP:/var/www/.../client/
   ```
2. **次选方案：删除 sourcemap**
   sourcemap 文件可达 10MB+，删除后 dist 从 19MB 降到 7.6MB，减少上传时间

---

### 7. npm workspaces 导致 build 命令冲突

**现象**
```
Can not use --no-workspaces and --workspace at the same time
```

**根因**
根目录 `package.json` 定义了 `workspaces: ["client", "server"]`，在 client 目录下执行 `npm run build` 时，npm 检测到 workspace 配置产生冲突。

**修复方案**
绕过 npm，直接调用 vite 二进制：
```bash
cd client && ./node_modules/.bin/vite build
```

---

## 三、服务器部署问题

### 8. SSH 连接 timeout during banner exchange

**现象**
```
Connection timed out during banner exchange
```

**根因**
服务器上 Node.js 构建 OOM 后，系统负载过高，sshd 进程无法及时响应新的 SSH 连接。

**修复方案**
通过阿里云控制台「重启实例」恢复。预防：避免在低配服务器（2G 内存）上执行前端构建。

---

### 9. Nginx 配置 $ 变量被转义导致 500

**现象**
部署后访问页面返回 `500 Internal Server Error`，错误日志：
```
rewrite or internal redirection cycle while internally redirecting to "/index.html"
```

**根因**
通过脚本写入 Nginx 配置时，`$uri` 被转义成了 `\$uri`，Nginx 将其视为字面量而非变量，导致 `try_files` 无限循环。

**修复方案**
确保 Nginx 配置中的变量符号无前导反斜杠：
```nginx
location / {
    try_files $uri $uri/ /index.html;   # 正确
    # try_files \$uri \$uri/ /index.html; # 错误！
}
```

---

### 10. 阿里云国内服务器 80 端口无法访问

**现象**
服务器本地 `curl localhost` 正常，但外部网络（手机/其他电脑）访问 `http://IP` 超时。

**根因**
阿里云中国大陆节点对未备案的服务器，会阻断 80/443 端口的入站流量。这是运营商层面的策略，与安全组无关。

**修复方案**
使用非标准端口（如 8080）绕过备案阻断：
1. Nginx `listen 8080;`
2. 安全组放行 TCP 8080
3. 访问 `http://IP:8080`

> 以后购买域名并完成备案后，可改回 80 端口并使用域名访问。

---

## 四、快速参考

### 更新部署步骤（后续迭代）

```bash
# 1. 本地修改代码 → push 到 GitHub

# 2. 服务器更新后端
ssh -i alang-key.pem root@8.136.157.93
cd /var/www/Ad-Performance-Analysis
git pull
cd server && npm run build && pm2 restart alang-server

# 3. 本地构建前端并上传
cd client && ./node_modules/.bin/vite build
rm -f dist/assets/*.map   # 减小体积
scp -r -i alang-key.pem dist root@8.136.157.93:/var/www/Ad-Performance-Analysis/client/
```

### 关键文件路径

| 文件 | 路径 |
|------|------|
| 后端 .env | `/var/www/Ad-Performance-Analysis/server/.env` |
| Nginx 配置 | `/etc/nginx/sites-available/alang-workbench` |
| PM2 进程 | `alang-server` |
| SQLite 数据库 | `/var/www/Ad-Performance-Analysis/server/prisma/dev.db` |
| 前端 dist | `/var/www/Ad-Performance-Analysis/client/dist` |
