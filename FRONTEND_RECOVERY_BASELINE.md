# Frontend Recovery Baseline

**Checkpoint date:** 2026-11-15  
**Purpose:** preserve the current authenticated measurement MVP before any presentation-frontend recovery or reconstruction work.

## Checkpoint

- Git metadata is unavailable at the workspace root or below it. `git rev-parse --show-toplevel`, `git status --short --branch`, and `git log -5 --oneline` all report that this is not a Git repository.
- Branch, commit, recent history, and Git dirty-file status are therefore **unavailable**. The project must not be described as a clean worktree.
- A private archive was created outside the source tree: `/home/daud/Downloads/astroorbitx-recovery-20261115-031306.tar.gz` (mode `0600`). Archive listing verification confirmed the application entry points, auth test, and handoff documentation are included.
- The archive excludes `.venv`, `node_modules`, `dist`, Python/test caches, SQLite/database files, and local `.env` files. `.env.example` templates are retained.
- No application files were changed before the archive was created. This baseline document was added afterward and is not included in that archive.

## Current Project Entry Points

- Frontend document: `frontend/index.html`
- Frontend bootstrap and global styles: `frontend/src/main.tsx`
- Frontend router and active authenticated routes: `frontend/src/App.tsx`
- Frontend API transport: `frontend/src/data/http.ts`
- Authentication state and route protection: `frontend/src/lib/AuthContext.tsx`, `frontend/src/data/authApi.ts`
- Measurement adapter: `frontend/src/data/measurementsApi.ts`
- Backend ASGI entry point: `backend/app/main.py` (`app` and `create_app`)
- Backend API router: `backend/app/api/router.py`
- Backend migrations: `backend/migrations/versions/`

The active app routes are landing/sign-in, protected overview, profile, measurement entry, history, trends, about, and development-only design system. The nine-screen presentation recovery has not started. Do not overwrite or replace the active authenticated MVP.

## Toolchain And Commands

- `frontend/package.json` has no `engines` or `packageManager` declaration. `frontend/package-lock.json` uses lockfile version 3.
- Verified local toolchain: Node.js `v22.14.0`, npm `10.9.2`.
- Frontend install and checks, from `frontend/`:

```sh
npm ci
npm test
npm run lint
npm run typecheck
npm run build
```

- Frontend development server: `npm run dev -- --host 127.0.0.1`.
- Backend tests, from `backend/`: `.venv/bin/pytest -q`.
- Backend migration checks: `.venv/bin/alembic upgrade head`; `.venv/bin/alembic downgrade base`.
- Backend local server: `.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --no-access-log`.

## Verification At Checkpoint

- Backend: `.venv/bin/pytest -q` completed on 2026-11-15 with **94 passed** and one existing Starlette/AnyIO `BlockingPortal` deprecation warning.
- Frontend: current-session checks after `npm ci` reported 17 test files / 72 tests passed, lint passed, typecheck passed, and production build passed (91 modules transformed). Node and npm were installed in the user-local tool directory and did not change package versions.
- Browser end-to-end account/measurement workflow: **not yet verified** at checkpoint time. A Vite overview page was open, but no complete workflow result is recorded.
- None of these checks establish production readiness, clinical validation, NASA endorsement, or source recovery.

## Recovery Boundary

This checkpoint is for safe continuation only. Prompts 0–1 are documentation/inventory phases. Search the current project, any available local source/archive, and Git history only if Git metadata becomes available. The supplied PDF is a screen reference, not source. Do not restore or reconstruct screens until the inventory is reviewed; do not remove or bypass authentication, ownership, CSRF, migrations, tests, or the current MVP.