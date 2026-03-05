#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  EFVM360 — Enterprise Evolution Master Script
#  Executes all 4 phases via Claude Code in autonomous mode
#
#  Usage:
#    ./run-master.sh              # Run all phases from beginning
#    ./run-master.sh --from 1.5   # Start from Backend Activation
#    ./run-master.sh --from 2     # Start from Bilingual + Design
#    ./run-master.sh --from 3     # Start from Features Evolution
#    ./run-master.sh --from 4     # Start from Go-to-Market
#    ./run-master.sh --dry-run    # Show what would be executed
#
#  Requirements:
#    - Claude Code CLI (claude) installed
#    - Node.js 18+, pnpm
#    - Git configured with push access
#    - Inside the efvm360 monorepo root
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ─── Config ───────────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="${PROJECT_ROOT}/.audit-logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FROM_PHASE=""
DRY_RUN=false

# ─── Parse Args ───────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --from)
      FROM_PHASE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help|-h)
      echo "Usage: ./run-master.sh [--from PHASE] [--dry-run]"
      echo ""
      echo "Phases: 1, 1.5, 2, 3, 4"
      echo ""
      echo "  1   = CTO Audit (security, build, domain, tests, perf)"
      echo "  1.5 = Backend Activation (endpoints, migrations, seeds)"
      echo "  2   = Bilingual + Design Premium (i18n, design tokens)"
      echo "  3   = Features Evolution (websocket, ML, PWA, APIs)"
      echo "  4   = Go-to-Market (legal, landing, pricing, email)"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# ─── Helpers ──────────────────────────────────────────────────────
log() {
  echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $1"
}

success() {
  echo -e "${GREEN}✅ $1${NC}"
}

warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
  echo -e "${RED}❌ $1${NC}"
}

header() {
  echo ""
  echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${BLUE}  $1${NC}"
  echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo ""
}

should_run() {
  local phase="$1"
  if [[ -z "$FROM_PHASE" ]]; then
    return 0  # Run all
  fi
  # Compare phases (supports 1, 1.5, 2, 3, 4)
  if (( $(echo "$phase >= $FROM_PHASE" | bc -l) )); then
    return 0
  fi
  return 1
}

