# MintLearn — Claude Code 上下文

## 项目文档

- 产品需求文档（PRD）：@docs/PRD.md
- 技术方案设计：@docs/TechDesign.md
- 页面与功能说明：@docs/Pages.md

## 项目简介

MintLearn 是部署在 Sepolia 测试网的去中心化课程平台。
Monorepo（pnpm workspaces），6 个工作区：

- `apps/web` — Next.js 14 前端，部署 Cloudflare Pages
- `apps/api` — Hono + Cloudflare Workers 后端
- `packages/contracts` — Solidity 合约（MTToken + CourseManager）
- `packages/prisma` — Prisma Schema，连接 Supabase PostgreSQL
- `packages/types` — 共享 TypeScript 类型
- `packages/i18n` — 中英文翻译包

## 技术栈要点

- Web3：wagmi v2 + viem（前端），viem verifyMessage（后端签名验证）
- 样式：Tailwind CSS + shadcn/ui（源码集成）
- 国际化：next-intl，路由级切换（/zh/ /en/）
- 数据库：Prisma + Supabase PgBouncer，Workers 环境用 `--no-engine`

## 开发规范

- 所有 token 金额使用 `bigint`，禁止用 `number` 或 `float`
- API 响应中金额字段统一用字符串（避免 JSON 精度丢失）
- 合约调用遵循 CEI（Checks-Effects-Interactions）模式
- 新增用户可见文案必须同步更新 `packages/i18n/messages/zh.json` 和 `en.json`
