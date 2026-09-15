# VALORA — Values-First Matchmaking Platform

VALORA is an intentional relationship platform for adults seeking meaningful connections based on shared lifestyles, core values, communication preferences, and explicit personal boundaries.

$$\text{Values} + \text{Lifestyle} + \text{Communication} + \text{Boundaries} \longrightarrow \text{Meaningful Alignment}$$

---

## Architecture Overview

```
                        ┌───────────────────────────────┐
                        │   React 19 + Vite Frontend    │
                        │   (TailwindCSS, TypeScript)   │
                        └───────────────┬───────────────┘
                                        │ HTTP REST (/api/v1) & WebSockets (/ws/chat)
                                        ▼
                        ┌───────────────────────────────┐
                        │      Fastify v5 Backend       │
                        │ (Argon2id, JWT, Stripe, CORS) │
                        └───────────────┬───────────────┘
                                        │ Prisma 6 ORM
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           Supabase PostgreSQL 17                              │
│                                                                               │
│  • Transaction Pooler (Port 6543, ?pgbouncer=true) -> Fastify Runtime Queries  │
│  • Session Pooler (Port 5432) -> Prisma CLI Migrations & Schema Push          │
│  • 15 Domain Models with Row Level Security (RLS) & Default-Deny Boundaries   │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
Valora_Connect/
├── .gitignore                      # Monorepo gitignore protecting secrets & build artifacts
├── package.json                    # Root workspace orchestration scripts
├── README.md                       # Project documentation & deployment guide
│
├── backend/                        # Production Fastify v5 Backend
│   ├── .env.example                # Backend environment template
│   ├── .gitignore                  # Backend ignore rules (protects local DB and secrets)
│   ├── package.json                # Fastify, Prisma 6, Argon2id, Stripe, WebSockets
│   ├── tsconfig.json               # Strict TypeScript configuration
│   ├── prisma/
│   │   ├── schema.prisma           # 15 domain models with directUrl & covering FK indexes
│   │   └── seed.ts                 # Full test seed (Alex, candidate profiles, admin)
│   ├── scripts/
│   │   ├── verify-persistence.ts   # Multi-session database persistence verification
│   │   └── dev-db.ts               # Optional local PGlite wire server fallback
│   ├── src/
│   │   ├── app.ts                  # Fastify application factory & route registration
│   │   ├── server.ts               # Server bootstrap & lifecycle hooks
│   │   ├── config/                 # Zod environment validation & scoring algorithms
│   │   ├── middleware/             # Argon2id JWT authentication & RBAC authorization
│   │   ├── modules/                # Domain services: auth, profiles, discovery, messaging,
│   │   │                           # connections, safety, admin, billing, notifications
│   │   ├── plugins/                # Fastify plugins: Prisma, JWT, CORS, Rate-limit
│   │   ├── serialization/          # Strict frontend protocol serializers
│   │   └── utils/                  # Errors, Geo-coordinates, Argon2id hashing
│   └── tests/                      # Automated test suite (33 tests across 7 suites)
│
└── ValoraWebApplicationDesign/     # Production React 19 Frontend
    ├── .env.example                # Frontend environment template
    ├── .gitignore                  # Frontend ignore rules (protects secrets & caches)
    ├── package.json                # React 19, Vite, TailwindCSS
    ├── index.html                  # HTML entry point
    ├── vite.config.ts              # Vite configuration with React & Tailwind plugins
    └── src/
        ├── App.tsx                 # Main application state & screen router
        ├── main.tsx                # React DOM render entry
        ├── pages/                  # 9 Production Screens: Landing, Auth, Onboarding,
        │                           # Discover, Matches, Messages, MyProfile, Notifications, Admin
        ├── components/             # Navigation, branding & UI components
        └── services/
            └── api.ts              # Production API client with WebSocket real-time chat
```

---

## Environment Configuration

### 1. Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and supply your credentials:

