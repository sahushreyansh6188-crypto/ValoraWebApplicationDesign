#!/bin/bash
# Start local postgresql wire protocol server if not running on 5432
if ! node -e "const net=require('net'); const s=net.connect(5432,'127.0.0.1',()=>{process.exit(0)}); s.on('error',()=>process.exit(1));" >/dev/null 2>&1; then
  ./backend/node_modules/.bin/tsx backend/scripts/dev-db.ts >/tmp/dev-db.log 2>&1 &
  sleep 2
fi
export PORT=5001
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/valora?schema=public"
export DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:5432/valora?schema=public"
export JWT_SECRET="valora-dev-jwt-super-secret-key-32-chars-min"
export VITE_USE_MOCKS="false"

# Start backend if not already running on port 5001
if ! curl -s http://127.0.0.1:5001/api/v1/health >/dev/null 2>&1; then
  ./backend/node_modules/.bin/tsx backend/src/server.ts &
  sleep 2
fi

npm run dev --prefix ValoraWebApplicationDesign