run_claude() {
  local phase_name="$1"
  local prompt="$2"
  local log_file="${LOG_DIR}/${TIMESTAMP}_${phase_name}.log"

  if $DRY_RUN; then
    echo -e "${YELLOW}[DRY RUN] Would execute: claude -p \"${prompt:0:80}...\"${NC}"
    return 0
  fi

  log "Starting: ${phase_name}"
  log "Log: ${log_file}"

  # Run Claude Code with auto-permissions
  if claude --dangerously-skip-permissions -p "$prompt" 2>&1 | tee "$log_file"; then
    success "${phase_name} completed"
  else
    error "${phase_name} failed — check ${log_file}"
    warn "Attempting auto-recovery..."

    # Auto-recovery: re-run with error context
    local error_tail
    error_tail=$(tail -20 "$log_file" 2>/dev/null || echo "No log available")

    claude --dangerously-skip-permissions -p "
The previous phase '${phase_name}' failed with this error:

\`\`\`
${error_tail}
\`\`\`

Please diagnose and fix the issue, then re-run the failed step. Do NOT re-run steps that already succeeded. After fixing, verify with a build/test run.
" 2>&1 | tee -a "$log_file"

    if [[ $? -ne 0 ]]; then
      error "Auto-recovery failed for ${phase_name}. Manual intervention needed."
      error "Review log: ${log_file}"
      exit 1
    fi
    success "${phase_name} recovered and completed"
  fi
}

git_checkpoint() {
  local message="$1"

  if $DRY_RUN; then
    echo -e "${YELLOW}[DRY RUN] Would commit: ${message}${NC}"
    return 0
  fi

  cd "$PROJECT_ROOT"
  git add -A
  if git diff --cached --quiet 2>/dev/null; then
    warn "No changes to commit for: ${message}"
  else
    git commit -m "$message" --no-verify
    success "Committed: ${message}"
  fi
}

git_push_phase() {
  local phase="$1"

  if $DRY_RUN; then
    echo -e "${YELLOW}[DRY RUN] Would push phase: ${phase}${NC}"
    return 0
  fi

  cd "$PROJECT_ROOT"
  git push origin main 2>/dev/null || git push origin HEAD 2>/dev/null || warn "Push failed — will retry at end"
  success "Pushed: ${phase}"
}

# ─── Preflight Checks ────────────────────────────────────────────
header "EFVM360 — Enterprise Evolution Pipeline"

log "Project root: ${PROJECT_ROOT}"
log "Timestamp: ${TIMESTAMP}"
[[ -n "$FROM_PHASE" ]] && log "Starting from phase: ${FROM_PHASE}"
$DRY_RUN && warn "DRY RUN MODE — no changes will be made"

# Create log directory
mkdir -p "$LOG_DIR"

# Verify we're in the right directory
if [[ ! -f "${PROJECT_ROOT}/package.json" ]]; then
  error "Not in efvm360 project root. Run from the monorepo root directory."
  exit 1
fi

# Verify Claude Code is available
if ! command -v claude &> /dev/null; then
  error "Claude Code CLI not found. Install with: npm install -g @anthropic/claude-code"
  exit 1
fi

# Verify git is configured
if ! git config user.email &> /dev/null; then
  error "Git user not configured. Run: git config --global user.email 'your@email.com'"
  exit 1
fi

success "Preflight checks passed"

# ═══════════════════════════════════════════════════════════════════
#  PHASE 1 — CTO AUDIT
# ═══════════════════════════════════════════════════════════════════

if should_run 1; then
  header "PHASE 1 — CTO ENTERPRISE AUDIT"

  # ── Block 1.1: Security Scan ────────────────────────────────────
  run_claude "phase1_01_security" "
You are a senior security engineer auditing the EFVM360 codebase.

Read the file EFVM360_CTO_AUDIT.md for the full audit plan.

Execute ONLY Section 1 (Security):
1. Scan for exposed secrets (passwords, API keys, tokens) in ALL files
2. Verify .gitignore covers .env files
3. Check .env.example has only placeholders
4. Verify backend uses process.env for all secrets
5. Check middleware security stack (helmet, cors, rate-limiting)
6. Run npm/pnpm audit for vulnerabilities
7. Fix any HIGH/CRITICAL findings immediately

After each fix, verify the build still works (cd frontend && pnpm exec vite build).

Output a summary of findings and fixes at the end.
"
  git_checkpoint "audit: phase 1.1 — security scan and fixes"

  # ── Block 1.2: Build & TypeScript ───────────────────────────────
  run_claude "phase1_02_typescript" "
You are a TypeScript architect auditing the EFVM360 codebase.

Execute Section 2 from EFVM360_CTO_AUDIT.md (Build & TypeScript):
1. Run 'cd frontend && pnpm exec tsc --noEmit' — fix ALL errors to reach 0
2. Run 'cd backend && npx tsc --noEmit' — fix ALL errors to reach 0
3. Find and eliminate all remaining 'any' types (grep ': any|as any|<any>')
4. Find and remove all console.log statements in production code
5. Find and remove unused imports (use ts-prune or manual inspection)
6. If _deprecated/ directory exists and has 0 import references, delete it
7. Run 'cd frontend && pnpm exec vite build' — must succeed with 0 errors

Report counts: any types before/after, console.log before/after, dead code removed.
"
  git_checkpoint "audit: phase 1.2 — TypeScript cleanup, zero errors"

  # ── Block 1.3: Domain Engine ────────────────────────────────────
  run_claude "phase1_03_domain" "
You are a DDD architect verifying the EFVM360 domain engine.

Execute Section 3 from EFVM360_CTO_AUDIT.md (Domain Engine Integrity):
1. Verify all 5 aggregates exist (ServicePass, YardCondition, OperationalEvent, SafetyProtocol, ShiftCrew)
2. Verify aggregates are PURE — zero imports from infrastructure, React, or UI layers
3. Verify domain events are readonly/immutable
4. Verify value objects use equality by value
5. Verify contracts are pure interfaces
6. Verify use cases (application layer) do NOT import React
7. Verify event handlers have idempotency guards
8. Verify integrity chain (SHA-256) has zero bypass routes

If ANY violation found, fix it while maintaining backward compatibility.
Report the domain purity score.
"
  git_checkpoint "audit: phase 1.3 — domain engine verification"

  # ── Block 1.4: AdamBot AI ──────────────────────────────────────
  run_claude "phase1_04_adambot" "
You are an AI systems engineer verifying AdamBot in EFVM360.

Execute Section 4 from EFVM360_CTO_AUDIT.md (AdamBot Verification):
1. Locate and list all 10 AdamBot modules
2. Verify each module has proper error handling (try/catch)
3. Verify offline fallback exists
4. Verify voice input/output has browser API checks (navigator.mediaDevices)
5. Verify conversation memory is persisted correctly
6. Verify audit trail of interactions is logged
7. Fix any edge cases found (null checks, browser API availability)

Report: modules found, error handling coverage, edge cases fixed.
"
  git_checkpoint "audit: phase 1.4 — AdamBot AI verification"

  # ── Block 1.5: API & Backend ────────────────────────────────────
  run_claude "phase1_05_backend" "
You are a backend architect auditing the EFVM360 Express backend.

Execute Section 5 from EFVM360_CTO_AUDIT.md (API & Backend):
1. List all 12 controllers and their endpoints
2. Verify all 8 Sequelize models have proper validations (allowNull, validate, unique)
3. Verify model associations (belongsTo, hasMany, etc)
4. Check that ALL controllers have error handling (try/catch)
5. Verify migrations exist for all models
6. Verify seed data scripts are complete
7. Fix any missing validations or error handling

Report: endpoints count, validation coverage, missing items.
"
  git_checkpoint "audit: phase 1.5 — backend API verification"

  # ── Block 1.6: Frontend & Routes ────────────────────────────────
  run_claude "phase1_06_frontend" "
You are a React architect auditing EFVM360 frontend.

Execute Section 6 from EFVM360_CTO_AUDIT.md (Frontend & Routes):
1. Verify all 11 pages exist and are lazy-loaded
2. Verify every page has loading and error states
3. Check for components >500 lines that need decomposition (list them, don't refactor yet)
4. Verify React Router v6 configuration with auth guards
5. Verify PropTypes/TypeScript interfaces on all components
6. Fix any missing loading/error states

Report: pages count, lazy loading coverage, components needing SRP refactor.
"
  git_checkpoint "audit: phase 1.6 — frontend routes and pages"

  # ── Block 1.7: Hooks & State ────────────────────────────────────
  run_claude "phase1_07_hooks" "
You are a React state management specialist auditing EFVM360.

Execute Section 7 from EFVM360_CTO_AUDIT.md (Hooks & State):
1. List all 22 custom hooks with their line counts
2. Identify hooks >100 lines (decomposition candidates)
3. Verify IndexedDB is accessed through infrastructure layer (not directly from hooks)
4. Verify sync engine has exponential backoff with jitter
5. Verify conflict resolution strategies are implemented
6. Verify service worker and PWA manifest
7. Fix any direct IndexedDB access from hooks (should go through infra layer)

Report: hooks count, IndexedDB access violations, sync engine status.
"
  git_checkpoint "audit: phase 1.7 — hooks and state management"

  # ── Block 1.8: Tests & CI/CD ────────────────────────────────────
  run_claude "phase1_08_tests" "
You are a QA architect auditing EFVM360 test infrastructure.

Execute Section 8 from EFVM360_CTO_AUDIT.md (Tests & CI/CD):
1. Run frontend tests: cd frontend && pnpm test -- --reporter=verbose
2. Run backend tests: cd backend && npm test -- --verbose
3. Count E2E tests and load tests
4. Identify critical test gaps (integrity chain, RBAC, offline sync)
5. Verify 4 GitHub Actions workflows exist and are valid YAML
6. Fix any failing tests

DO NOT delete or skip any existing tests. Fix them.

Report: test counts (before/after), passing rate, critical gaps identified.
"
  git_checkpoint "audit: phase 1.8 — tests and CI/CD verification"

  # ── Block 1.9: Performance ──────────────────────────────────────
  run_claude "phase1_09_performance" "
You are a web performance engineer auditing EFVM360.

Execute Section 9 from EFVM360_CTO_AUDIT.md (Performance & Bundle):
1. Run Vite build and measure bundle size: cd frontend && pnpm exec vite build
2. Verify lazy loading on all 11 routes
3. Check for large chunks (>100KB gzip)
4. Verify useMemo/useCallback on expensive computations
5. Identify large lists that need virtualization
6. Check for unnecessary re-renders patterns

Report: bundle size (total, largest chunk), lazy routes count, optimization opportunities.
"
  git_checkpoint "audit: phase 1.9 — performance and bundle analysis"

  # ── Block 1.10: Security Deep Dive ─────────────────────────────
  run_claude "phase1_10_security_deep" "
You are a security architect doing a deep dive on EFVM360.

Execute Section 10 from EFVM360_CTO_AUDIT.md (Security Deep Dive):
1. Verify JWT: access token ≤15min, refresh ≤7 days, rotation on use
2. Verify RBAC: every endpoint has permission check, hierarchy is correct
3. Verify HMAC integrity chain: SHA-256, no bypass routes
4. Verify LGPD: data subject rights endpoints exist
5. Verify rate limiting on auth endpoints
6. Verify Azure AD SSO (PKCE) configuration
7. Fix any security issues found IMMEDIATELY

Report: JWT config, RBAC coverage, integrity chain status, LGPD compliance.
"
  git_checkpoint "audit: phase 1.10 — security deep dive"

  # ── Block 1.11: Documentation & Final Report ───────────────────
  run_claude "phase1_11_final_report" "
You are the CTO finalizing the EFVM360 audit.

Execute Section 11 from EFVM360_CTO_AUDIT.md (Documentation & Final Report):
1. Verify all 6 documentation files exist in docs/
2. Check documentation completeness
3. Generate the FINAL SCORE CARD by reviewing all previous phase results
4. Update EFVM360_CTO_AUDIT.md with actual findings (replace all '⏳' with ✅/❌/⚠️)
5. Write executive summary with:
   - Total issues found
   - Issues auto-fixed
   - Issues requiring manual intervention
   - Overall enterprise readiness score (target: 95%+)

Update CHANGELOG.md with audit results.
"
  git_checkpoint "audit: phase 1.11 — final report and score card"
  git_push_phase "Phase 1 — CTO Audit Complete"
fi

# ═══════════════════════════════════════════════════════════════════
#  PHASE 1.5 — BACKEND ACTIVATION
# ═══════════════════════════════════════════════════════════════════

if should_run 1.5; then
  header "PHASE 1.5 — BACKEND ACTIVATION"

  run_claude "phase15_backend_activation" "
You are a backend engineer activating the EFVM360 backend.

Read EFVM360_BACKEND_ACTIVATION.md for the complete plan.

Execute ALL steps:
1. Map ALL frontend API calls and ALL backend endpoints — identify gaps
2. Create missing Sequelize migrations for ALL tables
3. Create comprehensive seed data (4 users, yard layouts, equipment, risk grades)
4. Fix matrícula validation to accept VFZ/VBR/ADM formats
5. Verify Docker Compose starts correctly (docker-compose config --quiet)
6. Verify API client bridge pattern (backend available → API, unavailable → IndexedDB)
7. Create/fix any missing controllers, routes, or model validations

After ALL changes:
- cd frontend && pnpm exec tsc --noEmit (0 errors)
- cd frontend && pnpm exec vite build (success)
- cd backend && npx tsc --noEmit (0 errors)
- cd frontend && pnpm test (all pass)
- cd backend && npm test (all pass)
"
  git_checkpoint "feat: backend activation — full endpoint coverage, migrations, seeds"
  git_push_phase "Phase 1.5 — Backend Activation Complete"
fi

# ═══════════════════════════════════════════════════════════════════
#  PHASE 2 — BILINGUAL + DESIGN PREMIUM
# ═══════════════════════════════════════════════════════════════════

if should_run 2; then
  header "PHASE 2 — BILINGUAL + DESIGN PREMIUM"

  # ── i18n Setup ──────────────────────────────────────────────────
  run_claude "phase2_01_i18n" "
You are an i18n specialist implementing bilingual support in EFVM360.

Read EFVM360_BILINGUAL_DESIGN.md for the complete plan.

Execute PART 1 (Internationalization):
1. Install react-i18next, i18next, i18next-browser-languagedetector
2. Create i18n config (frontend/src/i18n/index.ts)
3. Create PT-BR translation file with ALL keys from the plan
4. Create EN translation file with ALL keys
5. Add LanguageSwitcher component
6. Migrate ALL 11 pages to use useTranslation() hook
7. Migrate all components to use t() function

After ALL changes, verify:
- cd frontend && pnpm exec tsc --noEmit (0 errors)
- cd frontend && pnpm exec vite build (success)
- cd frontend && pnpm test (all pass — fix any broken tests)
"
  git_checkpoint "feat: i18n — PT-BR + EN bilingual support"

  # ── Design System ───────────────────────────────────────────────
  run_claude "phase2_02_design" "
You are a senior UI engineer implementing the EFVM360 design system.

Read EFVM360_BILINGUAL_DESIGN.md Part 2 for the complete plan.

Execute PART 2 (Design System Premium):
1. Create design tokens file (frontend/src/styles/tokens.ts)
2. Polish dark/light theme implementation
3. Ensure glassmorphism effects are consistent across all cards
4. Add smooth transitions (page, card hover, status pulse)
5. Verify mobile responsiveness on all 11 pages (375px, 768px, 1024px)
6. Ensure touch targets ≥ 44×44px on mobile
7. Verify WCAG contrast ratios (7:1 for safety-critical elements)
8. Add skeleton loaders on async data pages
9. Create Stepper component for handover form sections

After ALL changes, verify build and tests pass.
"
  git_checkpoint "feat: design system premium — tokens, theme, responsiveness"
  git_push_phase "Phase 2 — Bilingual + Design Complete"
fi

# ═══════════════════════════════════════════════════════════════════
#  PHASE 3 — FEATURES EVOLUTION
# ═══════════════════════════════════════════════════════════════════

if should_run 3; then
  header "PHASE 3 — FEATURES EVOLUTION"

  # ── WebSocket Real-Time ─────────────────────────────────────────
  run_claude "phase3_01_websocket" "
You are a real-time systems engineer implementing WebSocket in EFVM360.

Read EFVM360_FEATURES_EVOLUTION.md Phase 3A for the plan.

Implement:
1. Install socket.io (backend) and socket.io-client (frontend)
2. Create WebSocket server with JWT authentication
3. Create useWebSocket hook for frontend
4. Implement real-time yard status updates
5. Add connection status indicator in the dashboard
6. Implement room-based routing (by patio, by role)

Verify build and tests pass after implementation.
"
  git_checkpoint "feat: real-time WebSocket — live yard status"

  # ── PWA Enhanced ────────────────────────────────────────────────
  run_claude "phase3_02_pwa" "
You are a mobile engineer enhancing the EFVM360 PWA.

Read EFVM360_FEATURES_EVOLUTION.md Phase 3C for the plan.

Implement:
1. Install @capacitor/core and @capacitor/cli
2. Configure Capacitor for Android and iOS
3. Implement network detection with @capacitor/network
4. Enhance offline indicator with native-like behavior
5. Add pull-to-refresh on dashboard
6. Verify service worker caching strategy is comprehensive

Verify build passes. Note: Don't install all Capacitor plugins, just core + network.
"
  git_checkpoint "feat: PWA enhanced — Capacitor setup, native offline"

  # ── Integration APIs ────────────────────────────────────────────
  run_claude "phase3_03_integrations" "
You are an API architect implementing integration endpoints for EFVM360.

Read EFVM360_FEATURES_EVOLUTION.md Phase 3D for the plan.

Implement:
1. Create webhook engine (backend/src/services/webhooks.ts)
2. Implement webhook registration endpoints (CRUD)
3. Add HMAC signature verification for webhook payloads
4. Create export API endpoints (handovers, equipment, risk-matrix, KPIs)
5. Support JSON and CSV export formats
6. Add rate limiting on export endpoints

Verify backend build and tests pass.
"
  git_checkpoint "feat: integration APIs — webhooks, export endpoints"

  # ── Advanced Analytics ──────────────────────────────────────────
  run_claude "phase3_04_analytics" "
You are a data engineer implementing advanced analytics for EFVM360.

Read EFVM360_FEATURES_EVOLUTION.md Phase 3E for the plan.

Implement:
1. Trend analysis component (Recharts area chart with trendline)
2. Heatmap component (D3.js — incidents by track × time)
3. Shift comparison view (grouped bar chart)
4. PDF report generator (jsPDF with charts)
5. Add analytics page improvements to the existing BI+ dashboard

Verify build and tests pass.
"
  git_checkpoint "feat: advanced analytics — heatmap, trends, PDF reports"

  # ── Multi-Site + Compliance ─────────────────────────────────────
  run_claude "phase3_05_multisite" "
You are a platform architect implementing multi-site and compliance for EFVM360.

Read EFVM360_FEATURES_EVOLUTION.md Phases 3F and 3G for the plan.

Implement:
1. Add site_id column to all relevant database tables (migration)
2. Create site-context middleware for backend
3. Add site switcher component in navbar
4. Create compliance dashboard with NR status indicators
5. Implement automated compliance alerts (overdue inspections, expired training)
6. Seed data for at least 2 pátios (Tubarão + Costa Lacerda)

Verify build and tests pass.
"
  git_checkpoint "feat: multi-site support + NR compliance automation"
  git_push_phase "Phase 3 — Features Evolution Complete"
fi

# ═══════════════════════════════════════════════════════════════════
#  PHASE 4 — GO-TO-MARKET
# ═══════════════════════════════════════════════════════════════════

if should_run 4; then
  header "PHASE 4 — GO-TO-MARKET"

  run_claude "phase4_go_to_market" "
You are a full-stack engineer implementing Go-to-Market infrastructure for EFVM360.

Read EFVM360_GO_TO_MARKET.md for the complete plan.

Implement (in priority order):
1. Create Terms of Service (docs/TERMS_OF_SERVICE.md) — comprehensive
2. Create Privacy Policy (docs/PRIVACY_POLICY.md) — LGPD + GDPR compliant
3. Create a landing page (frontend/src/pages/landing/) with:
   - Hero section with product screenshots
   - Features grid (6 features)
   - Pricing tiers (Starter, Professional, Enterprise)
   - FAQ section
   - CTA buttons
4. Create a help center page (frontend/src/pages/help/) with:
   - Getting Started guides
   - Feature documentation
   - Troubleshooting
5. Set up product analytics tracking (events for key user actions)
6. Create admin dashboard page with business metrics (MRR, users, usage)

Verify build and tests pass. Update CHANGELOG.md with all new features.
"
  git_checkpoint "feat: go-to-market — landing page, pricing, legal, help center"
  git_push_phase "Phase 4 — Go-to-Market Complete"
fi

# ═══════════════════════════════════════════════════════════════════
#  FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════════

header "🎉 EFVM360 ENTERPRISE EVOLUTION — COMPLETE"

echo -e "${GREEN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║                                                      ║"
echo "  ║   EFVM360 Enterprise Evolution Pipeline Complete!    ║"
echo "  ║                                                      ║"
echo "  ║   Phase 1:   CTO Audit (11 blocks)                  ║"
echo "  ║   Phase 1.5: Backend Activation                     ║"
echo "  ║   Phase 2:   Bilingual + Design Premium             ║"
echo "  ║   Phase 3:   Features Evolution (7 features)        ║"
echo "  ║   Phase 4:   Go-to-Market                           ║"
echo "  ║                                                      ║"
echo "  ║   Logs: .audit-logs/                                 ║"
echo "  ║   Git: All changes committed and pushed              ║"
echo "  ║                                                      ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

log "Total execution logs in: ${LOG_DIR}/"
log "Review results at: https://github.com/GregoryGSPinto/efvm360"
log "Live deploy at: https://efvm360.vercel.app"
