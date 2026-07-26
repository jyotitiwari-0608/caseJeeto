# CaseJeeto web

React and TypeScript frontend for the CaseJeeto legal marketplace.

## Commands

```bash
npm run dev
npm run test
npm run typecheck
npm run lint
npm run build
```

The browser uses `VITE_API_URL` when configured. Vite development defaults to `http://localhost:5000/api`; production builds default to the same-origin `/api` path and never embed localhost. Demo lawyer fallback is enabled only during Vite development or when `VITE_ENABLE_DEMO_DATA=true`, and only for network/timeout failures.

## Current backend dependencies

- Login and registration return access and refresh tokens in the response body. Both are stored together because the backend does not currently issue an HttpOnly refresh cookie; do not treat local storage as protection from injected scripts.
- Authenticated HTTP 401 responses use a single-flight refresh request, persist both rotated tokens, and retry the failed request once. A failed refresh clears auth and account-scoped React Query data.
- Logout clears local state immediately and also calls `POST /api/auth/logout` with the active refresh token so the server can revoke that device session. Local sign-out still completes if the API is unavailable.
- The backend refresh-token array contract and `/api/lawyers/me` route order are fixed in the current server. The onboarding page still behaves as initial setup because this frontend does not yet hydrate the existing self profile before editing.
- Live consultation availability, booking creation, chat, reviews, and refund controls are not represented as completed features.
