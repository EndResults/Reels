#!/usr/bin/env bash
set -e

echo "Installing missing Playwright runtime dependencies..."
apt-get update -y
apt-get install -y \
  libglib2.0-0 libnss3 libatk-bridge2.0-0 libxkbcommon0 libx11-xcb1 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
  libcairo2 fonts-liberation libxshmfence1 libxext6 libx11-6

# libasound package name differs per distro (Debian/Ubuntu)
set +e
apt-get install -y libasound2t64 2>/dev/null || apt-get install -y libasound2 2>/dev/null || true
set -e

echo "✅ Playwright runtime dependencies installed"
