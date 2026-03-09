# MintLearn 技术方案设计文档

> 版本：v1.1 | 日期：2026-03-09 | 状态：待评审

---

## 目录

1. [技术选型总览](#1-技术选型总览)
2. [系统架构设计](#2-系统架构设计)
3. [Monorepo 目录结构](#3-monorepo-目录结构)
4. [智能合约设计](#4-智能合约设计)
5. [后端 API 设计](#5-后端-api-设计)
6. [前端架构设计](#6-前端架构设计)
7. [数据库设计](#7-数据库设计)
8. [安全设计](#8-安全设计)
9. [国际化方案](#9-国际化方案)
10. [CI/CD 与部署方案](#10-cicd-与部署方案)
11. [性能与扩展性分析](#11-性能与扩展性分析)
12. [风险与应对策略](#12-风险与应对策略)
13. [开发排期与里程碑](#13-开发排期与里程碑)

---

## 1. 技术选型总览

### 1.1 技术栈一览表

| 层级 | 技术/框架 | 版本建议 | 选型理由 |
|------|-----------|----------|---------|
| 前端框架 | Next.js | 14.x (App Router) | SSR/SSG 支持、与 Cloudflare Pages 适配成熟 |
| 前端样式 | Tailwind CSS | 3.x | 原子化 CSS，快速开发，高度可定制 |
| 前端组件库 | shadcn/ui | latest | 基于 Radix UI，源码直接集成，完全可控 |
| **Web3 React Hooks** | **wagmi** | **2.x** | **React dApp 事实标准：内置钱包连接/合约读写/交易状态 Hook，与 TanStack Query 深度集成，大幅减少样板代码** |
| **底层 EVM 工具库** | **viem** | **2.x** | **wagmi v2 底层依赖；类型安全、Tree-shakable、比 Ethers.js 体积更小；前端合约 ABI 类型推导** |
| 后端签名验证 | viem（或 Ethers.js） | 2.x / 6.x | Workers 端 `verifyMessage` 签名恢复；viem 可在 Workers 中直接使用 |
| 后端框架 | Hono | 4.x | 轻量、类型安全、专为 Cloudflare Workers 优化 |
| 边缘运行时 | Cloudflare Workers | - | 全球边缘计算，冷启动快，与 R2/Pages 同生态 |
| 静态部署 | Cloudflare Pages | - | 与 Workers 同账号管理，零出口流量费用 |
| 文件存储 | Cloudflare R2 | - | S3 兼容 API，免出口流量，存储课程大文件 |
| 数据库 | Supabase PostgreSQL | - | 托管 PG，内置 PgBouncer，提供 RLS 权限控制 |
| ORM | Prisma | 5.x | 类型安全 ORM，支持 Workers 环境适配 |
| 智能合约 | Solidity | ^0.8.20 | 主流合约语言，EVM 生态标准 |
| 合约开发框架 | Hardhat | 2.x | 本地测试网、合约编译、Sepolia 部署一体化 |
| 包管理 | pnpm workspaces | 8.x | Monorepo 管理，依赖提升，构建速度快 |
| 国际化 | next-intl | 3.x | 与 Next.js App Router 深度集成 |
| CI/CD | GitHub Actions | - | 与代码仓库集成，按目录变更触发独立部署 |

### 1.2 wagmi vs 裸 Ethers.js 对比说明

PRD 中提到 Ethers.js，但结合 React 技术栈，引入 wagmi + viem 是更合理的选择：

| 能力 | 裸 Ethers.js | wagmi + viem |
|------|-------------|--------------|
| 钱包连接 | 手写 Context + 事件监听 | `useConnect` / `useDisconnect` 开箱即用 |
| 账户变更监听 | 手写 `accountsChanged` 监听 | 自动处理，`useAccount` 响应式更新 |
| 网络切换 | 手写 `chainChanged` 监听 | `useSwitchChain` 一行解决 |
| 合约读取 | 手写 useState + useEffect | `useReadContract`，内置缓存与 refetch |
| 发送交易 | 手写 loading/error 状态 | `useWriteContract` + `useWaitForTransactionReceipt` |
| 签名消息 | 手写 provider.getSigner() | `useSignMessage` |
| 余额查询 | 手写 balanceOf 调用 | `useBalance` / `useReadContract` |
| 类型安全 | 部分支持 | viem ABI 类型推导，合约调用参数/返回值全类型 |
| Bundle 体积 | ~300KB | viem Tree-shakable，按需引入更小 |

> **结论：** wagmi 覆盖了 dApp 开发中 80% 的重复性 Web3 交互代码。仅在需要底层自定义场景（如手动构造交易）时才直接使用 viem API。Ethers.js 仅保留在后端 Workers 签名验证中（或统一替换为 viem）。

### 1.2 核心依赖关系图

```
MetaMask (浏览器插件)
      │
      ▼
 apps/web (Next.js)          ←──────────────────────┐
      │                                              │
      │ Ethers.js 调用                               │
      │                                              │
      ├──────────────────────────────────────────────┤
      │ HTTP API 请求                  预签名 URL 返回 │
      ▼                                              │
 apps/api (Hono + Workers)                           │
      │                                              │
      ├── Prisma ──► Supabase PostgreSQL              │
      │                                              │
      └── R2 Binding ──────────────────────────────► Cloudflare R2
                                                     (课程内容文件)
      │
      ▼ (直接 RPC 调用)
 Sepolia 测试网
      ├── MT ERC20 合约
      ├── CourseManager 合约
      └── AAVE V3 Pool 合约
```

---

## 2. 系统架构设计

### 2.1 整体架构

MintLearn 采用**前后端分离 + 边缘计算 + 链上合约**三层架构：

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户浏览器                                │
│                  Next.js (Cloudflare Pages)                      │
│         ┌──────────────┬──────────────┬──────────────┐          │
│         │   课程列表页  │   课程详情页  │   个人中心页  │          │
│         └──────┬───────┴──────┬───────┴──────┬───────┘          │
│                │ MetaMask      │ 签名/调用     │                  │
└────────────────┼───────────────┼──────────────┼──────────────────┘
                 │               │              │
        ┌────────▼───────────────▼──────────────▼────────┐
        │           Cloudflare Workers (Hono API)         │
        │   ┌─────────────┬──────────────┬─────────────┐  │
        │   │  签名验证    │  课程管理 API │ R2 预签名   │  │
        │   └──────┬──────┴──────┬───────┴──────┬──────┘  │
        └──────────┼─────────────┼──────────────┼──────────┘
                   │             │              │
          ┌────────▼──────┐  ┌───▼──────┐  ┌───▼─────────┐
          │Supabase PG    │  │ Sepolia  │  │Cloudflare R2│
          │(Prisma ORM)   │  │ 测试网   │  │(课程文件)   │
          └───────────────┘  └──────────┘  └─────────────┘
```

### 2.2 核心业务流程

#### 2.2.1 用户登录流程（MetaMask 签名登录）

```
1. 前端请求 GET /api/auth/nonce?address={wallet}
2. Workers 生成随机 nonce，存入 Supabase（TTL 5 分钟）
3. 前端调用 MetaMask 对 nonce 进行签名（EIP-191 标准）
4. 前端 POST /api/auth/verify { address, signature, nonce }
5. Workers 用 Ethers.js 恢复签名地址，比对 address
6. 验证通过 → 签发 JWT（HttpOnly Cookie），写入 Supabase users 表
7. 前端获得认证态，跳转个人中心
```

#### 2.2.2 课程购买流程

```
1. 学员点击"购买课程"
2. 前端检查 MT 余额是否充足（调用 ERC20.balanceOf）
3. 若授权额度不足，弹窗引导 ERC20.approve(CourseManager, amount)
4. MetaMask 弹出授权确认，用户签名上链
5. 前端调用 CourseManager.purchaseCourse(courseId)
6. MetaMask 弹出购买确认，用户确认后发起链上交易
7. 前端轮询交易状态（等待 1-2 个区块确认）
8. 链上事件 CoursePurchased 触发，Workers 监听（或前端主动查询）
9. Workers 将购买记录写入 Supabase purchase_records 表
10. 前端展示"课程解锁成功"，可立即访问内容
```

#### 2.2.3 课程内容安全获取流程

```
1. 学员点击"查看课程内容"
2. 前端发起 POST /api/content/access { courseId }（携带 JWT Cookie）
3. Workers 验证 JWT → 查询 Supabase 确认购买记录
4. Workers 调用 R2 SDK 生成预签名 URL（有效期 15 分钟）
5. 前端通过预签名 URL 直接请求 R2 获取内容
6. URL 过期后自动失效，防止内容泄露
```

#### 2.2.4 AAVE 质押流程

```
1. 作者进入收益页，选择质押资产类型（MT / ETH / USDT）
2. 若选 MT/ETH，前端先调用链上兑换为 USDT（Uniswap/DEX）
3. 前端调用 AAVE V3 Pool.supply(USDT, amount, onBehalfOf)
4. MetaMask 弹出质押确认
5. 质押成功后，Workers 记录质押信息至 Supabase aave_positions 表
6. 收益数据页面定期轮询 AAVE aToken 余额展示收益变化
```

---

## 3. Monorepo 目录结构

```
mint-learn/
├── apps/
│   ├── web/                          # Next.js 前端应用
│   │   ├── app/
│   │   │   ├── [locale]/             # 国际化路由（zh/en）
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx          # 首页：课程列表
│   │   │   │   ├── courses/
│   │   │   │   │   ├── page.tsx      # 课程广场
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx  # 课程详情页
│   │   │   │   ├── profile/
│   │   │   │   │   └── page.tsx      # 个人中心
│   │   │   │   ├── publish/
│   │   │   │   │   └── page.tsx      # 发布课程
│   │   │   │   └── earnings/
│   │   │   │       └── page.tsx      # 收益与 AAVE 理财
│   │   │   └── api/                  # Next.js API Routes（轻量用途）
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui 组件（自动生成）
│   │   │   ├── wallet/
│   │   │   │   ├── ConnectButton.tsx # 钱包连接按钮
│   │   │   │   ├── SignatureModal.tsx # 签名确认弹窗
│   │   │   │   └── TxProgress.tsx    # 交易进度条
│   │   │   ├── course/
│   │   │   │   ├── CourseCard.tsx
│   │   │   │   ├── CourseForm.tsx    # 课程创建/编辑表单
│   │   │   │   └── PurchaseFlow.tsx  # 购买流程组件
│   │   │   └── defi/
│   │   │       ├── StakePanel.tsx    # AAVE 质押面板
│   │   │       └── EarningsChart.tsx # 收益可视化
│   │   ├── hooks/
│   │   │   ├── useAuth.ts            # 签名登录/登出 Hook（封装 wagmi useSignMessage）
│   │   │   ├── usePurchaseCourse.ts  # 购买流程 Hook（approve + purchase 原子操作）
│   │   │   └── useAaveStake.ts       # AAVE 质押/取回 Hook
│   │   │   # 注：钱包连接、余额查询、合约读写、交易状态均直接使用 wagmi 内置 Hooks
│   │   ├── lib/
│   │   │   ├── wagmi.ts              # wagmi config（chains、connectors、transports）
│   │   │   ├── contracts.ts          # 合约 ABI + 地址配置（viem ABI 格式）
│   │   │   └── api.ts                # 后端 API 请求封装
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── api/                          # Hono + Cloudflare Workers 后端
│       ├── src/
│       │   ├── index.ts              # Worker 入口，Hono 路由注册
│       │   ├── routes/
│       │   │   ├── auth.ts           # /api/auth/* 签名登录
│       │   │   ├── courses.ts        # /api/courses/* 课程管理
│       │   │   ├── content.ts        # /api/content/* R2 预签名 URL
│       │   │   ├── users.ts          # /api/users/* 用户信息
│       │   │   └── aave.ts           # /api/aave/* 质押记录
│       │   ├── middleware/
│       │   │   ├── auth.ts           # JWT 验证中间件
│       │   │   └── cors.ts           # CORS 配置
│       │   ├── services/
│       │   │   ├── signature.ts      # MetaMask 签名验证逻辑
│       │   │   ├── r2.ts             # R2 预签名 URL 生成
│       │   │   └── chain.ts          # 链上数据查询（Ethers.js）
│       │   └── db/
│       │       └── client.ts         # Prisma Client 初始化
│       ├── wrangler.toml             # Cloudflare Workers 配置
│       └── package.json
│
├── packages/
│   ├── contracts/                    # Solidity 智能合约
│   │   ├── contracts/
│   │   │   ├── MTToken.sol           # MT ERC20 代币合约
│   │   │   ├── CourseManager.sol     # 课程管理合约
│   │   │   └── interfaces/
│   │   │       └── IAavePool.sol     # AAVE V3 接口
│   │   ├── scripts/
│   │   │   └── deploy.ts             # Sepolia 部署脚本
│   │   ├── test/
│   │   │   ├── MTToken.test.ts
│   │   │   └── CourseManager.test.ts
│   │   ├── hardhat.config.ts
│   │   └── package.json
│   │
│   ├── prisma/                       # 数据库 Schema
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── package.json
│   │
│   ├── types/                        # 共享 TypeScript 类型
│   │   ├── src/
│   │   │   ├── course.ts
│   │   │   ├── user.ts
│   │   │   └── api.ts                # API 请求/响应类型
│   │   └── package.json
│   │
│   └── i18n/                         # 国际化语言包
│       ├── messages/
│       │   ├── zh.json
│       │   └── en.json
│       └── package.json
│
├── .github/
│   └── workflows/
│       ├── deploy-web.yml
│       └── deploy-api.yml
├── package.json                      # pnpm workspace 根配置
└── pnpm-workspace.yaml
```

---

## 4. 智能合约设计

### 4.1 MT ERC20 代币合约（MTToken.sol）

**功能说明：**

- 标准 ERC20 代币，符号 `MT`，精度 18 位
- 初始发行量：1,000,000,000 MT（10 亿），全部 mint 给 owner
- 支持 `mint`（仅 owner 可调用）用于后续增发测试
- 支持 `burn` 用于销毁代币

**关键接口：**

```solidity
// 核心状态变量
string public constant name = "MintLearn Token";
string public constant symbol = "MT";
uint8 public constant decimals = 18;
uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**18;

// 关键方法
function mint(address to, uint256 amount) external onlyOwner;
function burn(uint256 amount) external;
```

**安全考量：**
- 继承 OpenZeppelin `ERC20` + `Ownable`
- 不开放 public mint，防止代币通胀攻击

---

### 4.2 课程管理合约（CourseManager.sol）

**功能说明：**

- 管理课程的链上元数据（标题 hash、作者、价格、状态）
- 处理 MT 代币的 approve + transferFrom 购买逻辑
- 记录每个地址对每门课程的购买状态
- 触发购买事件供链下监听

**核心数据结构：**

```solidity
struct Course {
    uint256 id;
    address author;
    uint256 price;       // 单位：MT（最小单位）
    bytes32 metaHash;    // IPFS CID 或元数据 hash
    bool isActive;
    uint256 createdAt;
}

// 核心 Mapping
mapping(uint256 => Course) public courses;
mapping(address => mapping(uint256 => bool)) public hasPurchased;
mapping(address => uint256[]) public authorCourses;
mapping(address => uint256[]) public userPurchases;

uint256 public courseCount;
IERC20 public mtToken;
```

**关键接口：**

```solidity
// 课程操作
function createCourse(uint256 price, bytes32 metaHash) external returns (uint256 courseId);
function updateCourse(uint256 courseId, uint256 price, bytes32 metaHash) external;
function deactivateCourse(uint256 courseId) external;

// 购买
function purchaseCourse(uint256 courseId) external;

// 查询
function getUserPurchases(address user) external view returns (uint256[] memory);
function getAuthorCourses(address author) external view returns (uint256[] memory);
function checkPurchase(address user, uint256 courseId) external view returns (bool);

// 事件
event CourseCreated(uint256 indexed courseId, address indexed author, uint256 price);
event CoursePurchased(uint256 indexed courseId, address indexed buyer, uint256 price);
event CourseUpdated(uint256 indexed courseId);
```

**安全考量：**
- `purchaseCourse` 采用 Checks-Effects-Interactions 模式防止重入
- 使用 `nonReentrant`（OpenZeppelin ReentrancyGuard）
- 价格精度统一为 MT token 最小单位（wei 级别），防止精度丢失
- `transferFrom` 失败时整体回滚，保证原子性

---

### 4.3 AAVE V3 集成

AAVE 质押直接在前端通过 wagmi + viem 调用 AAVE V3 Pool 合约，**不单独封装合约层**（降低合约复杂度与审计成本）：

```typescript
// hooks/useAaveStake.ts
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { wagmiConfig } from '@/lib/wagmi';

export function useAaveStake() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const supply = async (asset: `0x${string}`, amount: bigint) => {
    // Step 1: approve USDT 给 AAVE Pool
    const approveTx = await writeContractAsync({
      address: asset,
      abi: erc20Abi,
      functionName: 'approve',
      args: [AAVE_V3_POOL_SEPOLIA, amount],
    });
    await waitForTransactionReceipt(wagmiConfig, { hash: approveTx });

    // Step 2: 调用 AAVE Pool.supply
    return writeContractAsync({
      address: AAVE_V3_POOL_SEPOLIA,
      abi: aavePoolAbi,
      functionName: 'supply',
      args: [asset, amount, address!, 0],
    });
  };

  const withdraw = async (asset: `0x${string}`, amount: bigint) => {
    return writeContractAsync({
      address: AAVE_V3_POOL_SEPOLIA,
      abi: aavePoolAbi,
      functionName: 'withdraw',
      args: [asset, amount, address!],
    });
  };

  return { supply, withdraw };
}

// 读取 aToken 余额查询收益（useReadContract 自动轮询）
const { data: aTokenBalance } = useReadContract({
  address: AUSDT_TOKEN_SEPOLIA,   // AAVE 发行的 aUSDT 地址
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: [address!],
  query: { refetchInterval: 30_000 }, // 每 30 秒刷新收益数据
});
```

**关键合约地址（Sepolia）：**

| 合约 | 地址（待填入官方最新地址） |
|------|--------------------------|
| AAVE V3 Pool | `0x...`（参考 AAVE 官方 Sepolia 文档） |
| USDC（测试） | `0x...` |
| USDT（测试） | `0x...` |

---

### 4.4 合约部署与测试策略

- 使用 Hardhat + `hardhat-ethers` 插件
- 本地测试：Hardhat Network（内存链），使用 Chai + Ethers.js 编写单元测试
- Sepolia 部署：`.env` 配置私钥 + Alchemy/Infura RPC
- 合约地址部署后写入 `packages/types/src/contracts.ts` 统一管理
- 测试覆盖率目标 ≥ 80%（核心路径 100%）

---

## 5. 后端 API 设计

### 5.1 API 路由总览

**Base URL：** `https://api.mintlearn.xyz`

| 方法 | 路由 | 描述 | 鉴权 |
|------|------|------|------|
| GET | `/auth/nonce` | 获取登录 nonce | 无 |
| POST | `/auth/verify` | 验证签名，签发 JWT | 无 |
| GET | `/courses` | 课程列表（支持分页/筛选） | 无 |
| GET | `/courses/:id` | 课程详情 | 无 |
| POST | `/courses` | 创建课程元数据 | JWT |
| PUT | `/courses/:id` | 更新课程元数据 | JWT（仅作者） |
| DELETE | `/courses/:id` | 下架课程 | JWT（仅作者） |
| POST | `/content/upload-url` | 获取 R2 上传预签名 URL | JWT |
| POST | `/content/access` | 获取 R2 下载预签名 URL | JWT（已购买） |
| GET | `/users/me` | 获取当前用户信息 | JWT |
| PUT | `/users/me` | 修改昵称等信息 | JWT |
| GET | `/users/me/courses` | 已购课程列表 | JWT |
| GET | `/users/me/authored` | 已发布课程列表 | JWT |
| GET | `/aave/positions` | AAVE 质押记录查询 | JWT |
| POST | `/aave/positions` | 记录质押操作 | JWT |

### 5.2 签名验证实现

```typescript
// apps/api/src/services/signature.ts
import { ethers } from 'ethers';

export async function verifySignature(
  address: string,
  nonce: string,
  signature: string
): Promise<boolean> {
  const message = `MintLearn 登录验证\n\nnonce: ${nonce}`;
  const recoveredAddress = ethers.verifyMessage(message, signature);
  return recoveredAddress.toLowerCase() === address.toLowerCase();
}
```

### 5.3 JWT 设计

```typescript
// JWT Payload 结构
interface JWTPayload {
  sub: string;        // wallet address（小写）
  iat: number;        // 签发时间
  exp: number;        // 过期时间（24小时）
  jti: string;        // JWT ID，用于撤销
}
```

- JWT 通过 `HttpOnly + Secure + SameSite=Strict` Cookie 存储，防止 XSS 窃取
- 签名密钥存于 Cloudflare Workers Secret（`JWT_SECRET`）
- Token 有效期 24 小时，过期后需重新签名登录

### 5.4 R2 预签名 URL 生成

```typescript
// apps/api/src/services/r2.ts
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function generatePresignedUrl(
  r2Client: S3Client,
  bucket: string,
  key: string,       // 格式：courses/{courseId}/{filename}
  expiresIn = 900    // 15 分钟
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(r2Client, command, { expiresIn });
}
```

### 5.5 Hono 路由结构示例

```typescript
// apps/api/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import authRoutes from './routes/auth';
import courseRoutes from './routes/courses';
import contentRoutes from './routes/content';

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use('*', cors({ origin: 'https://mintlearn.xyz', credentials: true }));
app.route('/auth', authRoutes);
app.route('/courses', courseRoutes);
app.use('/content/*', jwt({ secret: (c) => c.env.JWT_SECRET }));
app.route('/content', contentRoutes);

export default app;
```

---

## 5.6 用户管理设计

### 5.6.1 用户身份模型

MintLearn **不使用传统账号体系**，用户身份唯一标识为 **钱包地址（wallet address）**。

```
用户身份 = 钱包地址（小写 hex）
         ↓
         Supabase users 表主键（address 字段）
         ↓
         链上数据查询凭据（购买记录、课程创建记录）
```

**用户角色设计：无独立角色字段，能力由行为决定**

| 角色 | 判断依据 | 说明 |
|------|---------|------|
| 学员 | 任意已登录用户 | 所有人都可以买课 |
| 课程作者 | `authored_courses.length > 0` | 发布过课程即为作者 |
| 平台管理员 | `address = ADMIN_ADDRESS`（env 配置） | 仅用于敏感操作（如强制下架课程） |

同一钱包地址可同时作为学员和作者，无需切换角色。

---

### 5.6.2 注册与登录流程

采用 **Sign-In With Ethereum（SIWE / EIP-4361 简化版）** 模式，无传统注册步骤：

```
首次登录 = 自动注册
         ↓
签名验证通过后，若 users 表中无该地址记录，则自动 INSERT 新用户
```

**完整登录时序：**

```
浏览器                      Hono Worker                    Supabase
  │                             │                              │
  │── GET /auth/nonce ─────────►│                              │
  │                             │── INSERT AuthNonce ─────────►│
  │◄── { nonce } ───────────────│◄── OK ───────────────────────│
  │                             │                              │
  │  [MetaMask 弹出签名弹窗]     │                              │
  │  用户确认签名                │                              │
  │                             │                              │
  │── POST /auth/verify ───────►│                              │
  │   { address, nonce, sig }   │── SELECT nonce（验证未使用）─►│
  │                             │◄── nonce 记录 ───────────────│
  │                             │                              │
  │                             │  verifyMessage(sig) == addr? │
  │                             │                              │
  │                             │── UPSERT users（首次注册）───►│
  │                             │── UPDATE nonce.usedAt ───────►│
  │                             │◄── OK ───────────────────────│
  │                             │                              │
  │◄── Set-Cookie: jwt ─────────│                              │
  │    (HttpOnly, 24h)          │                              │
```

**nonce 生命周期：**

```
生成  → TTL 5 分钟（expiresAt 字段）
使用  → 标记 usedAt，后续请求拒绝复用（防重放）
清理  → 定期（每天）清除过期且已使用的 nonce 记录
```

---

### 5.6.3 用户数据模型（详细）

```typescript
// packages/types/src/user.ts

// 用户基础信息（对应 Supabase users 表）
interface User {
  id: string;           // CUID，内部主键
  address: string;      // 钱包地址（小写），对外标识
  nickname: string | null;
  avatarUrl: string | null;  // 可选：存 R2 图片 URL
  createdAt: Date;
  updatedAt: Date;
}

// 用户公开档案（对其他用户可见）
interface UserProfile {
  address: string;       // 地址（脱敏显示：0x1234...abcd）
  nickname: string | null;
  avatarUrl: string | null;
  authoredCoursesCount: number;  // 已发布课程数
  joinedAt: Date;
}

// 当前用户完整信息（仅本人可见，需 JWT 鉴权）
interface MyProfile extends UserProfile {
  purchasedCoursesCount: number;
  totalEarnings: bigint;       // 作为作者的累计收入（MT，最小单位）
  aaveStakedAmount: bigint;    // 当前质押余额（链上实时查询）
}
```

---

### 5.6.4 用户 API 详细设计

#### GET `/users/me` — 获取个人信息

```typescript
// Response
{
  address: "0x1234...abcd",
  nickname: "小李",
  avatarUrl: null,
  authoredCoursesCount: 3,
  purchasedCoursesCount: 12,
  joinedAt: "2026-01-01T00:00:00Z"
}
```

#### PUT `/users/me` — 修改个人信息

```typescript
// Request（仅支持修改以下字段，其余字段忽略）
{
  nickname?: string;   // 1-30 字符，过滤 XSS
  avatarUrl?: string;  // 必须是 R2 域名下的 URL，否则拒绝
}

// 验证规则
- nickname: trim 后长度 1-30，禁止 HTML 标签
- avatarUrl: 域名白名单校验（仅允许 *.r2.dev 或自定义 CDN 域）
- 需携带有效 JWT Cookie
```

#### GET `/users/me/courses` — 已购课程列表

```typescript
// Query Params
{ page?: number; pageSize?: number }  // 默认 page=1, pageSize=20

// Response
{
  total: 12,
  items: [{
    courseId: "cuid...",
    title: "区块链入门",
    authorAddress: "0xabcd...",
    authorNickname: "刘老师",
    price: "100000000000000000000",  // 100 MT，字符串避免精度丢失
    purchasedAt: "2026-02-01T00:00:00Z",
    coverImage: "https://..."
  }]
}
```

#### GET `/users/me/authored` — 已发布课程列表（含收益）

```typescript
// Response
{
  total: 3,
  items: [{
    courseId: "cuid...",
    title: "DeFi 实战",
    price: "50000000000000000000",
    isActive: true,
    purchaseCount: 42,          // 购买人数
    totalEarned: "2100000...",  // 累计收益（MT）
    createdAt: "2026-01-15T00:00:00Z"
  }]
}
```

#### GET `/users/:address/profile` — 查看他人公开档案

```typescript
// 公开接口，无需鉴权
// Response
{
  address: "0xabcd...1234",
  nickname: "刘老师",
  avatarUrl: "https://...",
  authoredCoursesCount: 5,
  joinedAt: "2026-01-01T00:00:00Z"
  // 注意：不返回收益、已购课程等敏感信息
}
```

---

### 5.6.5 Session 管理与登出

**JWT 存储策略：**

```
存储位置：HttpOnly Cookie（浏览器自动携带，JS 无法读取）
Cookie 名：ml_session
属性配置：
  - HttpOnly: true       防止 XSS 读取
  - Secure: true         仅 HTTPS 传输
  - SameSite: Strict     防止 CSRF
  - Max-Age: 86400       24 小时
  - Path: /
  - Domain: .mintlearn.xyz
```

**登出流程：**

```
前端调用 POST /auth/logout
  → Worker 设置 Set-Cookie: ml_session=; Max-Age=0（清除 Cookie）
  → 可选：将 JWT jti 写入 Supabase 黑名单表（用于主动吊销）
前端 wagmi disconnect()（清除钱包连接状态）
页面跳转回首页
```

**Token 过期处理：**

```
前端检测到 API 返回 401 Unauthorized
  → 清除本地钱包连接状态
  → Toast 提示"登录已过期，请重新签名"
  → 自动触发重新登录流程（弹出签名弹窗）
```

---

### 5.6.6 用户数据分布总览

| 数据类型 | 存储位置 | 访问控制 |
|---------|---------|---------|
| 钱包地址（身份标识） | 链上（天然存在） + Supabase | 公开 |
| 昵称、头像 | Supabase users 表 | 本人可改，公开可读 |
| 已购课程列表 | 链上（purchaseCourse 记录） + Supabase（镜像） | 仅本人（JWT 鉴权） |
| 已发布课程 | 链上（CourseManager 合约） + Supabase（镜像） | 公开可读 |
| AAVE 质押记录 | Supabase aave_positions 表 | 仅本人（JWT 鉴权） |
| 登录 nonce | Supabase auth_nonces 表 | 系统内部 |
| 课程内容文件 | Cloudflare R2 | 购买者（预签名 URL） |

---

## 6. 前端架构设计

### 6.1 页面路由规划

| 路由 | 页面 | 描述 |
|------|------|------|
| `/[locale]` | 首页 | 平台介绍 + 课程推荐 + 钱包连接入口 |
| `/[locale]/courses` | 课程广场 | 课程列表、搜索、筛选 |
| `/[locale]/courses/[id]` | 课程详情 | 课程介绍、购买按钮、内容预览 |
| `/[locale]/publish` | 发布课程 | 课程元数据填写 + 内容上传 |
| `/[locale]/profile` | 个人中心 | 已购课程、昵称修改 |
| `/[locale]/profile/[courseId]` | 课程学习 | 课程内容播放/阅读（需签名鉴权） |
| `/[locale]/earnings` | 收益中心 | 作者收益 + AAVE 质押操作 |

### 6.2 状态管理

采用**轻量状态管理**策略，避免引入 Redux 等重量级方案：

- **钱包状态**：wagmi 内置管理（`useAccount`、`useConnect`、`useSwitchChain`），无需手写 Context
- **链上数据**：wagmi `useReadContract` / `useWriteContract`，内置基于 TanStack Query 的缓存机制
- **服务端状态**：TanStack Query（wagmi 底层已集成，直接复用同一 QueryClient）管理 API 请求
- **表单状态**：React Hook Form + Zod 验证

#### wagmi 配置

```typescript
// apps/web/lib/wagmi.ts
import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { metaMask } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [
    metaMask(),
    // 后续可低成本新增 WalletConnect、Coinbase Wallet 等
  ],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL), // Alchemy/Infura RPC
  },
});
```

```typescript
// apps/web/app/[locale]/layout.tsx
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi';

const queryClient = new QueryClient();

export default function RootLayout({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

#### wagmi Hooks 使用示例（替代原手写 Hook）

```typescript
// 钱包连接（替代 useWallet）
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { metaMask } from 'wagmi/connectors';

const { address, isConnected, chain } = useAccount();
const { connect } = useConnect();
const { disconnect } = useDisconnect();
const { switchChain } = useSwitchChain();

// 切换到 Sepolia（若用户网络不对）
if (chain?.id !== sepolia.id) switchChain({ chainId: sepolia.id });

// 签名登录（替代 useWallet.signMessage）
import { useSignMessage } from 'wagmi';
const { signMessageAsync } = useSignMessage();
const signature = await signMessageAsync({ message: `MintLearn 登录验证\n\nnonce: ${nonce}` });

// 读取合约（替代 useContract + useState/useEffect）
import { useReadContract } from 'wagmi';
const { data: mtBalance } = useReadContract({
  address: MT_TOKEN_ADDRESS,
  abi: mtTokenAbi,
  functionName: 'balanceOf',
  args: [address],
});

// 发送交易（替代 useContract + useTxStatus 轮询）
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
const { writeContractAsync, data: txHash } = useWriteContract();
const { isLoading: isTxPending, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

// 购买课程（approve + purchase 封装为自定义 Hook）
// 见 hooks/usePurchaseCourse.ts
```

#### 自定义业务 Hook：usePurchaseCourse

```typescript
// hooks/usePurchaseCourse.ts
export function usePurchaseCourse(courseId: bigint, price: bigint) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // 查询当前授权额度
  const { data: allowance } = useReadContract({
    address: MT_TOKEN_ADDRESS,
    abi: mtTokenAbi,
    functionName: 'allowance',
    args: [address!, COURSE_MANAGER_ADDRESS],
  });

  const purchase = async () => {
    // Step 1: 若授权不足先 approve
    if ((allowance ?? 0n) < price) {
      const approveTx = await writeContractAsync({
        address: MT_TOKEN_ADDRESS,
        abi: mtTokenAbi,
        functionName: 'approve',
        args: [COURSE_MANAGER_ADDRESS, price],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash: approveTx });
    }
    // Step 2: 执行购买
    return writeContractAsync({
      address: COURSE_MANAGER_ADDRESS,
      abi: courseManagerAbi,
      functionName: 'purchaseCourse',
      args: [courseId],
    });
  };

  return { purchase };
}
```

### 6.3 核心组件设计

#### 钱包连接与签名弹窗

```
ConnectButton
  ├── 未连接：显示"连接钱包"按钮
  ├── 已连接：显示地址缩写 + 网络标识
  └── 错误/切换网络：显示警告状态

SignatureModal（shadcn/ui Dialog）
  ├── 说明签名用途（非交易，不消耗 Gas）
  ├── 显示待签名内容摘要
  └── "确认签名" / "取消" 操作
```

#### 交易进度组件（TxProgress）

```
TxProgress（shadcn/ui Progress + Sheet）
  ├── 状态：等待用户确认 → 已发送，等待上链 → 已确认 → 成功/失败
  ├── 显示 txHash 和 Etherscan 链接
  └── 支持"再次发送"（Gas 不足场景）
```

#### 购买流程组件（PurchaseFlow）

```
PurchaseFlow
  ├── Step 1：余额检查（MT 余额 ≥ 课程价格？）
  ├── Step 2：授权检查（allowance ≥ 课程价格？）
  │   └── 不足则触发 approve 交易
  ├── Step 3：购买交易（purchaseCourse）
  └── Step 4：成功后刷新购买状态
```

### 6.4 Cloudflare Pages 适配

```typescript
// next.config.ts
import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

const nextConfig = {
  experimental: { runtime: 'edge' },
};

// 开发环境模拟 Workers 绑定
if (process.env.NODE_ENV === 'development') {
  setupDevPlatform();
}

export default nextConfig;
```

---

## 7. 数据库设计

### 7.1 Prisma Schema

```prisma
// packages/prisma/schema.prisma

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")       // PgBouncer 连接地址
  directUrl = env("DIRECT_DATABASE_URL") // 直连地址（仅 migrate 用）
}

generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-1.0.x"] // Workers 兼容
}

model User {
  id          String    @id @default(cuid())
  address     String    @unique  // 钱包地址（小写）
  nickname    String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  authoredCourses  Course[]         @relation("CourseAuthor")
  purchases        PurchaseRecord[]
  aavePositions    AavePosition[]
  nonces           AuthNonce[]
}

model AuthNonce {
  id        String   @id @default(cuid())
  address   String
  nonce     String   @unique
  usedAt    DateTime?
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [address], references: [address])

  @@index([address])
  @@index([expiresAt])
}

model Course {
  id           String    @id @default(cuid())
  chainId      Int       // 链上课程 ID
  authorAddress String
  title        String
  description  String?
  price        BigInt    // MT 代币最小单位
  coverImage   String?   // R2 对象 Key
  contentKey   String?   // R2 对象 Key（付费内容）
  metaHash     String    // 链上 metaHash
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  author    User             @relation("CourseAuthor", fields: [authorAddress], references: [address])
  purchases PurchaseRecord[]

  @@index([authorAddress])
  @@index([chainId])
}

model PurchaseRecord {
  id            String   @id @default(cuid())
  userAddress   String
  courseId      String
  txHash        String   @unique  // 链上交易 hash
  price         BigInt
  purchasedAt   DateTime @default(now())

  user   User   @relation(fields: [userAddress], references: [address])
  course Course @relation(fields: [courseId], references: [id])

  @@unique([userAddress, courseId])
  @@index([userAddress])
}

model AavePosition {
  id           String   @id @default(cuid())
  userAddress  String
  asset        String   // 资产类型（USDT/USDC）
  amount       BigInt   // 存入金额
  txHash       String   @unique
  action       String   // "supply" | "withdraw"
  createdAt    DateTime @default(now())

  user User @relation(fields: [userAddress], references: [address])

  @@index([userAddress])
}
```

### 7.2 Supabase RLS 策略

```sql
-- 用户只能读写自己的数据
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_self_only" ON "User"
  USING (address = current_setting('app.user_address'));

-- 购买记录只能被购买者查看
ALTER TABLE "PurchaseRecord" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchase_owner" ON "PurchaseRecord"
  USING ("userAddress" = current_setting('app.user_address'));
```

**注：** Prisma 在 Workers 中通过 `SET LOCAL app.user_address = ?` 在事务内设置 RLS 上下文，确保数据隔离。

---

## 8. 安全设计

### 8.1 MetaMask 签名安全

| 威胁 | 应对措施 |
|------|---------|
| 签名重放攻击 | nonce 一次性使用，验证后立即标记 `usedAt`，TTL 5 分钟 |
| 钓鱼签名 | 签名消息包含明确平台标识和 nonce，用户可在 MetaMask 中查看 |
| 签名过期 | JWT 有效期 24 小时，过期后需重新发起签名流程 |
| 地址欺骗 | 后端 `ethers.verifyMessage` 从签名恢复地址，不信任前端传入地址 |

### 8.2 智能合约安全

| 威胁 | 应对措施 |
|------|---------|
| 重入攻击 | OpenZeppelin `ReentrancyGuard` + CEI 模式 |
| 整数溢出 | Solidity 0.8.x 内置溢出检查 |
| 权限控制 | `onlyOwner`、`onlyCourseAuthor` modifier |
| 双花购买 | `hasPurchased[user][courseId]` mapping 防止重复购买 |
| 合约升级 | 当前版本不使用代理模式（测试阶段），降低复杂度 |

### 8.3 内容访问安全

- R2 Bucket 设置为**私有**，禁止公开访问
- 预签名 URL 有效期 **15 分钟**，防止 URL 泄露导致的内容盗用
- 每次请求内容均需重新验证 JWT + 链上购买记录
- URL 不包含任何可推测的规律，Object Key 使用 UUID 命名

### 8.4 API 安全

- CORS：仅允许 `https://mintlearn.xyz` 跨域
- Rate Limiting：Cloudflare Workers 内置 IP 限速（`/auth/nonce` 接口限制每 IP 10 次/分钟）
- Helmet 类安全响应头：通过 Hono middleware 设置 `X-Content-Type-Options`、`X-Frame-Options` 等

---

## 9. 国际化方案

### 9.1 路由结构

```
/zh/courses      ← 中文
/en/courses      ← 英文
/courses         ← 重定向到 /zh/courses（默认语言）
```

### 9.2 翻译文件结构

```json
// packages/i18n/messages/zh.json
{
  "common": {
    "connect_wallet": "连接钱包",
    "sign_in": "签名登录",
    "loading": "加载中..."
  },
  "course": {
    "purchase": "立刻购买",
    "approve_first": "请先授权 MT 代币",
    "purchase_success": "课程购买成功！"
  },
  "errors": {
    "insufficient_balance": "MT 余额不足，请先购买代币",
    "tx_failed": "交易失败：{reason}",
    "network_mismatch": "请切换到 Sepolia 测试网"
  },
  "aave": {
    "stake": "一键质押 AAVE",
    "withdraw": "取回资产",
    "current_apy": "当前年化收益率"
  }
}
```

### 9.3 next-intl 配置

```typescript
// apps/web/i18n.ts
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`../../packages/i18n/messages/${locale}.json`)).default
}));
```

---

## 10. CI/CD 与部署方案

### 10.1 部署架构

```
代码推送至 main 分支
        │
        ├── apps/web 或 packages/types 变更
        │       └─► GitHub Actions: deploy-web.yml
        │                   └─► pnpm build (apps/web)
        │                   └─► Cloudflare Pages Deploy
        │
        └── apps/api 或 packages/prisma/types 变更
                └─► GitHub Actions: deploy-api.yml
                        └─► pnpm build (apps/api)
                        └─► prisma migrate deploy
                        └─► wrangler deploy
```

### 10.2 GitHub Actions 配置

```yaml
# .github/workflows/deploy-web.yml
name: Deploy Web
on:
  push:
    branches: [main]
    paths:
      - 'apps/web/**'
      - 'packages/types/**'
      - 'packages/i18n/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 8 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter web build
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}
          NEXT_PUBLIC_MT_TOKEN_ADDRESS: ${{ secrets.MT_TOKEN_ADDRESS }}
          NEXT_PUBLIC_COURSE_MANAGER_ADDRESS: ${{ secrets.COURSE_MANAGER_ADDRESS }}
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          projectName: mintlearn-web
          directory: apps/web/.vercel/output/static
```

```yaml
# .github/workflows/deploy-api.yml
name: Deploy API
on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'packages/prisma/**'
      - 'packages/types/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 8 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter prisma exec prisma migrate deploy
        env:
          DIRECT_DATABASE_URL: ${{ secrets.DIRECT_DATABASE_URL }}
      - run: pnpm --filter api exec wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
```

### 10.3 环境变量管理

| 变量 | 存储位置 | 说明 |
|------|---------|------|
| `DATABASE_URL` | Workers Secret | Supabase PgBouncer 连接串 |
| `DIRECT_DATABASE_URL` | GitHub Secrets | Supabase 直连（仅 migrate） |
| `JWT_SECRET` | Workers Secret | JWT 签名密钥 |
| `R2_BUCKET_NAME` | wrangler.toml | R2 Bucket 名称 |
| `NEXT_PUBLIC_API_URL` | Cloudflare Pages Env | 后端 API 地址 |
| `NEXT_PUBLIC_MT_TOKEN_ADDRESS` | Cloudflare Pages Env | MT 合约地址 |
| `NEXT_PUBLIC_COURSE_MANAGER_ADDRESS` | Cloudflare Pages Env | 课程合约地址 |

---

## 11. 性能与扩展性分析

### 11.1 各阶段容量估算

| 阶段 | 日活用户 | 服务层 | 预计费用 |
|------|---------|--------|---------|
| 测试阶段 | ≤ 1,000 | CF Workers 免费层（10万次/天）+ Supabase 免费层 | $0/月 |
| 早期运营 | 1,000 – 10,000 | CF Workers $5/月 + Supabase Pro $25/月 | ~$30/月 |
| 成长阶段 | 10,000+ | CF Workers 按量计费 + Supabase 扩容 | 按量线性增长 |

### 11.2 性能瓶颈分析

| 环节 | 预期延迟 | 瓶颈说明 |
|------|---------|---------|
| API 响应（签名验证/元数据查询） | < 200ms | Workers 边缘节点，全球分发 |
| 课程内容加载（R2 预签名 URL） | < 100ms | R2 与 Workers 同区域，无出口流量费 |
| 链上交易（购买/质押） | 15s – 60s | 受 Sepolia 出块速度限制，需异步轮询 |
| 页面首屏 | < 1.5s | Next.js SSG + Cloudflare CDN 边缘缓存 |

### 11.3 优化策略

- 课程列表页 SSG 预渲染，降低首屏时间
- 链上交易全部异步处理，前端 Toast + 进度条给予即时反馈
- API 响应添加合适的 `Cache-Control` 头，对公开课程数据开启边缘缓存
- Supabase 常用查询字段建立索引（已在 Prisma Schema 中声明）

---

## 12. 风险与应对策略

| 风险 | 严重程度 | 概率 | 应对策略 |
|------|---------|------|---------|
| Sepolia 测试网 RPC 不稳定 | 高 | 中 | 配置多个备用 RPC（Alchemy + Infura + 公共 RPC 轮转） |
| AAVE Sepolia 合约地址变更 | 中 | 低 | 合约地址统一配置在 `packages/types/contracts.ts`，一处修改全局生效 |
| Workers 免费层请求超限 | 中 | 低 | 监控请求量，超 8 万/天时升级到 $5/月 付费层 |
| MetaMask 新手用户体验差 | 中 | 高 | 首页新手引导（步骤说明、视频演示），签名弹窗配详细说明 |
| R2 预签名 URL 被截获分享 | 中 | 中 | URL 有效期 15 分钟，过期后需重新鉴权获取 |
| 合约存在安全漏洞 | 高 | 低 | OpenZeppelin 基础库 + 测试覆盖率 ≥ 80% + 上线前人工审计 |
| Prisma Workers 兼容性问题 | 中 | 中 | 使用 `prisma generate --no-engine`，提前验证 Workers 环境 |
| 国际化文案维护遗漏 | 低 | 高 | 将 i18n 文案更新纳入 PR checklist，CI 中增加 i18n key 完整性检查 |

---

## 13. 开发排期与里程碑

### 13.1 甘特图（6 周）

```
周次  │ 第 1 周   │ 第 2 周   │ 第 3 周   │ 第 4 周   │ 第 5 周   │ 第 6 周
──────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────
骨架  │ ████████ │          │          │          │          │
合约  │          │ ████████ │          │          │          │
课程  │          │          │ ████████ │ ████████ │          │
AAVE  │          │          │          │          │ ████████ │
测试  │          │          │          │    ████  │ ████████ │ ████████
部署  │    ██    │    ██    │          │          │          │ ████████
```

### 13.2 各阶段验收标准

**第一阶段（第 1 周）：项目骨架**

- [ ] pnpm monorepo 初始化完成，6 个工作区可独立构建
- [ ] Cloudflare Pages + Workers 部署流水线跑通（Hello World 级别）
- [ ] Supabase 数据库初始化，Prisma migrate 在 Workers 环境验证通过
- [ ] Tailwind CSS + shadcn/ui 基础主题配置完成

**第二阶段（第 2 周）：智能合约**

- [ ] MT ERC20 合约本地测试通过，Sepolia 部署成功
- [ ] CourseManager 合约本地测试通过，Sepolia 部署成功
- [ ] 前端 MetaMask 连接、切换网络、余额查询功能可用
- [ ] 合约 ABI 和地址导入前端 lib 层

**第三阶段（第 3–4 周）：核心业务流程**

- [ ] 完整课程发布流程（填写 → 内容上传 R2 → 链上存证）
- [ ] 完整购买流程（余额检查 → approve → purchaseCourse → 链上确认 → 解锁）
- [ ] MetaMask 签名登录 + JWT 鉴权流程
- [ ] 个人中心：已购课程列表、内容安全获取（R2 预签名 URL）
- [ ] 中英文国际化切换可用

**第四阶段（第 5–6 周）：AAVE 理财与完善**

- [ ] AAVE 质押/取回功能完整流程
- [ ] 收益可视化页面（余额、APY 展示）
- [ ] 全流程边界异常处理（余额不足、网络切换、签名过期等）
- [ ] UI 整体优化，响应式适配
- [ ] 核心合约单测覆盖率 ≥ 80%
- [ ] 部署至 Sepolia + Cloudflare 环境，提交演示

### 13.3 技术债与后续迭代

以下内容在当前版本有意推迟，待 v1 稳定后迭代：

- 合约可升级代理模式（当前为不可升级版本）
- 多链支持（EVM 同构链扩展）
- 移动端 Web3 钱包适配（WalletConnect）
- 课程内容 DRM 保护（视频加密流）
- 链上治理模块（DAO 投票）

---

*文档维护：开发团队 | 如有问题请在 GitHub Issues 提交*
