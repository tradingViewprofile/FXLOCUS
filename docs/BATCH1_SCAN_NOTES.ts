/**
 * Batch 1 - 项目扫描速记（供 Batch 2/3 对接）
 *
 * 关键目录/路由
 * - `app/`：RootLayout 在 `app/layout.tsx`，全局样式 `app/globals.css`
 * - i18n 路由前缀：`app/[locale]/...`（`[locale]` = `zh` | `en`），入口页 `app/[locale]/page.tsx`
 * - i18n 配置：`i18n/routing.ts`, `i18n/navigation.ts`, `i18n/request.ts`
 * - locale middleware：`middleware.ts`（`/` 重定向到 `/${defaultLocale}`，matcher `/(zh|en)/:path*`）
 * - 文案命名空间：`messages/zh/*.json` 与 `messages/en/*.json`
 *
 * 全站 Header / Nav（桌面 + 移动端）
 * - 组件：`components/SiteHeader.tsx`
 * - 链接来源：组件内 `navItems`（`useMemo` 里写死数组），显示文案来自 `messages/en/nav.json` 与 `messages/zh/nav.json`（`useTranslations("nav")`）
 * - 移动端菜单：同一份 `navItems` 复用（避免两处不一致）
 *
 * 首页 about / 了解我们 视频播放器
 * - 区块位置：`app/[locale]/page.tsx` -> `<Section id="home-content" ...>` 内
 * - 播放器组件：`components/media/VideoPlayer.tsx`
 * - “中文控件竖排”根因倾向：控件文案在窄宽/被样式影响时发生逐字换行（中文允许任意字断行，视觉像竖排）
 *   - 修复策略：对播放器控件做样式隔离（强制 `writing-mode: horizontal-tb` / `text-orientation: mixed`）
 *   - 并对按钮/label 等加 `whitespace-nowrap`，让“静音/音量/倍速/清晰度/全屏”等不在词内断行，而改为控件整体换行
 *
 * 首页 “思想输出：文章×视频×课程” Tab
 * - 组件：`components/home/ContentMatrixTabs.tsx`
 * - 数据来自：`app/[locale]/page.tsx` 调 `getDataProvider().listInsights/listVideos/listCourses`
 * - 现状：视频/课程 Tab 复用类似“文章卡片”的信息结构（标题+摘要为主），未体现缩略图/课程信息等“分形态呈现”
 */

export {};
