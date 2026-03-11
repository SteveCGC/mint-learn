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
# 或
brew install --cask codex
```

### 2. 安装 Claude Code
```bash
# 参考 https://code.claude.com 安装
```

### 3. 配置 API Keys
```bash
# Codex 需要 OpenAI API Key
export OPENAI_API_KEY="sk-..."

# Claude Code 需要 Anthropic API Key
export ANTHROPIC_API_KEY="sk-ant-..."
```

### 4. 安装依赖工具
```bash
# jq 用于解析 JSON
brew install jq   # macOS
# apt install jq  # Linux
```

## 快速开始

### Step 1: 准备任务清单

编辑 `tasks.json`，定义你的模块：

```json
{
  "tasks": [
    {
      "name": "模块名称",
      "coding_prompt": "给 Codex 的编码指令（越详细越好）",
      "acceptance_criteria": "给 Claude Code 的验收标准"
    }
  ]
}
```

**关键技巧**：验收标准写得越具体，Claude Code 的审查就越严格有效。

### Step 2: 运行编排器

```bash
chmod +x codex-claude-orchestrator.sh
./codex-claude-orchestrator.sh
```

### Step 3: 查看结果

审查日志保存在 `review-logs/` 目录：
- `*_codex_output.txt` — Codex 的编码输出
- `*_review_attempt*.json` — Claude Code 的验收报告
- `*_fix_instructions.txt` — 修复指令（FAIL 时生成）
- `*_test.log` — 测试运行日志

## 配置选项

通过环境变量自定义行为：

```bash
PROJECT_DIR=./my-project \
TASKS_FILE=./my-tasks.json \
MAX_RETRIES=5 \
CODEX_MODEL=gpt-5.4-codex \
CLAUDE_MODEL=claude-opus-4-6 \
./codex-claude-orchestrator.sh
```

## 工作流细节

### 每个模块的处理循环

1. **Codex 编码** — 使用 `codex exec --full-auto` 执行编码任务
2. **自动测试** — 检测项目类型，自动运行对应测试框架
3. **Claude Code 验收** — 使用 `claude -p` headless 模式审查 git diff
4. **结果判定**：
   - `PASS` → 打 git tag，进入下一模块
   - `FAIL` → 提取修复指令，交给 Codex 重试
5. **重试上限** — 默认 3 轮，超过则标记模块失败

### Claude Code 验收的 8 项检查

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

## 进阶用法

### 与 CI/CD 集成

在 GitHub Actions 中使用：

```yaml
name: AI Code Review Pipeline
on: [push]
jobs:
  codex-claude-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
      - name: Install tools
        run: |
          npm i -g @openai/codex
          # install claude code
      - name: Run orchestrator
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: ./codex-claude-orchestrator.sh
```

### 自定义验收标准

你可以在 `tasks.json` 中为每个模块定制不同的验收侧重点。例如对安全敏感模块加重安全审查权重，对数据处理模块加重性能审查权重。
