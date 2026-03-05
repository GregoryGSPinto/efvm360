#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  EFVM360 — Senior QA Full Sweep
#  Testa absolutamente tudo e corrige cada problema encontrado.
#
#  Usage:
#    chmod +x run-qa-sweep.sh
#    ./run-qa-sweep.sh
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="${PROJECT_ROOT}/.audit-logs"
mkdir -p "$LOG_DIR"

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  EFVM360 — Senior QA Full Sweep                          ${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Preflight
if [[ ! -f "${PROJECT_ROOT}/package.json" ]]; then
  echo -e "${RED}❌ Not in efvm360 root. cd into the project first.${NC}"
  exit 1
fi

if ! command -v claude &> /dev/null; then
  echo -e "${RED}❌ Claude Code CLI not found.${NC}"
  exit 1
fi

echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} Starting QA sweep..."
echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} Log: ${LOG_DIR}/${TIMESTAMP}_qa_sweep.log"

claude --dangerously-skip-permissions -p "
You are a Senior QA Engineer with 15 years of experience in enterprise web applications, specializing in safety-critical railway systems. You are performing a COMPREHENSIVE quality sweep of the EFVM360 platform.

YOUR MISSION: Test EVERYTHING, report EVERYTHING, fix EVERYTHING you can.

═══════════════════════════════════════════════════════════
PHASE 1 — BUILD & COMPILE HEALTH
═══════════════════════════════════════════════════════════

1.1 Run these and report EVERY warning and error:
    cd frontend && pnpm exec tsc --noEmit 2>&1
    cd frontend && pnpm exec vite build 2>&1
    cd backend && npx tsc --noEmit 2>&1

1.2 Check for:
    - TypeScript errors (must be ZERO)
    - Vite build warnings (chunk size, circular deps, missing exports)
    - Deprecated API usage warnings
    - Any 'Module not found' or 'Cannot resolve' errors

1.3 Fix every error found. If a fix would be risky, document it instead.

═══════════════════════════════════════════════════════════
PHASE 2 — STATIC CODE ANALYSIS
═══════════════════════════════════════════════════════════

2.1 Dead code scan:
    - grep -rn 'any' types in src/ (not tests): grep -rn ': any\|as any\|<any>' frontend/src/ --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v __tests__ | grep -v _deprecated
    - console.log in production: grep -rn 'console\.log\|console\.warn\|console\.error\|console\.debug' frontend/src/ --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v __tests__
    - Same for backend: grep -rn 'console\.log' backend/src/ --include='*.ts' | grep -v node_modules | grep -v __tests__
    - Unused imports: Look for imports not referenced in the same file
    - TODO/FIXME/HACK comments: grep -rn 'TODO\|FIXME\|HACK\|XXX\|TEMP\|WORKAROUND' frontend/src/ backend/src/ --include='*.ts' --include='*.tsx' | grep -v node_modules

2.2 Report counts and fix what you can (remove dead console.log, fix 'any' types, remove unused imports).

═══════════════════════════════════════════════════════════
PHASE 3 — ROUTER & NAVIGATION INTEGRITY
═══════════════════════════════════════════════════════════

3.1 Extract ALL routes defined in the router:
    cat frontend/src/router/routes.ts (or wherever routes are defined)
    grep -rn 'path:\|Route\|<Route' frontend/src/ --include='*.tsx' | head -50

3.2 For EVERY route, verify:
    - The target component exists and exports correctly
    - React.lazy() is used (not static import) for all page routes
    - Suspense fallback is present
    - Auth guard wraps protected routes
    - The page component actually renders without runtime errors (check for missing imports, undefined references)

3.3 Check for:
    - Orphan pages (components in pages/ not connected to any route)
    - Duplicate routes (same path, different components)
    - Dead links in navigation components (TopNavbar, BottomNav, Sidebar)
    - Navigate/Link components pointing to non-existent routes
    grep -rn 'navigate(\|to=\"\|to={\|href=\"' frontend/src/ --include='*.tsx' | grep -v node_modules | grep -v __tests__

3.4 Verify navigation flow:
    - Login → Dashboard redirect
    - Logout → Login redirect
    - 404 / catch-all route exists
    - Back button works (no navigate(-1) without history check)
    - Deep link to each route should work (not redirect away)

3.5 Fix every broken link, missing route, or navigation issue.

═══════════════════════════════════════════════════════════
PHASE 4 — FORM VALIDATION & DATA INTEGRITY
═══════════════════════════════════════════════════════════

