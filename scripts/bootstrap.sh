#!/usr/bin/env bash
set -euo pipefail

echo "=== Endeavor Dev Bootstrap ==="

# 1. Check Node.js version
NODE_VERSION=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "ERROR: Node.js 18+ required. Found: $(node -v)"
  exit 1
fi
echo "Node.js $(node -v) detected"

# 2. Install dependencies
echo "Installing dependencies..."
npm install

# 3. Create .env from example if missing
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

# 4. Create data directory
DATA_DIR="${ENDEAVOR_DATA_DIR:-$HOME/.endeavor}"
mkdir -p "$DATA_DIR"
echo "Data directory: $DATA_DIR"

# 5. Build all packages
echo "Building..."
npm run build

# 6. Run tests
echo "Running tests..."
npm run test

echo ""
echo "=== Bootstrap complete! ==="
echo "Start the daemon:  npm run dev:daemon"
echo "Run tests:         npm run test"
