# 🚀 TrueStake — Deploy Cheat-Sheet

Every command in one place. Pick a target.

---

## 0. Local (no Docker)

```bash
pnpm install
cp apps/api/.env.example apps/api/.env     # fill in keys
cp apps/web/.env.example apps/web/.env
pnpm dev                                   # web :5173 + api :3000
```

---

## 1. GitHub (first push)

```bash
# 1. Create an empty repo named "TrueStake" at github.com/new (do NOT add a README)
# 2. From C:/TrueStake:
git push -u origin main          # browser login opens on first push
```
Different repo name? `git remote set-url origin https://github.com/aaryanraj1254/<repo>.git`

---

## 2. Local Docker

```bash
# Dev (hot reload):
docker-compose up

# Production stack (web :80, api :3000, prometheus :9090, grafana :3001):
docker-compose -f docker-compose.yml up -d --build

docker-compose logs -f api       # tail logs
docker-compose down              # stop
```
Requires `apps/api/.env` to exist (read via `env_file`).

---

## 3. AWS (ECR + EC2, CI/CD)

```bash
# --- one-time, locally ---
aws configure                    # access key, secret, region=ap-south-1
bash scripts/aws-setup.sh        # creates ECR repos + truestake-sg (22/80/443/3000)

# --- launch EC2 t2.micro (Amazon Linux 2), attach truestake-sg, then ---
ssh -i key.pem ec2-user@<EC2_IP>
bash ec2-init.sh                 # docker + compose + aws cli + ECR login
# create apps/api/.env on the box, and copy docker-compose.yml + prometheus.yml to
# /home/ec2-user/truestake/
```

**GitHub Secrets** (repo → Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | IAM user with ECR + EC2 perms |
| `AWS_REGION` | `ap-south-1` |
| `EC2_HOST` | EC2 public IP/DNS |
| `EC2_SSH_KEY` | contents of your `key.pem` |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | baked into web build |
| `VITE_VAPID_PUBLIC_KEY` / `VITE_RAZORPAY_KEY_ID` | baked into web build |

Then **`git push origin main`** → Actions builds → ECR → EC2 → `/health` check. ✅

Manual deploy on the box:
```bash
ECR_REGISTRY=<acct>.dkr.ecr.ap-south-1.amazonaws.com IMAGE_TAG=latest \
  docker-compose -f docker-compose.yml up -d
```

---

## 4. Netlify (frontend)

1. app.netlify.com → **Add new site → Import an existing project** → pick the repo.
2. Netlify auto-detects `netlify.toml` (build `apps/web`, publish `apps/web/dist`).
3. **Site settings → Environment variables** — add:
   `VITE_API_URL` (your API URL), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   `VITE_VAPID_PUBLIC_KEY`, `VITE_RAZORPAY_KEY_ID`.
4. Deploy. Every push to `main` redeploys.

---

## 5. Vercel (API — serverless)

1. vercel.com/new → import repo → **Root Directory = `apps/api`**.
2. Reads `apps/api/vercel.json`; serves Express via `api/index.ts`.
3. Add the API env vars (Supabase, Razorpay, Anthropic, etc.) in the Vercel UI.
4. Set `CRON_SECRET` so the `/api/cron/*` jobs are protected.

> ⚠ Serverless = no persistent loops. Auto-settlement + alerts run via the
> `crons` in `vercel.json`. For the in-process 60s loops, use the **AWS/Docker**
> deploy (or Render / Railway / Fly.io).

---

## Health & sanity checks

```bash
curl http://localhost:3000/health          # {"status":"ok",...}
curl http://localhost:3000/metrics          # prometheus metrics
curl http://<host>/api/live/crypto          # live (or mock) market data
```

## Common make targets

```bash
make dev        # pnpm dev
make build      # pnpm build
make test       # pnpm test
make up         # docker-compose up -d --build
make down       # docker-compose down
make logs       # docker-compose logs -f
make push       # git push origin main
```