4.1 Passagem de Serviço (the core form — 12 sections):
    - Find the main form component
    - Verify ALL 12 sections are rendered
    - Check each section has validation (required fields, format checks)
    - Verify form state management (useFormulario hook)
    - Check submission handler sends correct payload
    - Verify offline save (IndexedDB) works
    - Check signature flow (sign → lock → cannot edit)

4.2 Login form:
    - Matrícula accepts VFZ/VBR/ADM formats
    - Password field masks input
    - Error message on invalid credentials
    - Rate limiting visual feedback
    - Azure AD SSO button (if present) has correct config

4.3 Layout de Pátio forms:
    - CRUD operations (create, read, update, delete) have proper validation
    - Line status changes validate allowed transitions
    - AMV position toggle works

4.4 Risk Assessment (Graus de Risco):
    - 5×5 matrix renders correctly
    - Probability and Impact selectors work
    - Grade auto-calculates from P×I
    - Mitigation field is required for HIGH/CRITICAL

4.5 Equipment Management:
    - Category filter works
    - Criticality level validation
    - Minimum quantity per shift enforced

4.6 For EACH form, verify:
    - Required field indicators (visual: asterisk, red border, etc.)
    - Error messages show in Portuguese (or current i18n language)
    - Submit button disables during submission
    - Success/error toast/notification after submission
    - Form clears/resets after successful submission (where appropriate)

4.7 Fix every validation gap, missing error message, or broken form flow.

═══════════════════════════════════════════════════════════
PHASE 5 — i18n VERIFICATION
═══════════════════════════════════════════════════════════

5.1 Check if i18n is implemented:
    find frontend/src/ -name 'i18n*' -o -name '*i18next*' -o -name '*locale*' | grep -v node_modules
    grep -rn 'useTranslation\|i18next\|t(' frontend/src/ --include='*.tsx' --include='*.ts' | head -20

5.2 If i18n IS implemented:
    - Verify ALL user-facing strings use t() function
    - Check for hardcoded Portuguese strings in components: grep -rn '\"[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ][a-záéíóúãõâêîôûç]' frontend/src/ --include='*.tsx' | grep -v import | grep -v '//' | head -50
    - Verify translation files have ALL keys (no missing translations)
    - Verify language switcher exists and works
    - Verify fallback language (pt-BR) loads correctly
    - Check date/number formatting respects locale

