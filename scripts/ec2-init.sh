#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# TrueStake — EC2 bootstrap. Run ONCE on a fresh Amazon Linux 2 instance.
#   ssh -i key.pem ec2-user@<EC2_IP> 'bash -s' < scripts/ec2-init.sh
# or copy it over and run it on the box.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REGION="${AWS_REGION:-ap-south-1}"

echo "▶ Installing docker + git..."
sudo yum update -y
sudo yum install -y docker git
sudo service docker start
sudo systemctl enable docker
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

echo "▶ Preparing app directory..."
mkdir -p /home/ec2-user/truestake
cd /home/ec2-user/truestake

# The CI deploy step uploads docker-compose.yml + prometheus.yml here, or you can
# clone the repo. The app's secrets live in apps/api/.env — create it on the box:
if [ ! -f apps/api/.env ]; then
  echo "⚠  Create apps/api/.env on this host before first deploy (Supabase/Razorpay/etc keys)."
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
