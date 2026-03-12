# Truth Matrix

This matrix records the major documentation corrections made during the repository audit.

| Current claim | Evidence in code/config | Status | Action taken |
| --- | --- | --- | --- |
| Repo used mixed `npm`/`pnpm` instructions | Root workspace, package metadata, Vercel, workflows, Dockerfiles | incorreto | Standardized on `pnpm` and rewrote docs |
| README and changelogs reported unsupported counts and production claims | Current file tree, test folders, workflows, scripts | incorreto | Removed unverifiable counts from README and replaced changelog with factual audit entry |
| Public docs implied institutional affiliation and operational rollout | README, legal docs, package metadata, workflow comments | incorreto | Added independent portfolio positioning and removed affiliation language |
| Deploy docs implied a proven production environment | `vercel.json`, Azure workflows, compose files, absence of runtime evidence | parcial | Reframed deploy assets as configuration templates unless externally validated |
| Historical audit documents claimed readiness scores and test totals not anchored to current tree | Current repository facts and tests folders | não comprovado | Marked historical audit/planning docs as superseded |
| Frontend/backend integration was described as complete | Frontend hooks still use local storage in multiple flows | parcial | Documented the integration state as partial |
| Legal documents behaved like live service policies and contracts | Repository is an open source portfolio case study | incorreto | Replaced with non-operative portfolio/legal positioning notes |

## Files Covered

- `README.md`
- `DEPLOY.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `docs/**`
- `AUDIT_README.md`
- `EFVM360_*.md`
- `frontend/README.md`
- `frontend/CHANGELOG.md`
