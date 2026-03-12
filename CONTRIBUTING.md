# Contributing

This repository uses a single convention: `pnpm` at the workspace root.

## Setup

```bash
pnpm install
docker compose up -d
pnpm dev
```

## Canonical Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
pnpm verify
```

## Workspace Layout

- `frontend`: React/Vite application
- `backend`: Express/Sequelize API
- `e2e`: Playwright tests

## Working Rules

- Prefer root commands unless you are debugging a specific package.
- Keep new docs factual and traceable to code or config.
- Do not add institutional or commercial claims without evidence in the repository.
- If you add numeric claims, update `docs/REPOSITORY_FACTS.md` with `pnpm facts`.

## Package-Specific Commands

```bash
pnpm --filter @efvm360/frontend dev
pnpm --filter @efvm360/backend dev
pnpm --filter @efvm360/e2e test
```

## Pull Requests

- Keep the scope narrow.
- Include the exact commands you used for validation.
- Update docs when code changes alter runtime behavior, scripts, or environment requirements.
- Treat README and `docs/` as audited artifacts, not marketing copy.
