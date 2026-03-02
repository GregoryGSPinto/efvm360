#!/usr/bin/env bash
# ============================================================================
# EFVM360 — E2E Test Runner
# Verifies Docker stack, waits for health, runs Playwright tests
# Usage: ./run-e2e.sh [playwright-args...]
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BACKEND_URL="http://localhost:3001/api/v1/health"
FRONTEND_URL="http://localhost:5173"
MAX_WAIT=60

echo "=== EFVM360 E2E Test Runner ==="
echo ""

# ── 1. Check Docker containers ──────────────────────────────────────────
echo "[1/4] Checking Docker containers..."
if ! docker ps --format '{{.Names}}' | grep -q efvm360-backend; then
  echo "ERROR: efvm360-backend container not running"
  echo "Run: docker compose up -d"
  exit 1
fi
if ! docker ps --format '{{.Names}}' | grep -q efvm360-frontend; then
  echo "ERROR: efvm360-frontend container not running"
  echo "Run: docker compose up -d"
  exit 1
fi
echo "  Docker containers: OK"

# ── 2. Wait for backend health ──────────────────────────────────────────
echo "[2/4] Waiting for backend health..."
for i in $(seq 1 $MAX_WAIT); do
  if curl -sf "$BACKEND_URL" > /dev/null 2>&1; then
    echo "  Backend healthy (${i}s)"
    break
  fi
  if [ "$i" -eq "$MAX_WAIT" ]; then
    echo "ERROR: Backend not healthy after ${MAX_WAIT}s"
    exit 1
  fi
  sleep 1
done

# ── 3. Wait for frontend ────────────────────────────────────────────────
echo "[3/4] Waiting for frontend..."
for i in $(seq 1 $MAX_WAIT); do
  if curl -sf "$FRONTEND_URL" > /dev/null 2>&1; then
    echo "  Frontend responding (${i}s)"
    break
  fi
  if [ "$i" -eq "$MAX_WAIT" ]; then
    echo "ERROR: Frontend not responding after ${MAX_WAIT}s"
    exit 1
  fi
  sleep 1
done

# ── 4. Reset rate limiters (restart backend for clean state) ────────────
echo "[4/5] Resetting rate limiters..."
docker compose restart backend > /dev/null 2>&1
sleep 5
echo "  Backend restarted"

# ── 5. Run Playwright tests ─────────────────────────────────────────────
echo "[5/5] Running Playwright tests..."
echo ""

npx playwright test "$@"
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "=== ALL E2E TESTS PASSED ==="
else
  echo "=== SOME TESTS FAILED (exit code: $EXIT_CODE) ==="
  echo "View report: npx playwright show-report playwright-report"
fi

exit $EXIT_CODE
