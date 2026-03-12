# Demo Script

Target length: 10 to 15 minutes.

## Goal

Show what is real today without depending on claims that require a live enterprise environment.

## Recommended Flow

1. Open the README and call out the three states used in the repo: implemented, partial, roadmap.
2. Start the frontend in demo/offline mode and show login plus the main navigation surface.
3. Walk through the handover flow and explain that local persistence works even without backend connectivity.
4. Show DSS, dashboards, risk grades, and settings to demonstrate breadth of the frontend.
5. Open the backend route file and Swagger setup to show that the API surface is real and not mocked in documentation.
6. Show the test directories for frontend, backend, Playwright, and k6.
7. Show the CI workflow and the `pnpm verify` contract.
8. Close with known gaps: incomplete frontend/backend convergence and cloud deployment still requiring external validation.

## Talking Points

- Business: handover quality depends on structured context capture, not just dashboards.
- Architecture: the frontend can operate locally while the backend grows into the system-of-record role.
- Release engineering: the repo now uses one package manager and one command vocabulary.

## Fallbacks

- If the backend is unavailable, keep the demo in offline mode and explicitly say the backend API exists but is only partially integrated.
- If Docker is unavailable, run `pnpm dev` from the workspace and present the code plus tests.
- If browser demo is not possible, use `docs/TECHNICAL_EVIDENCE.md` and `docs/IMPLEMENTATION_STATUS.md` as the walkthrough.
