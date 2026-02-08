# FxLocus Cloudflare Pages + D1 部署

## 1. 创建 D1 数据库
1. 打开 Cloudflare 控制台 → `Workers & Pages` → `D1`。
2. 点击 **Create database**。
3. 数据库名建议：`fxlocus`。
4. 创建完成后记录 `Database ID`。

## 2. 绑定 D1 到 Pages 项目
1. 控制台 → `Workers & Pages` → 选择你的 Pages 项目。
2. 进入 `Settings` → `Functions` → `D1 database bindings`。
3. 点击 **Add binding**：
   - Variable name: `DB`
   - Database: 选择刚创建的 `fxlocus`
4. 保存。

## 3. 初始化数据库结构
在本地执行（需要 wrangler）：
```bash
npm i -g wrangler
wrangler d1 execute fxlocus --file=supabase.sql
```

## 4. 设置 Pages 环境变量
Pages 项目 → `Settings` → `Environment variables`：
- `SYSTEM_JWT_SECRET`：随机长字符串
- `APP_BASE_URL`：你的站点地址（例如 https://xxx.pages.dev）

可选：
- `RESEND_API_KEY`
- `R2_*`（如需对象存储）

## 5. 部署
Pages → `Deployments` → 选择 GitHub 仓库部署。
Build command：
```
npx @cloudflare/next-on-pages@1
```
Build output directory：
```
.vercel/output/static
```

## 6. 本地开发（可选）
```bash
npm install
npm run pages:build
npm run pages:dev
```

## 7. 创建管理员账号
```bash
D1_DATABASE_NAME=fxlocus npm run create-admin -- --email you@example.com --password StrongPassw0rd! --name "Super Admin"
```

## 8. 注意事项
- D1 是 SQLite，不支持 PostgreSQL 的 `ilike`、`timestamptz` 等语法。
- 本项目已适配 D1 语法，schema 与查询都为 SQLite 兼容写法。
