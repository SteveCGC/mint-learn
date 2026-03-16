# MintLearn 开发计划

> 版本：v1.2 | 更新：2026-03-16 | 周期：6 周 | 团队：2 人

---

## 目录

1. [整体进度看板](#1-整体进度看板)
2. [当前状态](#2-当前状态)
3. [Week 2 — 智能合约 + 钱包集成](#3-week-2--智能合约--钱包集成)
4. [Week 3 — 签名登录 + 课程管理](#4-week-3--签名登录--课程管理)
5. [Week 4 — 购买流程 + 个人中心](#5-week-4--购买流程--个人中心)
6. [Week 5 — AAVE 理财 + 收益中心](#6-week-5--aave-理财--收益中心)
7. [Week 6 — 测试 + UI 打磨 + 上线准备](#7-week-6--测试--ui-打磨--上线准备)
8. [任务依赖关系](#8-任务依赖关系)
9. [分工建议](#9-分工建议)
10. [Definition of Done](#10-definition-of-done)
11. [风险与应对](#11-风险与应对)

---

## 1. 整体进度看板

```
Week  │ 第 1 周       第 2 周       第 3 周       第 4 周       第 5 周       第 6 周
──────┼────────────────────────────────────────────────────────────────────────────
骨架  │ ████ ✅
合约  │              ████████ ✅
钱包  │              ████ ✅
登录  │                            ████ ✅
课程  │                            ████████ ✅
购买  │                                          ████████ ✅
个人  │                                          ████████ ✅
AAVE  │                                                        ████████ ✅
测试  │                                          ████ ✅       ████████      ████
UI    │                                                                      ████
部署  │ ██ ✅         ██                                                     ████
──────┴────────────────────────────────────────────────────────────────────────────
完成度  17%           33% ✅        50% ✅        67% ✅        83% ✅        100%
```

> **当前里程碑：Week 5 完成（约 83%）**
> 合约单测、所有后端 API（B-01~B-03）、全部前端模块（F-01~F-06，覆盖钱包/登录/课程/购买/个人中心/收益）均已实现并通过本地验证。
> Week 6（测试覆盖率补全、UI 打磨、Cloudflare/Supabase 生产部署）待启动。

---

## 2. 当前状态

### ✅ 已完成（Week 1）

| 交付物 | 文件位置 | 状态 |
|--------|---------|------|
| pnpm monorepo 骨架 | `package.json` / `pnpm-workspace.yaml` | ✅ |
| Next.js + wagmi + Tailwind + shadcn/ui | `apps/web/` | ✅ |
| next-intl 国际化（中/英） | `packages/i18n/` | ✅ |
| Hono + Workers API 路由骨架 | `apps/api/src/` | ✅ |
| Prisma Schema（5 张表） | `packages/prisma/schema.prisma` | ✅ |
| MTToken.sol + CourseManager.sol 骨架 | `packages/contracts/contracts/` | ✅ |
| Hardhat 配置 + 部署脚本 | `packages/contracts/` | ✅ |
| 共享类型定义 | `packages/types/src/` | ✅ |
| GitHub Actions CI/CD | `.github/workflows/` | ✅ |

### ✅ 已完成（Week 2 — 合约测试 + 钱包集成）

| 交付物 | 文件位置 | 状态 |
|--------|---------|------|
| C-01：MTToken 单元测试 | `packages/contracts/test/MTToken.test.ts` | ✅ |
| C-02：CourseManager 单元测试（含重入攻击） | `packages/contracts/test/CourseManager.test.ts` | ✅ |
| F-01：钱包连接组件（ConnectButton） | `apps/web/components/wallet/ConnectButton.tsx` | ✅ |
| F-02：网络检测守卫（NetworkGuard） | `apps/web/components/wallet/NetworkGuard.tsx` | ✅ |
| F-03：全局 Navbar（含语言切换） | `apps/web/components/layout/Navbar.tsx` | ✅ |
| SSR 水合修复（mounted 守卫） | `ConnectButton.tsx` | ✅ |
| shadcn/ui Radix UI 组件迁移 | `apps/web/components/ui/` | ✅ |

### ✅ 已完成（Week 3 — 签名登录 + 课程管理）

| 交付物 | 文件位置 | 状态 |
|--------|---------|------|
| B-01：Nonce 生成 + 签名验证 API | `apps/api/src/routes/auth.ts` | ✅ |
| B-02：课程 CRUD API（分页/搜索/排序） | `apps/api/src/routes/courses.ts` | ✅ |
| B-03：R2 上传/下载预签名 URL | `apps/api/src/services/r2.ts` | ✅ |
| F-05：useAuth Hook（SIWE 登录流程） | `apps/web/hooks/useAuth.ts` | ✅ |
| F-06：SignatureModal 组件 | `apps/web/components/wallet/SignatureModal.tsx` | ✅ |
| 首页（Hero + 精选课程 + 机制说明） | `apps/web/app/[locale]/page.tsx` | ✅ |
| 课程广场页（搜索/排序/分页） | `apps/web/app/[locale]/courses/page.tsx` | ✅ |
| 发布课程页（R2 上传 + 链上存证） | `apps/web/app/[locale]/publish/page.tsx` | ✅ |

### ✅ 已完成（Week 4 — 购买流程 + 个人中心）

| 交付物 | 文件位置 | 状态 |
|--------|---------|------|
| PurchaseFlow 组件（5 状态机） | `apps/web/components/course/PurchaseFlow.tsx` | ✅ |
| TxProgress 组件（Sheet 底部浮层） | `apps/web/components/wallet/TxProgress.tsx` | ✅ |
| 课程详情页 | `apps/web/app/[locale]/courses/[id]/page.tsx` | ✅ |
| 个人中心页（昵称编辑/已购/已发布） | `apps/web/app/[locale]/profile/page.tsx` | ✅ |
| 课程学习页（预签名 URL + 内容预览） | `apps/web/app/[locale]/profile/[courseId]/page.tsx` | ✅ |

### ✅ 已完成（Week 5 — AAVE 理财 + 收益中心）

| 交付物 | 文件位置 | 状态 |
|--------|---------|------|
| StakePanel 组件（approve → supply / withdraw） | `apps/web/components/defi/StakePanel.tsx` | ✅ |
| EarningsChart 组件（收益趋势图） | `apps/web/components/defi/EarningsChart.tsx` | ✅ |
| 收益中心页（总览卡片 + 表格 + 图表） | `apps/web/app/[locale]/earnings/page.tsx` | ✅ |
| 中英文 i18n 文案全量补全 | `packages/i18n/messages/` | ✅ |
| MetaMask SDK webpack 兼容修复 | `apps/web/next.config.mjs` | ✅ |
| 本地开发验证通过（`pnpm --filter web dev`） | — | ✅ |

### ⏳ Week 6 — 待启动

| 任务 | 说明 |
|------|------|
| C-03：部署到 Sepolia | 需要 Alchemy RPC Key + 部署私钥 |
| C-04：合约 ABI 导出 | 依赖 C-03 |
| B-04~B-06：用户/内容/购买记录 API 接入 Prisma | 需要 Supabase 账号 |
| B-07~B-08：AAVE 记录 API + 收益聚合 | 需要 Supabase 账号 |
| T-01~T-03：合约覆盖率 + 边界测试 + i18n 完整性 | — |
| U-01~U-04：响应式 + Skeleton + 空状态 + Toast | — |
| D-01~D-03：Cloudflare 部署 + Supabase 生产 migrate | 需要 Cloudflare 账号 |

### 外部依赖（需手动配置）

- Supabase 项目创建 + 数据库 migrate（需要账号）
- Cloudflare Pages / Workers / R2 项目创建（需要账号）
- Sepolia 测试网水龙头 ETH 获取（用于部署合约）
- Alchemy / Infura RPC Key 申请

---

## 3. Week 2 — 智能合约 + 钱包集成

**目标：** 合约经本地测试后部署到 Sepolia，前端完成钱包连接与合约数据读取。

### 3.1 智能合约开发与测试

#### Task C-01：MTToken 单元测试

**负责人：** 全栈开发
**文件：** `packages/contracts/test/MTToken.test.ts`

测试用例清单：

```
✓ 部署后 owner 持有全部初始供应量（10 亿 MT）
✓ owner 可以 mint 给任意地址
✓ 非 owner 调用 mint 应 revert
✓ 任意持有者可以 burn 自己的代币
✓ burn 超过余额应 revert
✓ ERC20 标准：transfer / transferFrom / approve / allowance
```

#### Task C-02：CourseManager 单元测试

**负责人：** 全栈开发
**文件：** `packages/contracts/test/CourseManager.test.ts`

测试用例清单：

```
✓ createCourse：价格为 0 应 revert InvalidPrice
✓ createCourse：成功创建并触发 CourseCreated 事件
✓ createCourse：courseCount 正确递增
✓ updateCourse：仅课程作者可更新，其他人 revert NotCourseAuthor
✓ deactivateCourse：仅作者可下架
✓ purchaseCourse：余额不足应 revert（transferFrom 失败）
✓ purchaseCourse：未 approve 应 revert
✓ purchaseCourse：成功购买，MT 从买家转到作者
✓ purchaseCourse：触发 CoursePurchased 事件
✓ purchaseCourse：重复购买应 revert AlreadyPurchased
✓ purchaseCourse：已下架课程应 revert CourseNotActive
✓ 重入攻击模拟：ReentrancyGuard 应阻止重入
✓ getUserPurchases / getAuthorCourses / checkPurchase 查询正确
```

**完成标准：** `pnpm test` 通过，覆盖率 ≥ 85%

#### Task C-03：部署到 Sepolia

**前置：** C-01、C-02 通过；Alchemy RPC + 部署私钥配置到 `.env`

```bash
cd packages/contracts
pnpm deploy:sepolia
# 记录输出的 MT_TOKEN_ADDRESS 和 COURSE_MANAGER_ADDRESS
```

部署后：
- 将合约地址更新到 `apps/web/.env.local`
- 创建 `packages/types/src/contracts.ts` 统一管理 ABI 和地址

#### Task C-04：合约 ABI 导出与类型生成

**文件：** `packages/types/src/contracts.ts`

```typescript
// 从 Hardhat 编译产物导出 ABI（viem 格式）
export const mtTokenAbi = [...] as const
export const courseManagerAbi = [...] as const

export const CONTRACT_ADDRESSES = {
  MT_TOKEN: '0x...' as `0x${string}`,
  COURSE_MANAGER: '0x...' as `0x${string}`,
} as const
```

---

### 3.2 前端钱包集成

#### Task F-01：钱包连接组件

**文件：** `apps/web/components/wallet/ConnectButton.tsx`

功能：
- 未连接：显示「连接钱包」按钮
- 已连接：显示地址缩写（`0x1234...abcd`）+ 网络徽标 + 下拉菜单
- 点击连接：调用 `wagmi useConnect` + MetaMask connector
- 未安装 MetaMask：弹出安装引导 Dialog

#### Task F-02：网络检测守卫

**文件：** `apps/web/components/wallet/NetworkGuard.tsx`

功能：
- 检测 `useChainId()` 是否为 Sepolia（chainId = 11155111）
- 若不是：顶部橙色 Banner + 「切换网络」按钮（`useSwitchChain`）
- 所有需要链上操作的页面包裹此组件

#### Task F-03：全局 Navbar

**文件：** `apps/web/components/layout/Navbar.tsx`

包含：ConnectButton + 语言切换 + 导航链接

#### Task F-04：MT 余额读取 Hook

**文件：** `apps/web/hooks/useMTBalance.ts`

```typescript
export function useMTBalance() {
  const { address } = useAccount()
  return useReadContract({
    address: CONTRACT_ADDRESSES.MT_TOKEN,
    abi: mtTokenAbi,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address },
  })
}
```

### 3.2 验收标准

- [x] `pnpm test`（合约）全部通过，覆盖率 ≥ 85%
- [ ] MTToken 和 CourseManager 成功部署到 Sepolia，可在 Etherscan 查看（待 C-03）
- [x] 前端 MetaMask 连接/断开功能正常
- [x] 非 Sepolia 网络时显示切换提示
- [ ] MT 余额可正确从链上读取显示（待合约部署 + 地址配置）

---

## 4. Week 3 — 签名登录 + 课程管理

**目标：** SIWE 登录流程打通，课程发布与列表展示完整可用。

### 4.1 后端：签名登录 API

#### Task B-01：接入 Prisma + Supabase

**前置：** Supabase 项目已创建，`.dev.vars` 填写连接串

```bash
pnpm --filter prisma exec prisma migrate dev --name init
```

在 `apps/api/src/routes/auth.ts` 中取消 TODO 注释，实现：
- `GET /auth/nonce`：写入 `auth_nonces` 表
- `POST /auth/verify`：验证签名 + UPSERT `users` 表 + 标记 nonce 已用

#### Task B-02：课程 API 实现

**文件：** `apps/api/src/routes/courses.ts`

- `GET /courses`：分页查询 Supabase `courses` 表（isActive = true）
- `GET /courses/:id`：查询单条课程 + join 作者信息
- `POST /courses`：JWT 鉴权，写入 Supabase `courses` 表
- `PUT /courses/:id`：验证作者身份后更新
- `DELETE /courses/:id`：软删除（isActive = false）

#### Task B-03：R2 上传预签名 URL

**文件：** `apps/api/src/services/r2.ts`

用 `@aws-sdk/s3-request-presigner` 替换现有占位实现，生成真实的 R2 上传/下载预签名 URL。

---

### 4.2 前端：签名登录流程

#### Task F-05：useAuth Hook

**文件：** `apps/web/hooks/useAuth.ts`

```typescript
export function useAuth() {
  // 1. GET /auth/nonce
  // 2. signMessageAsync({ message })
  // 3. POST /auth/verify
  // 4. 成功后更新登录态
}
```

#### Task F-06：SignatureModal 组件

**文件：** `apps/web/components/wallet/SignatureModal.tsx`

- shadcn/ui Dialog
- 说明签名用途（不消耗 Gas）
- 「确认签名」/ 「取消」

#### Task F-07：路由鉴权（需登录的页面）

**文件：** `apps/web/components/layout/AuthGuard.tsx`

- 检查 JWT Cookie（通过 `/users/me` 接口探测）
- 未登录则触发签名弹窗，而不是直接跳转

---

### 4.3 前端：课程功能

#### Task F-08：首页

**文件：** `apps/web/app/[locale]/page.tsx`

- Hero 区：标语 + CTA 按钮
- 精选课程（GET /courses?limit=6）
- 平台机制说明三栏
- 新手引导（localStorage 控制首次显示）

#### Task F-09：课程广场页

**文件：** `apps/web/app/[locale]/courses/page.tsx`

- 课程列表（GET /courses，TanStack Query 缓存）
- 搜索框（前端 filter 或 API 查询参数）
- CourseCard 组件
- 分页

#### Task F-10：发布课程页

**文件：** `apps/web/app/[locale]/publish/page.tsx`

- CourseForm 组件（React Hook Form + Zod 验证）
- 封面图上传 → R2 预签名 URL → 直传
- 内容文件上传（带进度条）
- `createCourse` 链上调用
- 成功后 POST /courses 写库

### 4.3 验收标准

- [x] `GET /auth/nonce` + `POST /auth/verify` API 实现完成
- [x] JWT Cookie 设置逻辑实现，`/users/me` 可返回用户信息
- [x] 课程发布完整流程（前端 + R2 预签名 URL）实现完成
- [x] 课程广场展示 + 搜索/排序功能实现完成
- [ ] 全链路联调（依赖 Supabase + R2 环境配置）

---

## 5. Week 4 — 购买流程 + 个人中心

**目标：** 学员完整购买课程并在个人中心查看、访问内容。

### 5.1 后端

#### Task B-04：用户 API 实现

**文件：** `apps/api/src/routes/users.ts`

取消所有 TODO，接入 Prisma：
- `GET /users/me`：查询 users 表
- `PUT /users/me`：更新 nickname / avatarUrl（含域名白名单校验）
- `GET /users/me/courses`：join purchase_records + courses
- `GET /users/me/authored`：join courses + 聚合购买人数/收益
- `GET /users/:address/profile`：公开信息

#### Task B-05：内容访问 API

**文件：** `apps/api/src/routes/content.ts`

- `POST /content/access`：验证 JWT + 查 purchase_records → 生成 R2 下载预签名 URL
- `POST /content/upload-url`：验证课程作者身份 → 生成 R2 上传预签名 URL

#### Task B-06：购买记录写入

链上 `CoursePurchased` 事件确认后，前端调用 `POST /purchases`（或在购买成功回调中调用），将购买记录写入 Supabase。

---

### 5.2 前端：购买流程

#### Task F-11：PurchaseFlow 组件

**文件：** `apps/web/components/course/PurchaseFlow.tsx`

5 种状态机（详见 Pages.md §4.2）：

```
State 1: 未连接 → [连接钱包]
State 2: MT 余额不足 → 提示获取代币
State 3: 已连接未授权 → [授权 MT 代币]
State 4: 已授权未购买 → [立刻购买]
State 5: 已购买 → [进入课程]
```

涉及 Hooks：
- `useMTBalance`（余额查询）
- `useReadContract`（allowance 查询）
- `useWriteContract`（approve + purchaseCourse）
- `useWaitForTransactionReceipt`（交易状态）

#### Task F-12：TxProgress 组件

**文件：** `apps/web/components/wallet/TxProgress.tsx`

- shadcn/ui Sheet（底部浮层）
- 4 种状态：等待确认 → 上链中 → 成功 → 失败
- 失败时显示原因 + 「重新发送」

#### Task F-13：课程详情页

**文件：** `apps/web/app/[locale]/courses/[id]/page.tsx`

- 完整课程信息展示
- PurchaseFlow 组件（右侧）
- 作者视角：编辑 / 下架操作

---

### 5.3 前端：个人中心

#### Task F-14：个人中心页

**文件：** `apps/web/app/[locale]/profile/page.tsx`

- 个人资料卡（昵称编辑）
- 已购课程列表（GET /users/me/courses）
- 已发布课程列表（GET /users/me/authored）
- MT 余额展示

#### Task F-15：课程学习页

**文件：** `apps/web/app/[locale]/profile/[courseId]/page.tsx`

- 访问鉴权（POST /content/access）
- 根据文件类型渲染：视频 / PDF / 下载
- 预签名 URL 第 14 分钟自动静默刷新

### 5.4 验收标准

- [x] 完整购买链路（前端）：余额检查 → approve → purchaseCourse → 链上确认 → 解锁
- [x] TxProgress 4 种状态展示正确
- [x] 个人中心可展示已购课程和发布课程（UI 实现完成）
- [x] 课程学习页权限控制（未购买跳转详情页）
- [x] 预签名 URL 静默刷新逻辑实现
- [ ] 端到端联调（依赖合约部署 + Supabase 环境）

---

## 6. Week 5 — AAVE 理财 + 收益中心

**目标：** 作者收益可视化，AAVE 质押/取回全流程可用。

### 6.1 后端

#### Task B-07：AAVE 记录 API

**文件：** `apps/api/src/routes/aave.ts`

- `POST /aave/positions`：写入 aave_positions 表
- `GET /aave/positions`：查询历史质押记录

#### Task B-08：收益聚合接口

- `GET /users/me/authored` 扩展：按天聚合 purchase_records，返回收益趋势数据

---

### 6.2 前端：AAVE 集成

#### Task F-16：useAaveStake Hook

**文件：** `apps/web/hooks/useAaveStake.ts`

- `supply(asset, amount)`：approve → AAVE Pool.supply
- `withdraw(asset, amount)`：AAVE Pool.withdraw
- 成功后调用 `POST /aave/positions` 记录

#### Task F-17：aToken 余额实时查询

```typescript
// 每 30 秒自动刷新
useReadContract({
  address: AUSDT_TOKEN_SEPOLIA,
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: [address!],
  query: { refetchInterval: 30_000 },
})
```

---

### 6.3 前端：收益中心页

**文件：** `apps/web/app/[locale]/earnings/page.tsx`

#### Task F-18：收益总览卡片

- 累计收益（Supabase 聚合）
- 可用 MT 余额（链上实时）
- AAVE 质押余额（aToken，链上实时）
- 当前 APY（AAVE API）
- 累计质押收益

#### Task F-19：StakePanel 组件

**文件：** `apps/web/components/defi/StakePanel.tsx`

- 资产选择（USDT，后续可扩展）
- 金额输入 + 「最大」按钮
- 质押 / 取回两个操作
- 完整 TxProgress 反馈

#### Task F-20：EarningsChart 组件

**文件：** `apps/web/components/defi/EarningsChart.tsx`

- 使用 Recharts 或 Chart.js
- 按天展示 MT 收入趋势
- 时间范围切换：7 天 / 30 天 / 全部

#### Task F-21：质押记录表格

- 来源：GET /aave/positions
- 列：操作类型 · 资产 · 金额 · 时间 · txHash

#### Task F-22：他人主页

**文件：** `apps/web/app/[locale]/u/[address]/page.tsx`

- 公开信息展示（GET /users/:address/profile）
- 已发布课程列表（isActive = true）

### 6.4 验收标准

- [x] AAVE supply 完整前端流程实现：approve USDT → supply → TxProgress 反馈
- [x] AAVE withdraw 完整前端流程实现
- [x] 收益总览卡片 UI 实现完成
- [x] 收益趋势图（EarningsChart）实现完成
- [x] 质押记录表格 UI 实现完成
- [ ] 链上真实数据联调（依赖 Supabase + 合约部署）

---

## 7. Week 6 — 测试 + UI 打磨 + 上线准备

**目标：** 全流程稳定，UI 完善，准备演示。

### 7.1 测试

#### Task T-01：合约覆盖率补全

```bash
cd packages/contracts
pnpm coverage
# 目标：整体 ≥ 85%，核心路径（purchaseCourse）100%
```

#### Task T-02：边界异常场景测试

手动测试以下场景：

| 场景 | 预期行为 |
|------|---------|
| MetaMask 未安装 | 弹出安装引导弹窗 |
| 连接后切换到非 Sepolia | 顶部 Banner + 切换引导 |
| MT 余额为 0 时点击购买 | 提示余额不足，不触发 MetaMask |
| 签名弹窗点击拒绝 | Toast「取消登录」，留在当前页 |
| 交易 Gas 不足 | TxProgress 失败态 + 重试按钮 |
| JWT 过期后访问个人中心 | 自动弹出签名弹窗重新登录 |
| 预签名 URL 15 分钟后访问 | 403，前端静默刷新后正常播放 |
| AAVE supply 失败 | Toast「操作失败，资产已安全回滚」|
| 断网后恢复 | React Query 自动重试，数据恢复 |

#### Task T-03：i18n 完整性检查

确保所有用户可见文案均有中英文翻译：

```bash
# 检查 zh.json 和 en.json key 数量一致
node -e "
  const zh = require('./packages/i18n/messages/zh.json')
  const en = require('./packages/i18n/messages/en.json')
  // 递归比较 key
"
```

---

### 7.2 UI 打磨

#### Task U-01：响应式适配

- 在 375px / 768px / 1280px 三种断点下验证所有页面
- 重点：购买区卡片（移动端需堆叠）、课程卡片网格

#### Task U-02：Loading 与 Skeleton

- 课程列表加载时展示 Skeleton Card
- 链上数据加载时展示 Skeleton 数字

#### Task U-03：空状态

- 课程广场无结果：「没有找到课程」+ 清空搜索按钮
- 个人中心已购为空：「还没有课程，去逛逛？」
- 收益中心无发布课程：「发布你的第一门课程」

#### Task U-04：Toast 消息统一

所有操作反馈通过 shadcn/ui Toast 统一展示，区分 success / error / warning

---

### 7.3 部署与上线

#### Task D-01：Cloudflare 环境配置

```bash
# 配置 Workers Secrets
wrangler secret put JWT_SECRET
wrangler secret put DATABASE_URL

# 创建 R2 Bucket
wrangler r2 bucket create mintlearn-courses

# 部署 API
pnpm --filter api exec wrangler deploy --env production

# 部署前端（通过 GitHub Actions 触发或手动）
git push origin main
```

#### Task D-02：Supabase 生产环境迁移

```bash
# 执行生产环境 migrate
DATABASE_URL=<direct_url> pnpm --filter prisma exec prisma migrate deploy
```

#### Task D-03：端到端演示流程验证

按以下脚本完整走一遍：

```
1. 新钱包连接（未注册用户）→ 自动注册
2. 购买 MT 代币（测试网 Faucet 获取 ETH）
3. 浏览课程广场 → 选择课程 → 授权 → 购买
4. 进入个人中心 → 查看已购课程 → 访问内容
5. 发布一门课程（另一个钱包）
6. 原钱包购买新课程 → 确认收益出现在作者收益中心
7. 作者质押收益到 AAVE → 确认 aToken 余额更新
8. 语言切换中英文
```

### 7.4 验收标准

- [ ] 合约测试覆盖率 ≥ 85%
- [ ] 所有边界场景有明确的 UI 反馈，无白屏/无响应
- [ ] 中英文翻译完整无遗漏
- [ ] 移动端（375px）核心流程可正常操作
- [ ] 端到端演示脚本全部通过
- [ ] GitHub Actions 自动部署流水线正常运行

---

## 8. 任务依赖关系

```
C-01 (MTToken 测试)
C-02 (CourseManager 测试)
    └── C-03 (Sepolia 部署)
            └── C-04 (ABI 导出)
                    ├── F-04 (MT 余额 Hook)
                    ├── F-11 (PurchaseFlow 组件)
                    └── F-16 (useAaveStake Hook)

B-01 (Prisma + Supabase)
    ├── B-02 (课程 API)
    │       └── F-09 (课程广场)
    │       └── F-10 (发布课程)
    ├── B-04 (用户 API)
    │       └── F-14 (个人中心)
    └── B-05 (内容访问 API)
            └── F-15 (课程学习页)

F-05 (useAuth) + F-06 (SignatureModal)
    └── F-07 (路由鉴权)
            ├── F-10 (发布课程)
            ├── F-14 (个人中心)
            └── F-18 (收益中心)

F-11 (PurchaseFlow) + F-12 (TxProgress)
    └── F-13 (课程详情页)

B-07 (AAVE 记录 API) + F-16 (useAaveStake)
    └── F-18/F-19/F-20/F-21 (收益中心各组件)
```

---

## 9. 分工建议

基于 2 人团队（全栈 Web3 开发者 + 前端/UI 设计开发）：

| 周次 | 全栈 Web3 开发者 | 前端/UI 设计开发 |
|------|----------------|----------------|
| Week 2 | C-01 ~ C-04（合约测试+部署）| F-01 ~ F-04（钱包集成+Navbar）|
| Week 3 | B-01 ~ B-03（后端 API+Prisma）| F-05 ~ F-10（登录+首页+课程广场+发布）|
| Week 4 | B-04 ~ B-06（用户/内容 API）| F-11 ~ F-15（购买流程+个人中心+学习页）|
| Week 5 | B-07 ~ B-08（AAVE 记录 API）| F-16 ~ F-22（AAVE Hooks+收益中心）|
| Week 6 | T-01 ~ T-03（测试+部署）| U-01 ~ U-04（UI 打磨）+ D-01 ~ D-03 |

> 每天 End-of-Day 同步一次进度，发现阻塞项及时调整。

---

## 10. Definition of Done

每个任务完成的判断标准：

| 类型 | 标准 |
|------|------|
| **合约任务** | 测试全部通过，覆盖率达标，Sepolia 部署可验证 |
| **后端 API 任务** | 接口可通过 curl / Postman 验证，Prisma 操作正确，错误返回标准格式 |
| **前端功能任务** | 功能在 Chrome + MetaMask 下完整可用，无 console error，i18n 文案已补全 |
| **UI 任务** | 在 375px / 768px / 1280px 三个断点下视觉正常，有 Loading 和空状态 |
| **整体** | 代码提交到 main 分支，CI/CD 自动部署通过 |

---

## 11. 风险与应对

| 风险 | 概率 | 影响 | 应对策略 |
|------|:----:|:----:|---------|
| Sepolia 水龙头 ETH 获取困难 | 中 | 高 | 提前申请，多个水龙头备用（Alchemy / Chainlink / QuickNode）|
| AAVE Sepolia 合约地址变更 | 低 | 高 | 地址统一在 `packages/types/src/contracts.ts` 管理，一处修改全局生效 |
| Prisma + Workers 兼容性问题 | 中 | 中 | Week 1 已验证连接，Week 3 接入时有问题优先排查 `--no-engine` 配置 |
| R2 预签名 URL 实现复杂 | 低 | 中 | Week 3 优先验证上传，Week 4 验证下载，问题早暴露 |
| 购买流程链上延迟导致用户流失 | 高 | 中 | TxProgress 组件优先开发，Sepolia 延迟属正常，加友好提示 |
| 两人工作量超出预期 | 中 | 高 | Week 5 AAVE 若延期，可在 Week 6 继续，不影响核心演示（购买流程）|
| i18n 文案遗漏 | 高 | 低 | 每个 PR 检查是否更新了翻译文件，作为 PR checklist 必选项 |

---

*文档维护：开发团队 | 任务状态更新请同步到此文档*
