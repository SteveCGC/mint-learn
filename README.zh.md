<div align="center">

# 🪙 MintLearn

**去中心化课程学习平台 · Decentralized Course Learning Platform**

[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?logo=solidity)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![wagmi](https://img.shields.io/badge/wagmi-2.x-1C1C1C)](https://wagmi.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**[English](#overview) · [技术架构](#系统架构) · [快速开始](#快速开始)**

</div>

---

## 概览

MintLearn 是一款部署在 **Sepolia 测试网**的全栈去中心化课程平台。平台将 Web3 原生身份认证、链上资产流转、边缘计算内容分发与 DeFi 收益增值融为一体，实现了一套真正去中心化的知识经济生态。

### 核心亮点

- **零注册，钱包即账户** — 基于 EIP-191 签名的 SIWE（Sign-In With Ethereum）登录，nonce 防重放，JWT 会话管理
- **链上资产原生流转** — MT ERC20 代币驱动课程购买，`approve → transferFrom` 两步原子操作，CEI 模式防重入攻击
- **边缘计算内容鉴权** — Cloudflare Workers 验证签名 + 链上购买记录，动态生成 R2 短时效预签名 URL，课程内容零公开暴露
- **DeFi 收益增值** — 作者收益一键接入 AAVE V3 质押协议，aToken 余额实时收益可视化
- **全球边缘部署** — 前端 Cloudflare Pages + 后端 Cloudflare Workers，300+ 边缘节点，API 响应 < 200ms

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         用户浏览器                                    │
│  Next.js 14 (App Router) · wagmi v2 · viem · TanStack Query         │
│  ┌──────────────┬──────────────┬──────────────┬────────────────┐    │
│  │   课程广场   │   课程详情   │   个人中心   │   收益中心     │    │
│  └──────┬───────┴──────┬───────┴──────┬───────┴───────┬────────┘    │
│         │ MetaMask      │              │               │             │
└─────────┼──────────────┼──────────────┼───────────────┼─────────────┘
          │              │              │               │
   ┌──────▼──────────────▼──────────────▼───────────────▼──────┐
   │              Cloudflare Workers (Hono)                      │
   │  ┌──────────┬──────────────┬──────────────┬─────────────┐  │
   │  │ /auth/*  │  /courses/*  │  /content/*  │   /aave/*   │  │
   │  │  SIWE    │  元数据 CRUD │  R2 预签名   │  质押记录   │  │
   │  └────┬─────┴──────┬───────┴──────┬───────┴──────┬──────┘  │
   └───────┼────────────┼──────────────┼──────────────┼──────────┘
           │            │              │              │
   ┌───────▼──┐  ┌──────▼──────┐  ┌───▼─────┐  ┌────▼──────────┐
   │Supabase  │  │  Sepolia    │  │   R2    │  │  AAVE V3 Pool │
   │PostgreSQL│  │  测试网     │  │(课程文件)│  │  (Sepolia)    │
   │+ PgBounce│  │MT · Course  │  │  私有桶  │  │  USDT 质押   │
   └──────────┘  └─────────────┘  └─────────┘  └───────────────┘
```

### 内容安全访问链路

```
用户发起请求
    │
    ▼
① MetaMask 签名（前端 wagmi useSignMessage）
    │
    ▼
② Worker 验签：viem.verifyMessage 恢复地址
    │
    ▼
③ Prisma 查询 Supabase：purchase_records 确认购买
    │
    ▼
④ 生成 R2 预签名 URL（有效期 15 分钟，过期自动失效）
    │
    ▼
⑤ 客户端直连 R2 下载课程内容
```

---

## 技术栈

### 前端 `apps/web`

| 技术 | 用途 |
|------|------|
| **Next.js 14** (App Router) | 框架，SSG 课程列表，Edge Runtime 适配 Cloudflare Pages |
| **wagmi v2 + viem** | Web3 React Hooks 标准库，覆盖钱包连接/合约读写/交易状态/签名 |
| **TanStack Query** | 链上数据 + 服务端状态统一缓存（wagmi 底层复用同一 QueryClient）|
| **shadcn/ui + Radix UI** | 无障碍组件库，源码集成可完全定制，Dialog/Toast/Progress/Sheet |
| **Tailwind CSS** | 原子化 CSS，CSS Variables 实现亮/暗双主题 |
| **next-intl** | 基于 App Router 的路由级 i18n（`/zh/`、`/en/`），中英双语 |
| **React Hook Form + Zod** | 类型安全表单验证 |

### 后端 `apps/api`

| 技术 | 用途 |
|------|------|
| **Hono v4** | 轻量 Web 框架，专为 Cloudflare Workers 优化，类型安全路由 |
| **Cloudflare Workers** | 无服务器边缘运行时，全球 300+ 节点，冷启动 < 5ms |
| **Cloudflare R2** | S3 兼容对象存储，零出口流量费用，存储课程大文件 |
| **Prisma v5** | 类型安全 ORM，`--no-engine` 模式适配 Workers 无二进制限制 |
| **Supabase PostgreSQL** | 托管 PG，内置 PgBouncer 解决 Workers TCP 连接限制，RLS 行级安全 |
| **viem** | 服务端签名验证（`verifyMessage`），无需浏览器环境 |
| **Hono JWT** | HttpOnly Cookie JWT，SameSite=Strict 防 CSRF |

### 智能合约 `packages/contracts`

| 技术 | 用途 |
|------|------|
| **Solidity 0.8.28** | 内置溢出检查，自定义 Error 节省 Gas |
| **OpenZeppelin** | ERC20、Ownable、ReentrancyGuard 经过审计的标准实现 |
| **Hardhat** | 本地测试网、合约编译、Sepolia 部署、Gas Reporter |
| **AAVE V3** | Sepolia 测试网 Pool 合约，`supply` / `withdraw` 接口 |

---

## 智能合约设计

### MTToken.sol — ERC20 平台代币

```solidity
// 初始发行 10 亿枚，全量 mint 给 owner
// owner 可追加 mint（平台激励），任意持有者可 burn
contract MTToken is ERC20, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10 ** 18;
}
```

### CourseManager.sol — 课程管理与购买

**核心安全设计：CEI（Checks-Effects-Interactions）模式**

```solidity
function purchaseCourse(uint256 courseId) external nonReentrant {
    // ① Checks
    if (!course.isActive) revert CourseNotActive();
    if (hasPurchased[msg.sender][courseId]) revert AlreadyPurchased();

    // ② Effects（先改状态，防止重入）
    hasPurchased[msg.sender][courseId] = true;
    _userPurchases[msg.sender].push(courseId);

    // ③ Interactions（最后执行外部调用）
    bool success = mtToken.transferFrom(msg.sender, course.author, course.price);
    if (!success) revert TransferFailed();
}
```

**防双花**：`hasPurchased[user][courseId]` mapping 在 Effects 阶段先写入，即使重入也无法绕过。

---

## 安全设计

### 签名防重放

```
每次登录生成唯一 UUID nonce（TTL 5 分钟）
    ↓
用户签名后，Worker 验证 nonce 未被使用
    ↓
验证通过立即标记 usedAt，后续请求拒绝复用
    ↓
签发 JWT（HttpOnly Cookie，24h 有效期，jti 支持主动吊销）
```

### 内容访问防盗链

```
R2 Bucket 完全私有，禁止公开访问
    ↓
每次请求内容需 JWT + 链上购买记录双重验证
    ↓
预签名 URL 有效期 15 分钟，Object Key 使用 UUID 命名
    ↓
URL 泄露后 15 分钟自动失效，无法持久访问
```

### 合约安全

| 威胁 | 防护措施 |
|------|---------|
| 重入攻击 | `ReentrancyGuard` + CEI 模式 |
| 整数溢出 | Solidity 0.8.x 内置溢出检查 |
| 双花购买 | `hasPurchased` mapping 先写后调用 |
| 权限越权 | `onlyOwner` / `NotCourseAuthor` 自定义 Error |

---

## Monorepo 结构

```
mint-learn/
├── apps/
│   ├── web/                    # Next.js 前端 → Cloudflare Pages
│   │   ├── app/[locale]/       # 国际化路由（/zh/ /en/）
│   │   ├── components/         # UI 组件（shadcn/ui + 业务组件）
│   │   ├── hooks/              # 业务 Hooks（useAuth / usePurchaseCourse / useAaveStake）
│   │   └── lib/
│   │       ├── wagmi.ts        # wagmi config（Sepolia + MetaMask connector）
│   │       └── contracts.ts    # 合约 ABI + 地址（viem 格式）
│   │
│   └── api/                    # Hono API → Cloudflare Workers
│       └── src/
│           ├── routes/         # auth / courses / content / users / aave
│           ├── middleware/     # JWT 鉴权中间件
│           └── services/       # 签名验证 / R2 预签名 URL 生成
│
├── packages/
│   ├── contracts/              # Solidity 合约
│   │   └── contracts/
│   │       ├── MTToken.sol     # ERC20 平台代币
│   │       └── CourseManager.sol  # 课程管理 + 购买逻辑
│   │
│   ├── prisma/                 # 数据库 Schema（5 张表）
│   │   └── schema.prisma       # users / auth_nonces / courses / purchases / aave_positions
│   │
│   ├── types/                  # 共享 TypeScript 类型（前后端复用）
│   └── i18n/                   # 中英文翻译包（前后端共享）
│
└── .github/workflows/
    ├── deploy-web.yml          # 监听 apps/web 变更 → 独立部署 Pages
    └── deploy-api.yml          # 监听 apps/api 变更 → migrate + 部署 Workers
```

---

## 快速开始

### 环境要求

- Node.js ≥ 20
- pnpm ≥ 8
- MetaMask 浏览器插件
- Cloudflare 账号（Workers + Pages + R2）
- Supabase 项目

### 安装依赖

```bash
pnpm install
```

### 环境变量配置

```bash
# 前端
cp apps/web/.env.local.example apps/web/.env.local

# 后端（Cloudflare Workers 本地开发）
cp apps/api/.dev.vars.example apps/api/.dev.vars

# 合约部署
cp packages/contracts/.env.example packages/contracts/.env
```

填写各文件中的配置项（RPC URL、Supabase 连接串、合约地址等）。

### 数据库初始化

```bash
# 创建数据库表结构
pnpm --filter prisma exec prisma migrate dev --name init
```

### 本地开发

```bash
# 启动前端（localhost:3000）
pnpm dev:web

# 启动后端 Workers（localhost:8787）
pnpm dev:api
```

### 合约部署（Sepolia）

```bash
cd packages/contracts

# 编译合约
pnpm compile

# 运行测试
pnpm test

# 部署到 Sepolia
pnpm deploy:sepolia
```

部署成功后将输出的合约地址填入 `apps/web/.env.local`。

### shadcn/ui 组件安装

```bash
cd apps/web

# 按需安装组件（示例）
npx shadcn@latest add dialog toast progress sheet button input
```

---

## CI/CD 流水线

前后端**独立部署、独立回滚**，互不影响：

```
push to main
├── apps/web 变更 ──► GitHub Actions ──► pnpm build ──► Cloudflare Pages
└── apps/api 变更 ──► GitHub Actions ──► prisma migrate deploy ──► wrangler deploy
```

GitHub Secrets 需配置：

| Secret | 说明 |
|--------|------|
| `CF_API_TOKEN` | Cloudflare API Token |
| `CF_ACCOUNT_ID` | Cloudflare 账号 ID |
| `RPC_URL` | Alchemy/Infura Sepolia RPC |
| `DIRECT_DATABASE_URL` | Supabase 直连地址（migrate 专用） |
| `MT_TOKEN_ADDRESS` | 已部署的 MT 合约地址 |
| `COURSE_MANAGER_ADDRESS` | 已部署的 CourseManager 合约地址 |

---

## 开发路线图

- [x] **Week 1** — Monorepo 骨架、CI/CD 流水线、Prisma Schema、国际化配置
- [x] **Week 2** — 智能合约单元测试（MTToken + CourseManager，含重入攻击模拟）、MetaMask 钱包集成、NetworkGuard、Navbar
- [x] **Week 3** — SIWE 签名登录（Auth API + useAuth Hook + SignatureModal）、课程 CRUD API、R2 预签名 URL 服务、课程广场 + 发布课程页
- [x] **Week 4** — PurchaseFlow 5 状态机、TxProgress Sheet、课程详情页、个人中心页、带预签名 URL 刷新的课程学习页
- [x] **Week 5** — AAVE V3 StakePanel（approve→supply/withdraw）、EarningsChart 收益趋势图、收益中心页、i18n 全量覆盖、本地开发验证通过
- [ ] **Week 6** — 合约部署到 Sepolia、Supabase 生产 migrate、Cloudflare 部署、测试覆盖率 ≥ 85%、UI 打磨（Skeleton/响应式/Toast）、端到端演示

---

## License

[MIT](LICENSE) © 2026 MintLearn Team
