# Backend Implementation Status

**Reviewed:** 2026-11-15. **Authority:** [API_CONTRACT.md](./API_CONTRACT.md). This reports the local implementation and verification only; it is not production certification.

## Implemented

- First-party email/password registration and login with normalized email and versioned salted standard-library `scrypt` hashes. Login is rate-limited per account/client address. Registration is disabled in production configuration.
- Opaque database-backed sessions stored by SHA-256 token hash, 12-hour expiry, cookie rotation on login, logout revocation, session-bound CSRF, `Origin` checks, `HttpOnly`, `SameSite=Lax`, and `Secure` outside loopback development.
- One immutable-owner profile per user; `/api/v1/me` and `GET/PATCH /api/v1/me/profile` derive identity from the session.
- Create/list/detail/correct APIs for heart rate, paired blood pressure, body temperature, blood glucose, and sleep duration. Decimal strings, units, submitted timestamp offsets, optional IANA timezone, notes, manual source, and server timestamps are preserved. No DELETE route exists.
- Owner-scoped category/date-filtered measurement reads; foreign and unknown IDs both return sanitized `404`. The old `/api/v1/profiles/...` repositories expose synthetic profiles only and cannot access actual records.
- Owner-scoped UTC daily trends with per-unit series, separate blood-pressure fields, null values on empty days, and no interpolation.
- RFC 9457 errors, request IDs, allowlisted logs, SQLite owner-only file permissions, Alembic migration `0003`, and no startup seeding or implicit migration.

## Routes

`POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`; `GET /api/v1/me`, `GET/PATCH /api/v1/me/profile`; `POST/GET /api/v1/me/measurements`, `GET/PATCH /api/v1/me/measurements/{measurement_id}`, `GET /api/v1/me/trends`; operational health/readiness; and development-only synthetic legacy routes.

## Verification

From `backend/`:

```sh
.venv/bin/pytest -q
```

The final complete run reported **94 passed** with one existing Starlette/AnyIO `BlockingPortal` deprecation warning. Migration tests upgrade a clean SQLite database through head and downgrade to base.

Coverage includes anonymous denial, CSRF/logout, cross-user detail and correction denial, legacy-route synthetic isolation, all five categories, invalid units/values and incomplete blood pressure, timestamp/unit preservation, filtering, retries/conflicts, trends/gaps/range limits, sanitized errors/logs, production registration disablement, and SQLite permissions.

## Limits

No account recovery/email verification, account deletion, retention/backup lifecycle, password reset, public registration, formal security/privacy/legal review, or remote deployment hardening is implemented. Keep the service local and do not claim production readiness, clinical validation, or NASA endorsement.
