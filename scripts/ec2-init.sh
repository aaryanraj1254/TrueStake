#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# TrueStake — EC2 bootstrap. Run ONCE on a fresh Amazon Linux 2023 (or 2) instance.
#   ssh -i key.pem ec2-user@<EC2_IP> 'bash -s' < scripts/ec2-init.sh
# or copy it over and run it on the box.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REGION="${AWS_REGION:-ap-south-1}"

echo "▶ Installing docker + git..."
# `yum` is aliased to dnf on Amazon Linux 2023, so this works on AL2 and AL2023.
sudo yum update -y
sudo yum install -y docker git unzip
# systemctl works on both AL2 and AL2023 (AL2023 has no legacy `service` command).
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

echo "▶ Installing docker-compose..."
sudo curl -L \
  "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

echo "▶ Installing AWS CLI v2 (if missing)..."
if ! command -v aws >/dev/null 2>&1; then
  curl -s "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip" -o /tmp/awscliv2.zip
  (cd /tmp && unzip -q awscliv2.zip && sudo ./aws/install)
fi

echo "▶ Configuring 2G swap (the full stack OOMs on small instances like t2.micro)..."
if [ ! -f /swapfile ]; then
  sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
else
  echo "  /swapfile already present"
fi

echo "▶ Fetching app repo (provides docker-compose.yml + prometheus.yml + scripts)..."
# The CI deploy step does `cd /home/ec2-user/truestake && docker-compose ... up`, so
# the compose files MUST live there. Clone the repo (or fast-forward if already present).
REPO_URL="${TRUESTAKE_REPO:-https://github.com/aaryanraj1254/TrueStake.git}"
APP_DIR="/home/ec2-user/truestake"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only || echo "  (pull skipped — local changes)"
else
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# App secrets live in apps/api/.env (read via compose `env_file`). Seed from the
# example so the stack starts; edit it with real keys for live data.
if [ ! -f apps/api/.env ]; then
  cp apps/api/.env.example apps/api/.env 2>/dev/null || true
  echo "⚠  Edit $APP_DIR/apps/api/.env with real keys before first deploy (Supabase/Razorpay/etc)."
fi

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo '<ACCOUNT_ID>')"
ECR_URL="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
echo "▶ Logging in to ECR ($ECR_URL)..."
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$ECR_URL" || \
  echo "⚠  ECR login failed — attach an IAM role or run 'aws configure' on this host."

echo ""
echo "✅ EC2 ready. Push to main (GitHub Actions) to deploy, or run manually:"
echo "   ECR_REGISTRY=$ECR_URL IMAGE_TAG=latest docker-compose -f docker-compose.yml up -d"
