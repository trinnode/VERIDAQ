# VERIDAQ

Privacy-first academic credential verification, powered by zero-knowledge proofs.

VERIDAQ lets universities issue credentials and employers verify them — without ever revealing the student's actual data. It's built on ZK-SNARKs (Groth16), backed by on-chain registries on Base Sepolia, and wrapped in a modern fullstack TypeScript monorepo.

---

## What's in the box

```
apps/
  web/       → Marketing site + unified entry point (Next.js, port 3000)
  portal/    → Institution dashboard — upload batches, manage claims (port 3010)
  verify/    → Employer dashboard — request verifications (port 3020)
  console/   → Platform admin — KYC approvals, audit logs (port 3030)

packages/
  api/       → Fastify backend — REST API, Prisma ORM, BullMQ workers, ZKP verification
  contracts/ → Solidity smart contracts (Foundry) — registries, paymaster, subscriptions
  shared/    → Shared types, constants, and utilities
```

## Quick start

### Prerequisites

- **Node.js 22+** and **pnpm 10+**
- **Docker** (for Postgres + Redis)
- **Foundry** (`forge`, `cast`, `anvil`) — only if deploying contracts

### 1. Clone and install

```bash
git clone <repo-url> && cd VERIDAQ
pnpm install
```

### 2. Start local infrastructure

```bash
docker compose up -d   # Postgres on 5432, Redis on 6379
```

### 3. Set up environment

```bash
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and JWT_SECRET
```

### 4. Run database migrations

```bash
pnpm --filter @veridaq/api db:generate
pnpm --filter @veridaq/api db:migrate
```

### 5. Seed default data

```bash
pnpm --filter @veridaq/api db:seed
```

This creates a test institution and employer. The platform admin is configured via env vars (no DB entry needed).

### 6. Start everything

```bash
# Terminal 1 — API server
pnpm --filter @veridaq/api dev

# Terminal 2 — whichever frontend you're working on
pnpm --filter @veridaq/web dev       # port 3000
pnpm --filter portal dev             # port 3010
pnpm --filter verify dev             # port 3020
pnpm --filter console dev            # port 3030
```

---

## Default credentials

After seeding, these accounts are ready to use:

| Role | App | Email | Password |
|------|-----|-------|----------|
| **Platform Admin** | Console (`:3030`) | `admin@veridaq.com` | `VeriAdmin2026!` |
| **Institution** | Portal (`:3010`) | `demo@university.edu.ng` | `DemoInstitution2026!` |
| **Employer** | Verify (`:3020`) | `hr@democorp.com` | `DemoEmployer2026!` |

> The admin credentials come from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars. Change them in `.env` or your hosting provider's environment settings for production.

---

## Deploying

### Backend (Vercel Functions)

The API runs as a Vercel Serverless Function. BullMQ workers need a persistent process (Railway, Render, or a VPS) — or set `DISABLE_QUEUE=true` to skip the queue and run without batch processing.

1. Create a Vercel project pointed at `packages/api`
2. Set all env vars from `.env.example`
3. Deploy — the `vercel.json` in `packages/api` handles routing

### Frontend apps (Vercel)

Each app deploys as its own Vercel project:

| App | Root Directory | Key Env Var |
|-----|---------------|-------------|
| `web` | `apps/web` | `NEXT_PUBLIC_API_URL` |
| `portal` | `apps/portal` | `NEXT_PUBLIC_API_URL` |
| `verify` | `apps/verify` | `NEXT_PUBLIC_API_URL` |
| `console` | `apps/console` | `NEXT_PUBLIC_API_URL` |

For each:
1. Import the repo on Vercel
2. Set the **Root Directory** to the app path
3. Add `NEXT_PUBLIC_API_URL` pointing to your deployed API
4. Build command: `pnpm build` (Vercel handles this with Turborepo detection)

### Smart contracts (Base Sepolia)

From `packages/contracts`:

```bash
forge build

# Deploy in order: InstitutionRegistry → CredentialRegistry → RevocationRegistry → PaymasterVault → SubscriptionManager
# See the deploy scripts in packages/contracts/script/ for details
```

Paste the deployed addresses into your `.env`.

---

## Architecture

```
Employer (verify app)                Institution (portal app)
       │                                      │
       │  POST /v1/verifications              │  POST /v1/institutions/me/batches
       ▼                                      ▼
   ┌───────────────────────────────────────────────┐
   │                  Fastify API                   │
   │                                               │
   │  Auth (JWT + scrypt)  │  Rate limiting        │
   │  File upload          │  Audit logging        │
   └───────────┬───────────┴───────────┬───────────┘
               │                       │
        ZKP Verifier              BullMQ Worker
        (snarkjs)                 (batch processor)
               │                       │
               ▼                       ▼
   ┌──────────────────┐    ┌──────────────────┐
   │   PostgreSQL     │    │   Base Sepolia   │
   │   (Prisma ORM)   │    │   (on-chain      │
   │                  │    │    registries)    │
   └──────────────────┘    └──────────────────┘
```

**ZKP flow**: Institutions upload credential batches → data is hashed and committed on-chain → employers submit verification requests with Groth16 proofs → the API verifies the proof off-chain using snarkjs and checks the nullifier against the on-chain RevocationRegistry. No personal data leaves the system.

---

## Project scripts

```bash
pnpm build               # Build everything (Turborepo)
pnpm test                # Run all tests
pnpm dev                 # Dev mode for web app

# API-specific
pnpm --filter @veridaq/api dev           # Start API in watch mode
pnpm --filter @veridaq/api db:migrate    # Run Prisma migrations
pnpm --filter @veridaq/api db:seed       # Seed default data
pnpm --filter @veridaq/api db:studio     # Open Prisma Studio
```

---

## Tech stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, shadcn/ui, Zustand, React Query
- **Backend**: Fastify, Prisma 7 (with PrismaPg adapter), BullMQ, Zod
- **Cryptography**: snarkjs (Groth16), circomlibjs (Poseidon hashing)
- **Blockchain**: Solidity, Foundry, Base Sepolia (ERC-4337 compatible)
- **Infrastructure**: Turborepo, pnpm workspaces, Docker Compose, Vercel

---

## License

Private — all rights reserved.
