# TrueStake

Dark premium prediction-market platform. Turborepo + pnpm monorepo.

- `apps/web` — Vite + React + TS + Tailwind frontend
- `apps/api` — Express + TS API (Supabase-backed)
- `packages/shared` — shared domain types (`@truestake/shared`)
- `packages/tsconfig` — shared tsconfig presets

Run: `pnpm dev` (web :5173, api :3000). Build/check: `pnpm build`, `pnpm typecheck`.

Full context, conventions and architecture: see [.github/CLAUDE.md](.github/CLAUDE.md).
