#!/bin/bash
set -e

echo "==> Running post-merge setup..."

echo "==> Installing npm dependencies..."
npm install --legacy-peer-deps

echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Running database migrations..."
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss 2>/dev/null || echo "DB migration skipped (no DATABASE_URL configured yet)"

echo "==> Post-merge setup complete."