```bash
# Server & Networking
PORT=8080
HOST=0.0.0.0
NODE_ENV=production
API_PREFIX=/api/v1
FRONTEND_ORIGIN=https://your-frontend-domain.com

# Supabase PostgreSQL Database
# DATABASE_URL: Transaction Pooler (Port 6543) with ?pgbouncer=true
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# DIRECT_URL: Direct Session Mode (Port 5432) for Prisma schema pushes and migrations
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Security & Secrets (generate strong 32+ character secrets)
JWT_ACCESS_SECRET="your_production_jwt_access_secret_min_32_characters"
JWT_REFRESH_SECRET="your_production_jwt_refresh_secret_min_32_characters"
COOKIE_SECRET="your_production_cookie_secret_min_32_characters"

# Stripe Billing (Test or Live mode)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_CONNECT_PRICE_ID="price_..."
STRIPE_ANNUAL_PRICE_ID="price_..."
```

### 2. Frontend (`ValoraWebApplicationDesign/.env`)

Copy `ValoraWebApplicationDesign/.env.example` to `ValoraWebApplicationDesign/.env`:

```bash
VITE_API_BASE_URL=https://your-backend-domain.com/api/v1
VITE_WS_URL=wss://your-backend-domain.com/ws/chat
VITE_USE_MOCKS=false
```

---

## Local Development Quick Start

### 1. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../ValoraWebApplicationDesign
npm install
```

### 2. Synchronize Database & Seed
```bash
cd backend

# Push 15 domain models & covering indexes to Supabase
npx prisma db push

# Seed sample candidates, admin, and test conversations
npm run prisma:seed
```

### 3. Run Development Servers
```bash
# Terminal 1 - Fastify Backend (starts at http://localhost:8080)
cd backend
npm run dev

# Terminal 2 - React Frontend (starts at http://localhost:5173)
cd ValoraWebApplicationDesign
npm run dev
```

---

## Deployment Guide

### A. Deploying the Backend (Railway, Render, Fly.io)

1. **Deploy from GitHub**:
   - Root Directory: `backend`
   - Build Command: `npm run build` (runs `prisma generate && tsc`)
   - Start Command: `npm start` (runs `node dist/server.js`)
2. **Environment Variables**:
   - Set all variables listed in `backend/.env.example`.
   - Ensure `HOST=0.0.0.0` and `PORT` matches your host's assigned port.
   - Set `FRONTEND_ORIGIN` to your deployed frontend URL to configure CORS.

### B. Deploying the Frontend (Vercel, Netlify, Cloudflare Pages)

1. **Deploy from GitHub**:
   - Root Directory: `ValoraWebApplicationDesign`
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
2. **Environment Variables**:
   - `VITE_API_BASE_URL`: Point to your deployed Fastify backend URL (`https://.../api/v1`).
   - `VITE_WS_URL`: Point to your deployed WebSocket URL (`wss://.../ws/chat`).
   - `VITE_USE_MOCKS`: `false`.

### C. Supabase Database Hardening

VALORA includes complete Row Level Security (RLS) and foreign key indexing out-of-the-box:
- All 15 public tables have RLS enabled.
- Untrusted direct PostgREST access is denied by default (`anon` / `authenticated`).
- All foreign keys are indexed.
- Supabase Database Advisor reports **`No issues found`**.

---

## Automated Test Suite

The backend includes 33 automated tests across 7 comprehensive test suites:

```bash
cd backend
npm test
```

Test coverage includes:
1. **Server Lifecycle**: Protocol envelope, health checks, 404 handler.
2. **Database Security & RLS**: 15 table RLS validation, PostgREST privilege verification, IDOR isolation, RBAC admin enforcement.
3. **End-to-End User Journey**: Alice & Bob signup, verification, 8-step onboarding, discovery scoring, mutual match, real-time WebSocket chat, delivery receipts.
4. **Stripe Integration**: Plan tiers, checkout creation, HMAC webhook verification, authoritative subscription updates.
5. **Entitlements**: Tier quota limits (free, connect, annual).
6. **Password Security**: Argon2id cryptographic hashing and verification.
7. **Matchmaking Engine**: Jaccard index calculation, boundary conflict exclusion, compatibility scoring.

---

## License

Private & Confidential — VALORA Product Team.
