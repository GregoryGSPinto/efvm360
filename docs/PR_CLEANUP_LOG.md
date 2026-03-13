# PR / Branch Cleanup Log

Generated: 2026-03-12

All open branches are automated Dependabot dependency bumps. None have been merged into `main`.

## Recommended Actions

| Branch | Type | Recommendation |
|--------|------|----------------|
| `dependabot/github_actions/actions/checkout-6` | GitHub Actions | Review & merge or close — bumps actions/checkout 4 → 6 |
| `dependabot/github_actions/actions/setup-node-6` | GitHub Actions | Review & merge or close — bumps actions/setup-node 4 → 6 |
| `dependabot/github_actions/actions/upload-artifact-6` | GitHub Actions | Close — superseded by upload-artifact-7 branch |
| `dependabot/github_actions/actions/upload-artifact-7` | GitHub Actions | Review & merge — bumps actions/upload-artifact 4 → 7 |
| `dependabot/github_actions/github/codeql-action-4` | GitHub Actions | Review & merge or close — bumps github/codeql-action 3 → 4 |
| `dependabot/npm_and_yarn/backend/applicationinsights-3.13.0` | Backend dep | Review & merge — bumps applicationinsights |
| `dependabot/npm_and_yarn/backend/dotenv-17.3.1` | Backend dep | Review — major version bump (16 → 17), check breaking changes |
| `dependabot/npm_and_yarn/backend/helmet-8.1.0` | Backend dep | Review — major version bump (7 → 8), check breaking changes |
| `dependabot/npm_and_yarn/backend/multi-6d7db9f379` | Backend dep | Review & merge — bumps bcryptjs and @types/bcryptjs |
| `dependabot/npm_and_yarn/backend/multi-a28ee524ce` | Backend dep | Review & merge — bumps jest and @types/jest |
| `dependabot/npm_and_yarn/backend/types/express-5.0.6` | Backend dep | Review — major version bump for @types/express |
| `dependabot/npm_and_yarn/backend/types/node-25.3.3` | Backend dep | Review & merge — @types/node update |
| `dependabot/npm_and_yarn/backend/types/uuid-11.0.0` | Backend dep | Review — major version bump (9 → 11) for @types/uuid |
| `dependabot/npm_and_yarn/backend/typescript-eslint/eslint-plugin-8.56.1` | Backend dep | Review & merge — @typescript-eslint/eslint-plugin update |
| `dependabot/npm_and_yarn/backend/typescript-eslint/parser-8.56.1` | Backend dep | Review & merge — @typescript-eslint/parser update |

## Summary

- **Total open branches:** 15
- **All are Dependabot PRs** — no feature branches or stale work-in-progress
- **Superseded:** upload-artifact-6 (replaced by upload-artifact-7)
- **Major bumps requiring review:** dotenv, helmet, @types/express, @types/uuid

## Next Steps

1. Close the superseded `upload-artifact-6` PR with a comment referencing the `-7` version
2. Batch-merge compatible minor/patch updates after CI passes
3. Review major version bumps individually for breaking changes
4. Delete merged remote branches after PR closure
