# ───────────────────────── Stage 1: build ─────────────────────────
FROM node:26-alpine AS build
WORKDIR /app
RUN corepack enable

# Workspace manifests first (better layer caching).
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile || pnpm install

# Sources, then compile TypeScript → dist (shared first — api imports it at runtime).
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @truestake/shared build && pnpm --filter @truestake/api build

# Produce a pruned deployment with ONLY production node_modules.
RUN pnpm --filter @truestake/api deploy --prod /out

# ──────────────────────── Stage 2: runtime ────────────────────────
FROM node:26-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache wget

COPY --from=build /out/dist ./dist
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/package.json ./package.json

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]