5.3 If i18n is NOT yet implemented:
    - Count all hardcoded user-facing strings
    - Report as 'i18n not implemented — Phase 2 dependency'
    - Do NOT implement i18n (it's a Phase 2 task), just report

═══════════════════════════════════════════════════════════
PHASE 6 — THEME & VISUAL CONSISTENCY
═══════════════════════════════════════════════════════════

6.1 Theme system:
    - Find theme config: grep -rn 'theme\|Theme\|darkMode\|dark-mode\|data-theme' frontend/src/ --include='*.ts' --include='*.tsx' --include='*.css' | head -30
    - Verify dark/light toggle exists and works
    - Check that ALL components respect theme (no hardcoded colors)
    - grep for hardcoded color values: grep -rn '#[0-9a-fA-F]\{3,6\}\|rgb(\|rgba(' frontend/src/ --include='*.tsx' --include='*.css' | grep -v node_modules | grep -v __tests__ | wc -l

6.2 Design tokens:
    - Check if design tokens file exists (tokens.ts, theme.ts, variables.css)
    - Verify Vale corporate colors are used (green #00843D, yellow #FFD100)
    - Check contrast ratios for safety-critical text (should be ≥4.5:1 AA, ideally ≥7:1 AAA)

6.3 Glassmorphism:
    - grep -rn 'backdrop-filter\|backdropFilter\|blur(' frontend/src/ --include='*.tsx' --include='*.css' | head -20
    - Verify glassmorphism is consistent (same blur, opacity, border across cards)
    - Check for browser compatibility (Safari needs -webkit-backdrop-filter)

6.4 Responsive breakpoints:
    - grep -rn '@media\|useMediaQuery\|matchMedia\|breakpoint' frontend/src/ --include='*.tsx' --include='*.css' --include='*.ts' | head -20
    - Verify mobile-first approach (min-width, not max-width)
    - Check touch targets ≥ 44x44px for buttons/links on mobile

6.5 Fix any inconsistencies: missing dark mode support, hardcoded colors that break theme, missing webkit prefixes.

═══════════════════════════════════════════════════════════
PHASE 7 — COMPONENT QUALITY
═══════════════════════════════════════════════════════════

7.1 For EVERY component in components/ directory:
    find frontend/src/components/ -name '*.tsx' -type f | grep -v __tests__ | sort

    Check each has:
    - TypeScript interface for props
    - Proper key prop on .map() iterations
    - No inline styles (should use theme/tokens)
    - Error boundaries where appropriate
    - Loading states for async data
    - Accessibility: aria-labels on interactive elements, alt on images

7.2 Large component decomposition check:
    find frontend/src/ -name '*.tsx' -type f -exec wc -l {} + | sort -rn | head -20
    - Any file >500 lines: flag for decomposition
    - Any file >1000 lines: flag as CRITICAL

7.3 Check for common React anti-patterns:
    - Inline object/array creation in JSX props (causes re-renders): grep -n 'style={{' frontend/src/ -r --include='*.tsx' | wc -l
    - Missing dependency arrays in useEffect: Look for useEffect without deps
    - State updates in render (no setState in component body outside hooks)

7.4 Fix what you can (add missing keys, fix accessibility, remove inline styles where trivial).

═══════════════════════════════════════════════════════════
PHASE 8 — SEO & META
═══════════════════════════════════════════════════════════

8.1 Check index.html:
    cat frontend/index.html
    Verify:
    - <title> tag present and descriptive
    - <meta name='description'> present
    - <meta name='viewport'> with proper mobile config
    - <meta charset='UTF-8'>
    - <link rel='icon'> (favicon)
    - <link rel='manifest'> (PWA)
    - Open Graph tags (og:title, og:description, og:image)
    - Twitter card tags
    - <html lang='pt-BR'>
    - <meta name='theme-color'>

8.2 Check PWA manifest:
    cat frontend/public/manifest.json
    Verify:
    - name and short_name
    - Icons: at least 192x192 and 512x512
    - display: standalone
    - theme_color and background_color
    - start_url
    - scope

8.3 Check robots.txt:
    cat frontend/public/robots.txt 2>/dev/null || echo 'MISSING'

8.4 Check sitemap:
    find frontend/public/ -name 'sitemap*' 2>/dev/null || echo 'No sitemap found'

8.5 Fix: Add missing meta tags, fix manifest issues, create robots.txt if missing.

═══════════════════════════════════════════════════════════
PHASE 9 — MOBILE & PWA
═══════════════════════════════════════════════════════════

9.1 Service Worker:
    find frontend/ -name 'sw*' -o -name 'service-worker*' | grep -v node_modules
    - Verify registration in main.tsx or index.tsx
    - Check caching strategy (NetworkFirst for API, CacheFirst for assets)
    - Verify offline fallback page exists

9.2 Mobile navigation:
    - Bottom navigation exists for mobile
    - Touch targets ≥ 44x44px
    - No horizontal overflow (100vw issues)
    - Font sizes ≥ 16px on mobile (prevents iOS zoom on input focus)
    grep -rn 'font-size.*1[0-5]px\|fontSize.*1[0-5]' frontend/src/ --include='*.tsx' --include='*.css' | head -10

9.3 Mobile-specific features:
    - Pull-to-refresh on dashboard/lists
    - Swipe gestures (if applicable)
    - viewport meta prevents pinch-zoom on forms (user-scalable=no for form pages, yes for content)
    - Safe area insets for notch devices (env(safe-area-inset-*))

9.4 Fix any mobile issues found.

═══════════════════════════════════════════════════════════
PHASE 10 — SECURITY SURFACE CHECK
═══════════════════════════════════════════════════════════

10.1 Frontend security:
    - No secrets/tokens in source code: grep -rn 'api_key\|apiKey\|secret\|password\|token' frontend/src/ --include='*.ts' --include='*.tsx' | grep -v __tests__ | grep -v 'type\|interface\|Token\|token:' | head -20
    - XSS: grep -rn 'dangerouslySetInnerHTML\|innerHTML\|v-html' frontend/src/ --include='*.tsx' | head -10
    - eval usage: grep -rn 'eval(\|Function(' frontend/src/ --include='*.ts' --include='*.tsx' | head -5
    - Insecure links: grep -rn 'target=\"_blank\"' frontend/src/ --include='*.tsx' | grep -v 'rel=\"noopener' | head -10

10.2 Backend security:
    - SQL injection: grep -rn 'query(\|raw(\|literal(' backend/src/ --include='*.ts' | grep -v __tests__ | head -10
    - No hardcoded secrets: grep -rn 'password.*=.*[\"'\'']' backend/src/ --include='*.ts' | grep -v __tests__ | grep -v 'process.env\|\.env\|example\|placeholder' | head -10
    - CORS config: grep -rn 'cors\|CORS' backend/src/ --include='*.ts' | head -10

10.3 Fix: Add rel='noopener noreferrer' to _blank links, remove any dangerouslySetInnerHTML, fix CORS if too permissive.

═══════════════════════════════════════════════════════════
PHASE 11 — TEST HEALTH
═══════════════════════════════════════════════════════════

11.1 Run ALL tests:
    cd frontend && pnpm test 2>&1
    cd backend && npm test 2>&1

11.2 Report:
    - Total tests: X
    - Passing: X
    - Failing: X (list each failure with file:line)
    - Skipped: X

11.3 Fix every failing test. Do NOT delete or skip tests.
    If a test fails because of your earlier fixes, update the test to match new behavior.

11.4 Check test quality:
    - Tests with 'any': grep -rn ': any\|as any' frontend/__tests__/ backend/__tests__/ --include='*.ts' | wc -l
    - Empty test files: find frontend/__tests__ backend/__tests__ -name '*.ts' -empty 2>/dev/null
    - Tests without assertions: grep -rL 'expect\|assert' frontend/__tests__/*.test.ts backend/__tests__/*.test.ts 2>/dev/null | head -10

═══════════════════════════════════════════════════════════
PHASE 12 — DEPENDENCY HEALTH
═══════════════════════════════════════════════════════════

12.1 Audit:
    cd frontend && pnpm audit 2>&1 | tail -20
    cd backend && npm audit 2>&1 | tail -20

12.2 Check outdated:
    cd frontend && pnpm outdated 2>&1 | head -30
    cd backend && npm outdated 2>&1 | head -30

12.3 Check for duplicate dependencies:
    cd frontend && pnpm ls --depth 0 2>&1 | head -40

12.4 Fix HIGH/CRITICAL vulnerabilities if possible without breaking changes.

═══════════════════════════════════════════════════════════
FINAL — QA REPORT & FIXES
═══════════════════════════════════════════════════════════

After completing ALL phases, produce a FINAL QA REPORT with:

1. Summary table:
   | Phase | Issues Found | Auto-Fixed | Manual Fix Needed |
   
2. CRITICAL issues (must fix before deploy)
3. HIGH issues (should fix soon)  
4. MEDIUM issues (can defer)
5. LOW issues (nice to have)

6. Final verification:
   cd frontend && pnpm exec tsc --noEmit (MUST be 0 errors)
   cd frontend && pnpm exec vite build (MUST succeed)
   cd backend && npx tsc --noEmit (MUST be 0 errors)
   cd frontend && pnpm test (ALL must pass)
   cd backend && npm test (ALL must pass)

IMPORTANT RULES:
- DO NOT delete or skip any test
- DO NOT change business logic
- DO NOT introduce new dependencies unless absolutely necessary
- Fix issues IN PLACE — do not create wrapper files or shims
- Every fix must preserve backward compatibility
- If you cannot fix something safely, document it clearly with severity and recommendation
- Commit message: 'qa: senior QA full sweep — X issues found, Y fixed'
" 2>&1 | tee "${LOG_DIR}/${TIMESTAMP}_qa_sweep.log"

# Check exit code
if [[ $? -eq 0 ]]; then
  echo ""
  echo -e "${GREEN}✅ QA Sweep completed${NC}"
  
  # Auto-commit if there are changes
  cd "$PROJECT_ROOT"
  git add -A
  if ! git diff --cached --quiet 2>/dev/null; then
    git commit -m "qa: senior QA full sweep — automated fixes" --no-verify
    echo -e "${GREEN}✅ Changes committed${NC}"
    git push origin main 2>/dev/null || git push origin HEAD 2>/dev/null || echo -e "${CYAN}⚠️  Push manually: git push${NC}"
  else
    echo -e "${CYAN}ℹ️  No changes to commit${NC}"
  fi
else
  echo -e "${RED}❌ QA Sweep encountered errors — check log: ${LOG_DIR}/${TIMESTAMP}_qa_sweep.log${NC}"
fi
