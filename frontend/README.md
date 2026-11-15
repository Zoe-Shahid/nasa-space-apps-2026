# AstroOrbitX frontend

React, TypeScript, and Vite client for the authenticated local measurement MVP. It provides account sign-in/registration, profile editing, five-category entry, owner-scoped history, a saved-record dashboard, and daily trend views. It does not diagnose, assess medical risk, or provide treatment advice. See the [API contract](../API_CONTRACT.md) and [MVP handoff](../docs/ACTUAL_MVP_HANDOFF.md).

## Start locally

Requirements: Node.js 20+ and npm. Start the backend on `127.0.0.1:8000`, set `VITE_API_BASE_URL=http://127.0.0.1:8000` in `.env.local`, then run:

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Use the Vite URL to create a local account or sign in. Browser requests include the session cookie and automatically send the readable CSRF cookie as `X-CSRF-Token` on mutations. Use matching `127.0.0.1` hostnames for frontend and backend during local development.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

The client uses the shared `src/data/http.ts` transport and strict adapters in `authApi.ts` and `measurementsApi.ts`. The old synthetic profile adapter remains only for isolated legacy/demo paths and is not used by the actual-user workflows. The active application does not seed synthetic measurements into accounts.

## Limits

Account recovery/email verification are unavailable and registration is disabled when the backend runs with `ASTROORBITX_APP_ENVIRONMENT=production`. Do not expose the local service publicly. Retention, account deletion, backup expiry, privacy notice, deployment encryption, and formal security review remain release gates. This is not a clinically validated product or NASA-endorsed service.
