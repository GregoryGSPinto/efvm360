#!/bin/bash
# ============================================================================
# EFVM360 v3.2 — Load Test Runner
# Usage: ./run.sh [BASE_URL] [SCENARIO]
# ============================================================================

BASE_URL=${1:-"http://localhost:3001"}
SCENARIO=${2:-"all"}

echo "🚂 EFVM360 Load Tests"
echo "   Target: $BASE_URL"
echo "   Scenario: $SCENARIO"
echo ""

run_test() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "▸ $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  k6 run -e BASE_URL=$BASE_URL "scenarios/$2"
  echo ""
}

case $SCENARIO in
  login)      run_test "Login Burst (20 VUs, 2min)" "login-burst.js" ;;
  passagem)   run_test "Passagem Flow (10 VUs, 5min)" "passagem-flow.js" ;;
  stress)     run_test "Stress Test (10→300 VUs, 10min)" "stress.js" ;;
  endurance)  run_test "Endurance (20 VUs, 30min)" "endurance.js" ;;
  shift)      run_test "Shift Change (40 VUs, 5min)" "shift-change.js" ;;
  all)
    run_test "1/5 Login Burst" "login-burst.js"
    run_test "2/5 Passagem Flow" "passagem-flow.js"
    run_test "3/5 Shift Change" "shift-change.js"
    run_test "4/5 Stress Test" "stress.js"
    echo "⚠️  Endurance test (30min) skipped in 'all'. Run: ./run.sh $BASE_URL endurance"
    ;;
  *) echo "Unknown scenario: $SCENARIO. Options: login, passagem, stress, endurance, shift, all" ;;
esac

echo "✅ Load tests complete"
