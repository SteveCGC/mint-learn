<div align="center">

# 🪙 MintLearn

**Decentralized Course Learning Platform on Ethereum**

[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?logo=solidity)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![wagmi](https://img.shields.io/badge/wagmi-v2-1C1C1C)](https://wagmi.sh/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**[中文文档](README.zh.md)**

*A full-stack Web3 course platform that combines on-chain asset flow, edge-computed content delivery, and DeFi yield generation.*

</div>

---

## Overview

MintLearn is a decentralized course marketplace deployed on the **Sepolia testnet**. Instructors publish courses on-chain, students purchase them with MT tokens, and course revenues are compounded through **AAVE V3** lending pools — all gated by cryptographic signatures rather than traditional account systems.

### What Makes It Technically Interesting

- **Wallet-native auth** — Sign-In With Ethereum (SIWE / EIP-191) with single-use nonces, no passwords, no OAuth
- **Atomic two-step purchase** — `ERC20.approve` + `CourseManager.purchaseCourse` with Checks-Effects-Interactions reentrancy protection
- **Zero-trust content delivery** — Cloudflare Workers verify both the JWT *and* on-chain purchase record before issuing a time-limited R2 presigned URL; the bucket is never publicly accessible
- **DeFi yield layer** — Course earnings flow directly into AAVE V3 `supply()`, with aToken balance polled in real time via `useReadContract`
- **Edge-first architecture** — API responses < 200ms globally; the only real latency bottleneck is Sepolia's block time (~12s), handled with async polling and optimistic UI

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          Browser                                  │
│   Next.js 14 (App Router) · wagmi v2 · viem · TanStack Query    │
│   ┌────────────┬────────────┬───────────────┬──────────────┐    │
│   │  Course    │  Course    │   My Profile  │   Earnings   │    │
│   │  Explore   │  Detail    │   + Learning  │   + AAVE     │    │
│   └─────┬──────┴─────┬──────┴───────┬───────┴──────┬───────┘    │
│         │ MetaMask   │              │              │             │
└─────────┼────────────┼──────────────┼──────────────┼────────────┘
          │            │              │              │
   ┌──────▼────────────▼──────────────▼──────────────▼───────┐
   │                 Cloudflare Workers (Hono)                 │
   │  ┌──────────┬────────────┬─────────────┬──────────────┐  │
   │  │ /auth    │ /courses   │ /content    │ /aave        │  │
   │  │  SIWE    │  CRUD +    │  R2 presign │  position    │  │
   │  │  JWT     │  pagination│  URL (15m)  │  records     │  │
   │  └────┬─────┴──────┬─────┴──────┬──────┴──────┬───────┘  │
   └───────┼────────────┼────────────┼─────────────┼───────────┘
           │            │            │             │
    ┌──────▼───┐  ┌─────▼──────┐  ┌─▼────────┐  ┌▼──────────────┐
    │Supabase  │  │  Sepolia   │  │   R2     │  │  AAVE V3 Pool │
    │PostgreSQL│  │  Testnet   │  │ (private)│  │   (Sepolia)   │
    │PgBouncer │  │MT · Course │  │          │  │ USDT supply/  │
    │RLS       │  │  Manager   │  │          │  │ withdraw      │
    └──────────┘  └────────────┘  └──────────┘  └───────────────┘
```

### Content Access Flow

```
1  User clicks "Access Course"
      │
2  Worker validates JWT (HttpOnly cookie, HMAC-SHA256)
      │
3  Prisma queries Supabase → confirms purchase_records row exists
      │
4  Worker calls R2 presign API → generates URL with 15-minute TTL
      │
5  Client streams content directly from R2 (URL expires and is non-reusable)
```

---

## Tech Stack

### Frontend — `apps/web`

| Technology | Role |
|-----------|------|
| **Next.js 14** (App Router) | Framework; SSG for course listings, Edge Runtime for Cloudflare Pages compatibility |
| **wagmi v2 + viem** | The React Web3 standard — covers wallet connection, contract reads/writes, tx receipt polling, and message signing; eliminates ~500 lines of boilerplate vs raw ethers.js |
| **TanStack Query** | Shared cache for both on-chain data and REST API responses; wagmi reuses the same `QueryClient` |
| **shadcn/ui + Radix UI** | Accessible, source-owned component library; `Dialog`, `Toast`, `Progress`, `Sheet` for wallet flows |
| **Tailwind CSS** | Utility-first styling with CSS Variables for light/dark theming |
| **next-intl** | Route-based i18n (`/en/courses`, `/zh/courses`); translation keys shared with the API package |
| **React Hook Form + Zod** | End-to-end type-safe form validation |

### Backend — `apps/api`

| Technology | Role |
|-----------|------|
| **Hono v4** | Ultralight web framework built for Cloudflare Workers; fully typed routes with Zod validators |
| **Cloudflare Workers** | Serverless edge runtime; < 5ms cold start, globally distributed |
| **Cloudflare R2** | S3-compatible object storage with zero egress fees; all course files live here, never publicly exposed |
| **Prisma v5** | Type-safe ORM with `--no-engine` flag for Workers compatibility (no binary dependencies) |
| **Supabase PostgreSQL** | Managed Postgres with built-in PgBouncer (critical for Workers' TCP connection limits) and Row Level Security |
| **viem** | Server-side `verifyMessage` for SIWE signature recovery — no browser environment needed |

### Smart Contracts — `packages/contracts`

| Technology | Role |
|-----------|------|
| **Solidity 0.8.28** | Built-in overflow protection; custom `error` types to reduce gas vs `require` strings |
| **OpenZeppelin v5** | Battle-tested `ERC20`, `Ownable`, `ReentrancyGuard` |
| **Hardhat** | Local testnet, compilation, Sepolia deployment, gas reporter |
| **AAVE V3** | Sepolia Pool contract — `supply()` and `withdraw()` for yield generation |

---

## Smart Contract Design

### MTToken — Platform ERC20

```solidity
contract MTToken is ERC20, Ownable {
    // 1 billion initial supply minted to owner
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10 ** 18;

    function mint(address to, uint256 amount) external onlyOwner;
    function burn(uint256 amount) external; // open to any holder
}
```

### CourseManager — Course Registry & Purchase

The purchase flow uses the **Checks-Effects-Interactions** pattern to prevent reentrancy, with `ReentrancyGuard` as an additional safety net:

```solidity
function purchaseCourse(uint256 courseId) external nonReentrant {
    Course storage course = courses[courseId];

    // ── Checks ──────────────────────────────────────────────
    if (!course.isActive)                    revert CourseNotActive();
    if (hasPurchased[msg.sender][courseId])  revert AlreadyPurchased();

    // ── Effects (state written BEFORE external call) ─────────
    hasPurchased[msg.sender][courseId] = true;
    _userPurchases[msg.sender].push(courseId);

    // ── Interactions (external call last) ────────────────────
    bool success = mtToken.transferFrom(msg.sender, course.author, course.price);
    if (!success) revert TransferFailed();

    emit CoursePurchased(courseId, msg.sender, course.price);
}
```

**Why CEI matters here:** even if `mtToken` were a malicious contract that re-entered `purchaseCourse`, the `hasPurchased` flag is already `true` in the Effects step, so the second call reverts with `AlreadyPurchased`.

---

## Database Schema

Five tables in Supabase PostgreSQL, managed with Prisma migrations:

```
users ──────────────────────────────────────────────┐
  │ address (wallet, PK)                             │
  │ nickname / avatarUrl                             │
  │                                                  │
  ├── auth_nonces (SIWE nonce, TTL 5min)             │
  │     nonce · usedAt · expiresAt                   │
  │                                                  │
  ├── courses ────────────────────────────────────── │
  │     chainId · price(BigInt) · metaHash           │
  │     contentKey (R2 object key, never exposed)    │
  │                        │                         │
  │                        └── purchase_records ─────┘
  │                              txHash · price
  │
  └── aave_positions
        asset · amount · action (supply|withdraw)
```

> `BigInt` is used for all token amounts to avoid JavaScript's IEEE 754 precision loss at large values.

---

## Security

### SIWE Anti-Replay

```
GET /auth/nonce  →  Worker generates UUID nonce, stores with 5-minute TTL
                        │
User signs: "MintLearn\n\nnonce: <uuid>"
                        │
POST /auth/verify  →  viem.verifyMessage recovers address
                    →  DB confirms nonce unused & unexpired
                    →  nonce.usedAt = NOW()  (atomic, prevents race conditions)
                    →  Set-Cookie: ml_session=<JWT>; HttpOnly; Secure; SameSite=Strict
```

### Content Anti-Leakage

| Layer | Mechanism |
|-------|-----------|
| R2 bucket | Private; no public access policy |
| Worker gate | JWT + purchase record verified on every request |
| Presigned URL | 15-minute TTL; single-purpose; not guessable (UUID object keys) |
| Cookie | `HttpOnly` + `Secure` + `SameSite=Strict` — JS cannot read the session token |

### Contract Security

| Threat | Mitigation |
|--------|-----------|
| Reentrancy | `ReentrancyGuard` + CEI pattern |
| Integer overflow | Solidity 0.8.x checked arithmetic |
| Double-spend purchase | `hasPurchased` written in Effects before external call |
| Unauthorized updates | `NotCourseAuthor` custom error guard |
| Token precision loss | All amounts stored as `BigInt` (wei), never floats |

---

## Repository Structure

```
mint-learn/
├── apps/
│   ├── web/                      # Next.js → Cloudflare Pages
│   │   ├── app/[locale]/         # Localized routes (/en/ /zh/)
│   │   ├── hooks/
│   │   │   ├── useAuth.ts        # SIWE login/logout (wraps wagmi useSignMessage)
│   │   │   ├── usePurchaseCourse.ts  # approve → purchase atomic flow
│   │   │   └── useAaveStake.ts   # supply / withdraw with receipt polling
│   │   └── lib/
│   │       ├── wagmi.ts          # Config: Sepolia chain + MetaMask connector
│   │       └── contracts.ts      # ABI + addresses (viem-typed)
│   │
│   └── api/                      # Hono → Cloudflare Workers
│       └── src/
│           ├── routes/           # auth · courses · content · users · aave
│           ├── middleware/auth.ts # JWT cookie verification
│           └── services/
│               ├── signature.ts  # viem verifyMessage wrapper
│               └── r2.ts         # Presigned URL generation
│
├── packages/
│   ├── contracts/
│   │   └── contracts/
│   │       ├── MTToken.sol       # ERC20 platform token
│   │       └── CourseManager.sol # Course registry + purchase logic
│   ├── prisma/
│   │   └── schema.prisma         # 5-table schema with Supabase/PgBouncer config
│   ├── types/                    # Shared TypeScript interfaces (front + back)
│   └── i18n/
│       └── messages/
│           ├── en.json           # English translations
│           └── zh.json           # Chinese translations
│
└── .github/workflows/
    ├── deploy-web.yml            # Triggered by apps/web changes → Pages deploy
    └── deploy-api.yml            # Triggered by apps/api changes → migrate + Workers deploy
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 20, pnpm ≥ 8
- MetaMask browser extension
- Cloudflare account (Workers + Pages + R2)
- Supabase project

### Install

```bash
pnpm install
```

### Configure environment

```bash
# Frontend
cp apps/web/.env.local.example apps/web/.env.local

# Backend (Wrangler local dev)
cp apps/api/.dev.vars.example apps/api/.dev.vars

# Contract deployment
cp packages/contracts/.env.example packages/contracts/.env
```

### Initialize database

```bash
pnpm --filter prisma exec prisma migrate dev --name init
```

### Run locally

```bash
pnpm dev:web   # http://localhost:3000
pnpm dev:api   # http://localhost:8787
```

### Deploy contracts to Sepolia

```bash
cd packages/contracts
pnpm compile
pnpm test
pnpm deploy:sepolia
# → outputs MT_TOKEN_ADDRESS and COURSE_MANAGER_ADDRESS
```

---

## CI/CD

Frontend and backend deploy **independently** — a CSS change never triggers a Worker redeployment:

```
push to main
 ├─ apps/web/** changed   →  build Next.js  →  Cloudflare Pages
 └─ apps/api/** changed   →  prisma migrate →  wrangler deploy
```

Required GitHub Secrets:

```
CF_API_TOKEN             Cloudflare API token
CF_ACCOUNT_ID            Cloudflare account ID
RPC_URL                  Alchemy / Infura Sepolia endpoint
DIRECT_DATABASE_URL      Supabase direct connection (for migrations)
MT_TOKEN_ADDRESS         Deployed MTToken contract address
COURSE_MANAGER_ADDRESS   Deployed CourseManager contract address
AAVE_V3_POOL_ADDRESS     AAVE V3 Pool on Sepolia
```

---

## Roadmap

- [x] **Week 1** — Monorepo scaffold, CI/CD pipelines, Prisma schema, i18n setup
- [ ] **Week 2** — Smart contract unit tests & Sepolia deployment, MetaMask integration
- [ ] **Week 3–4** — Full course publish/purchase flow, SIWE login, R2 content delivery, profile page
- [ ] **Week 5–6** — AAVE staking module, earnings dashboard, UI polish, edge case hardening

---

## License

[MIT](LICENSE) © 2026 MintLearn Team
