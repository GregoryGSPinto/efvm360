# Changelog

This file records repository changes that are directly verifiable from the current tree.

## [Unreleased]

## [2026-03-12] - Repository audit and normalization

### Changed

- Standardized the monorepo on `pnpm` across root scripts, package metadata, Vercel config, Dockerfiles, and GitHub Actions.
- Added a generated repository facts document and markdown link validation via `scripts/repo-facts.mjs`.
- Rewrote public-facing documentation to distinguish implemented code, partial integration, and roadmap intent.
- Removed or superseded historical documentation that contained unsupported metrics, legal claims, or institutional ambiguity.

### Notes

- Earlier changelog entries were removed because they mixed verified changes with unverified counts and operational claims.
- The current source of truth for repository scope is `README.md` plus the documents under `docs/`.
