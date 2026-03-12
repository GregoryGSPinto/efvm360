# Solution Architecture Roadmap

This roadmap is descriptive, not proof of current implementation.

## Quick Wins

1. Finish frontend/backend convergence for passagens, DSS, and config flows.
2. Remove duplicate sync implementations.
3. Keep generated repository facts in CI.

## Medium Impact

1. Add reproducible E2E startup orchestration.
2. Add deployment smoke checks for backend health and frontend asset serving.
3. Narrow oversized modules in the frontend.

## High Leverage

1. Prove a real hosted environment with observable telemetry and rollback evidence.
2. Replace local-first demo persistence with backend-first flows where appropriate.
3. Add operator-specific governance and compliance materials only when backed by a real deployment context.
