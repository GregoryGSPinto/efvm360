# Contributing to EFVM360

Thank you for your interest in contributing to EFVM360. This guide covers setup, conventions, and the PR process.

## Architecture Overview

EFVM360 is a pnpm monorepo with two packages: a React 18 frontend (Vite + TypeScript) and an Express backend (Sequelize + MySQL). The frontend follows Domain-Driven Design with event sourcing and CQRS, operates offline-first via IndexedDB, and uses a SHA-256 integrity chain for sealed shift handovers. The backend provides JWT authentication, RBAC authorization, and a REST API documented via OpenAPI/Swagger. See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the full technical deep-dive.

## Development Setup

### Prerequisites

- **Node.js** >= 18
- **pnpm** >= 9 (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Docker Desktop** (for MySQL in development)

### Quick Start

```bash
# Clone and install
git clone https://github.com/GregoryGSPinto/efvm360.git
cd efvm360
pnpm install

# Start MySQL + backend
docker compose up -d

# Seed the database (37 demo users)
cd backend && pnpm run seed && cd ..

# Start frontend dev server
cd frontend && pnpm dev
```

### Running Tests

```bash
# All tests (frontend + backend)
pnpm test

# Frontend only (451 Vitest tests)
pnpm test:frontend

# Backend only (Jest)
pnpm test:backend

# Type checking
pnpm type-check
```

### Demo Credentials

| Matricula | Password | Role | Scope |
|-----------|----------|------|-------|
| VFZ1001 | 123456 | Maquinista | Flexal yard |
| VFZ2001 | 123456 | Inspetor | Flexal yard |
| ADM9001 | 123456 | Gestor | All yards |

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `chore` | Build process, dependencies, CI changes |

### Scopes

Use the package name as scope when applicable: `feat(frontend)`, `fix(backend)`, `test(domain)`.

## Pull Request Process

1. **Branch from `main`** — Use descriptive branch names: `feat/multi-tab-sync`, `fix/voice-pitch`
2. **Keep PRs focused** — One logical change per PR. If you're fixing a bug and refactoring nearby code, split them
3. **Write tests** — New features need tests. Bug fixes need a regression test
4. **Ensure CI passes** — `pnpm type-check && pnpm test && pnpm build`
5. **PR description** — Include a summary, what changed, and how to test it
6. **Review** — All PRs require at least one review before merge

## Code Style

- **Language**: Code in English, UI labels in Brazilian Portuguese
- **Domain is sacred**: Never import infrastructure, UI, or framework code inside `src/domain/`
- **Offline-first**: Every operation must work without network. SyncEngine handles reconciliation
- **No `@ts-ignore`**: Fix the types properly
- **Inline styles**: The frontend uses inline styles with glassmorphism patterns — follow existing conventions

## Reporting Issues

Open an issue on GitHub with:
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS version (for frontend issues)
- Relevant logs or screenshots
