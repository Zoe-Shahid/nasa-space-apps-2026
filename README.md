# AstroOrbitX

AstroOrbitX is a local health-measurement MVP for account owners to record and review their own values. It includes first-party accounts, owner-scoped records, history, dashboard summaries, and daily descriptive trends. It is not clinically validated, a diagnostic or treatment system, or NASA-endorsed. It does not label readings normal/abnormal or calculate medical risk.

The contract is in [API_CONTRACT.md](API_CONTRACT.md). Local setup and verification are in [docs/ACTUAL_MVP_HANDOFF.md](docs/ACTUAL_MVP_HANDOFF.md); current backend/frontend scope is summarized in [BACKEND_IMPLEMENTATION_STATUS.md](BACKEND_IMPLEMENTATION_STATUS.md) and [FRONTEND_IMPLEMENTATION_STATUS.md](FRONTEND_IMPLEMENTATION_STATUS.md).

The local MVP has no account recovery or email verification. Production registration is disabled. Do not expose it publicly or enter real health information until privacy, retention, recovery, backup, deployment, and security-review gates are resolved. Existing synthetic records remain isolated from authenticated actual-user views.
