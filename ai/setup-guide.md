# Codex 编码 + Claude Code 验收：协作工作流

## 架构概览

```
┌─────────────┐     编码指令      ┌─────────────┐
│  任务清单     │ ──────────────▶  │  Codex CLI   │
│ tasks.json   │                  │  (编码者)     │
└─────────────┘                  └──────┬──────┘
       ▲                                │
       │ 修复指令                        │ git diff
       │ (如果 FAIL)                     ▼
┌──────┴──────┐    代码变更       ┌─────────────┐
│ 编排脚本     │ ◀────────────── │ Claude Code  │
│ orchestrator │                  │  (验收者)     │
└─────────────┘                  └─────────────┘
       │
       ▼
  ✅ PASS → 下一个模块
  ❌ FAIL → 带修复指令重试 (最多 3 轮)
```

## 前置条件

### 1. 安装 Codex CLI
```bash
npm i -g @openai/codex
```

### 2. 安装 Claude Code
```bash
npm i -g @anthropic-ai/claude-code
```

### 3. 配置 API Keys
```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

### 4. 安装依赖工具
```bash
brew install jq   # macOS
# apt install jq  # Linux
```

### 5. 安装项目依赖
```bash
pnpm install
```

## 快速开始

### Step 1: 确认任务清单

本项目任务清单已按 DevPlan.md 配置好，位于 `ai/tasks.json`，包含以下模块：

| 任务 ID | 描述 |
|---------|------|
| `C-01-mttoken-tests` | MTToken 合约单元测试 |
| `C-02-coursemanager-tests` | CourseManager 合约单元测试 |
| `B-01-auth-api` | 签名登录 API（SIWE + JWT）|
| `B-02-courses-api` | 课程管理 API |
| `B-03-r2-presigned-url` | R2 预签名 URL 服务 |
| `F-01-wallet-components` | 钱包连接 + Navbar + TxProgress |
| `F-02-auth-hook` | useAuth Hook + SignatureModal |
| `F-03-course-list-detail` | 课程广场 + 详情页 |
| `F-04-purchase-flow` | 购买流程（approve + purchaseCourse）|
| `F-05-profile-learning` | 个人中心 + 课程学习页 |
| `F-06-earnings-aave` | 收益中心 + AAVE 质押 |

### Step 2: 运行编排器

从项目根目录运行：

```bash
chmod +x ai/codex-claude-orchestrator.sh

# 运行全部任务
./ai/codex-claude-orchestrator.sh

# 只运行指定模块（通过自定义 tasks.json 子集）
TASKS_FILE=ai/tasks.json ./ai/codex-claude-orchestrator.sh
```

### Step 3: 查看结果

审查日志保存在 `ai/review-logs/` 目录（不提交 git）：

```
ai/review-logs/
├── C-01-mttoken-tests_codex_attempt1.log      # Codex 编码日志
├── C-01-mttoken-tests_review_attempt1.json    # Claude Code 验收报告（JSON）
├── C-01-mttoken-tests_test.log                # 测试运行日志
└── C-01-mttoken-tests_fix_instructions.txt    # FAIL 时的修复指令
```

## 配置选项

通过环境变量自定义行为：

```bash
PROJECT_DIR=./ \
TASKS_FILE=ai/tasks.json \
MAX_RETRIES=3 \
CODEX_MODEL=gpt-5.4-codex \
CLAUDE_MODEL=claude-opus-4-6 \
LOG_DIR=ai/review-logs \
./ai/codex-claude-orchestrator.sh
```

## 测试命令说明

编排器根据任务名前缀自动选择测试命令：

| 任务前缀 | 测试命令 | 说明 |
|---------|---------|------|
| `C-` | `pnpm --filter contracts test` | Hardhat 合约测试 |
| `B-` | `pnpm --filter api typecheck` | API TypeScript 类型检查 |
| `F-` | `pnpm --filter web typecheck` | 前端 TypeScript 类型检查 |
| 其他 | `pnpm typecheck` | 全量类型检查 |

## Claude Code 验收的 8 项检查

| 检查项 | 说明 |
|--------|------|
| 功能完整性 | 是否实现了所有需求 |
| 代码质量 | 有无 bug 和逻辑错误 |
| 错误处理 | 异常捕获是否充分 |
| 类型安全 | 类型定义是否完善 |
| 安全性 | 有无安全隐患 |
| 性能 | 有无性能问题 |
| 可维护性 | 代码结构和命名 |
| 测试覆盖 | 测试是否充分 |

## 注意事项

- `ai/review-logs/` 目录已加入 `.gitignore`，本地生成不提交
- 任务中涉及链上操作的（C- 任务）需确保本地 Hardhat 节点可用
- B- 和 F- 任务建议先配置好 `.env.local` 和 `.dev.vars`，避免环境变量缺失导致 typecheck 失败
