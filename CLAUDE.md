# MintLearn — Claude Code 上下文

## 项目文档

- 产品需求文档（PRD）：@docs/PRD.md
- 技术方案设计：@docs/TechDesign.md
- 页面与功能说明：@docs/Pages.md
- 开发计划：@docs/DevPlan.md

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

## AI 协作开发

本项目使用 **Codex（编码）+ Claude Code（验收）** 双 AI 编排工作流，配置在 `ai/` 目录。

### 任务清单

任务按模块拆分为三个文件，位于 `ai/tasks/`：

| 文件 | 任务 | 说明 |
|------|------|------|
| `ai/tasks/contracts.json` | C-01, C-02 | Solidity 合约单元测试 |
| `ai/tasks/backend.json` | B-01, B-02, B-03 | Hono API + R2 预签名 URL |
| `ai/tasks/frontend.json` | F-01 ~ F-06 | React 组件 + 页面 |

任务 ID 前缀规则：`C-` = 合约，`B-` = 后端，`F-` = 前端。前缀同时决定编排器自动选择的测试命令。

### 运行编排器

```bash
# 全部任务（自动检测 ai/tasks/ 目录）
./ai/codex-claude-orchestrator.sh

# 只跑某类任务
TASKS_FILE=ai/tasks/contracts.json ./ai/codex-claude-orchestrator.sh
TASKS_FILE=ai/tasks/backend.json   ./ai/codex-claude-orchestrator.sh
TASKS_FILE=ai/tasks/frontend.json  ./ai/codex-claude-orchestrator.sh
```

日志保存在 `ai/review-logs/`（已加入 .gitignore，不提交）。
详细使用说明参考 `ai/setup-guide.md`。

### Claude Code 验收标准

每个任务由 Claude Code 按 8 项标准打分（功能完整性、代码质量、错误处理、类型安全、安全性、性能、可维护性、测试覆盖），全部通过才标记为 PASS，否则将修复指令反馈给 Codex 重试（最多 3 轮）。
