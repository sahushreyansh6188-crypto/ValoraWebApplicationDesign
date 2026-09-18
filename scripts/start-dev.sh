#!/bin/bash
TSX_BIN="./backend/node_modules/.bin/tsx"
[ -f "$TSX_BIN" ] || TSX_BIN="./node_modules/.bin/tsx"
[ -f "$TSX_BIN" ] || TSX_BIN="npx tsx"

PRISMA_BIN="./backend/node_modules/.bin/prisma"
[ -f "$PRISMA_BIN" ] || PRISMA_BIN="./node_modules/.bin/prisma"
[ -f "$PRISMA_BIN" ] || PRISMA_BIN="npx prisma"

export PORT=5001
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/valora?schema=public"
export DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:5432/valora?schema=public"
export JWT_SECRET="valora-dev-jwt-super-secret-key-32-chars-min"
export VITE_USE_MOCKS="false"
export VITE_API_URL=""
export VITE_API_BASE_URL=""

# Start local postgresql wire protocol server if not running on 5432
if ! node -e "const net=require('net'); const s=net.connect(5432,'127.0.0.1',()=>{process.exit(0)}); s.on('error',()=>process.exit(1));" >/dev/null 2>&1; then
  $TSX_BIN backend/scripts/dev-db.ts >/tmp/dev-db.log 2>&1 &
  for i in {1..20}; do
    if node -e "const net=require('net'); const s=net.connect(5432,'127.0.0.1',()=>{process.exit(0)}); s.on('error',()=>process.exit(1));" >/dev/null 2>&1; then
      break
    fi
    sleep 0.2
  done
fi

# Ensure schema tables exist in the local database
$PRISMA_BIN db push --schema=backend/prisma/schema.prisma --skip-generate >/dev/null 2>&1 || true

# Start backend if not already running on port 5001
if ! curl -s http://127.0.0.1:5001/api/v1/health >/dev/null 2>&1; then
  $TSX_BIN backend/src/server.ts >/tmp/backend.log 2>&1 &
  for i in {1..20}; do
    if curl -s http://127.0.0.1:5001/api/v1/health >/dev/null 2>&1; then
      break
    fi
    sleep 0.2
  done
fi

exec npm run dev --prefix ValoraWebApplicationDesign
