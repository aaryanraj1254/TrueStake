#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# TrueStake — one-time AWS setup (run locally after `aws configure`).
# Creates ECR repositories + a security group for the EC2 host.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REGION="${AWS_REGION:-ap-south-1}"
echo "▶ Using region: $REGION"

# 1. ECR repositories (idempotent — ignore "already exists")
echo "▶ Creating ECR repositories..."
aws ecr create-repository --repository-name truestake-web --region "$REGION" \
  2>/dev/null || echo "  truestake-web already exists"
aws ecr create-repository --repository-name truestake-api --region "$REGION" \
  2>/dev/null || echo "  truestake-api already exists"

# 2. Security group allowing 80, 443, 22, 3000
echo "▶ Creating security group truestake-sg..."
aws ec2 create-security-group \
  --group-name truestake-sg \
  --description "TrueStake SG" \
  --region "$REGION" 2>/dev/null || echo "  truestake-sg already exists"

for PORT in 22 80 443 3000; do
  aws ec2 authorize-security-group-ingress \
    --group-name truestake-sg \
    --protocol tcp --port "$PORT" --cidr 0.0.0.0/0 \
    --region "$REGION" 2>/dev/null \
    && echo "  opened tcp/$PORT" \
    || echo "  tcp/$PORT already open"
done

# 3. Show the ECR registry URL you'll need for ec2-init.sh and CI
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
echo ""
echo "✅ Done."
echo "   ECR registry: ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
echo ""
echo "Next: launch an EC2 t2.micro (Amazon Linux 2), attach the 'truestake-sg'"
echo "security group, SSH in, and run scripts/ec2-init.sh."
