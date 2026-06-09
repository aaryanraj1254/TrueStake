# TrueStake — Project Context for Claude

TrueStake is a hardcore dark premium betting / prediction-market platform.
Users predict price/score movements on crypto, stocks, IPL cricket, forex, and
viral tweets, stake virtual ₹ balance, win payouts, earn SuperCoins, and redeem
them for vouchers.

## Monorepo layout

```
truestake/
├─ apps/
│  ├─ web/   → Vite + React + TypeScript + Tailwind (frontend SPA)
│  └─ api/   → Node + Express + TypeScript (REST API)
├─ packages/
│  ├─ shared/    → shared TS domain types & constants (@truestake/shared)
│  └─ tsconfig/  → shared tsconfig presets (@truestake/tsconfig)
├─ k8s/      → raw manifests + Helm chart
├─ argocd/   → ArgoCD Application (auto-sync from k8s/)
└─ .github/  → CI/CD workflows, dependabot, this file
```

Tooling: **Turborepo + pnpm workspaces**. Node ≥ 20.

## Commands

- `pnpm dev` — run web (5173) + api (3000) together via turbo
- `pnpm build` / `pnpm typecheck` / `pnpm lint` / `pnpm test`
- API only: `pnpm --filter @truestake/api dev`
- Web only: `pnpm --filter @truestake/web dev`

## Backend (apps/api)

- `src/app.ts` builds the Express app; `src/server.ts` boots it.
- Auth: Supabase JWT validated in `src/middleware/auth.ts` (`requireAuth`).
- Live data routes (`src/routes/live.ts`) proxy + cache external providers
  (CoinGecko, AlphaVantage, exchangerate-api, CricAPI, Twitter v2) via the
  in-memory TTL cache in `src/lib/cache.ts`. They fall back to mock data when
  API keys are absent so the app demos without paid keys.
- `prom-client` metrics at `/metrics`; health at `/health`.
- Email via Resend (`src/lib/email.ts`) on bet_placed / bet_won / bet_lost.
- DB schema: `apps/api/supabase/migrations/0001_init.sql`.

## Frontend (apps/web)

- Routing in `src/App.tsx`; protected routes wrapped by `ProtectedRoute` +
  `DashboardLayout` (Sidebar + Header).
- Design system in `tailwind.config.js` + `src/index.css` (gold #F0B429, dark
  scale, Bebas Neue / Rajdhani, glassmorphism `.glass`, shimmer, scanlines,
  gold scrollbar).
- Context providers: `useAuth`, `useTheme` (dark/light, localStorage),
  `useBGM` (Howler casino loop).
- Live feeds polled via `usePoll(path, intervalMs)`.
- MetaMask via `useMetaMask` (ethers v6).
- Charts: Recharts (Portfolio). Animations: framer-motion + canvas-confetti +
  tsParticles. Count-up via `useCountUp`.

## Conventions

- Money is virtual ₹ in `wallets.balance`; SuperCoins are a separate loyalty
  currency on `users.supercoins`. 100 coins = ₹10 voucher. Referral = 200 coins
  to both parties.
- Shared types live in `@truestake/shared` — import domain types from there in
  both apps rather than redefining.
- Keep new env vars in both the code (`src/config/env.ts` for api) and the
  `.env.example` files.

## Env

- `apps/api/.env` — PORT, SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET,
  CRICAPI_KEY, ALPHAVANTAGE_KEY, TWITTER_BEARER_TOKEN, SENTRY_DSN,
  RESEND_API_KEY
- `apps/web/.env` — VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
  VITE_SENTRY_DSN
