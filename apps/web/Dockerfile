# ───────────────────────── Stage 1: build ─────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile || pnpm install

COPY packages ./packages
COPY apps/web ./apps/web

# Built with no VITE_API_URL → the app calls relative /api, which nginx proxies
# to the api container. (Public envs like Supabase are injected at build time.)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_VAPID_PUBLIC_KEY
ARG VITE_RAZORPAY_KEY_ID
ENV VITE_API_URL=""
RUN pnpm --filter @truestake/shared build && pnpm --filter @truestake/web build

# ──────────────────────── Stage 2: nginx ──────────────────────────
FROM nginx:alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
