# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

CaseJeeto is a legal-services marketplace: clients discover advocates, book consultations, pay, and join video consultations; lawyers manage availability, bookings, chat, and earnings. Monorepo with two independently managed npm packages: `web/` (React + Vite client) and `server/` (Express + Socket.IO + MongoDB API).

## Before you edit

- Never modify a file just because it exists. Understand the surrounding code first and match the existing style (TypeScript in `web`, CommonJS in `server`).
- Never add comments unless asked.
- Do not commit, push, or stage unless the user explicitly asks. When committing, use concise messages with conventional prefixes (`feat:`, `fix:`, `docs:`, `test:`, `chore:`) matching the existing history.
- Never write secrets to files. `.env` files are ignored; only `.env.example` templates should be committed. Keep provider/JWT credentials server-only.
- Do not add new dependencies without checking the existing manifests first; prefer code that uses the libraries already present.

## Run the checks before finishing any task

There is no root workspace script; run each command from the owning package.

### server

```bash
cd server
npm run dev        # nodemon, development API on port 5000
npm start          # plain Node server
npm test           # node --test backend regression tests
```

### web

```bash
cd web
npm run dev        # Vite dev server on port 5173
npm test           # node --test API/session contract tests
npm run typecheck  # tsc --noEmit
npm run lint       # oxlint
npm run build      # tsc -b && vite build
```

Always run `npm test` and `npm run typecheck` (plus `npm run lint` for web) after edits. Fix failures before reporting completion.

## Architecture and conventions

- `web/src/lib/api.ts` is the single HTTP layer. It builds `API_URL` from `VITE_API_URL` (or defaults to `http://localhost:5000/api` in dev / `/api` in prod), sends bearer access tokens, and centralizes the 401 refresh-and-retry flow. Use it instead of calling `fetch` directly.
- `web/src/lib/session.ts` owns auth storage (access + refresh tokens in browser storage), rotation, and role helpers. `web/src/contexts/auth-context.tsx` wires the refresh/unauthorized handlers and exposes `useAuth`.
- Backend routes enforce roles via `server/middleware/auth.middleware.js`; socket events use `server/middleware/socketAuth.middleware.js`. Match the existing route-group layout under `server/routes/`.
- Server code is CommonJS (`require`/`module.exports`), not ESM. Web code is TypeScript ESM with `@/` alias to `web/src`.
- Provider adapters live under `server/services/` (Daily video, Cloudinary uploads, Razorpay payments).
- Socket.IO conversation events live under `server/sockets/`; the client connects with `socket.io-client`.

## Testing and verification conventions

- Backend tests: `server/test/*.test.js`, run with Node's built-in test runner. Tests set their own `JWT_*` secrets and must not depend on a live MongoDB by default.
- Frontend tests: `web/src/lib/*.test.ts`, run with `node --test --experimental-strip-types`.
- Do not treat a passing build as proof of end-to-end behavior. Many browser flows (booking to payment to video) require live credentials and a transaction-capable MongoDB replica set. README documents what is and is not certified.

## Deployment notes

- Recommended free hosting: Render or Railway for the API, Vercel or Netlify for the client, MongoDB Atlas free tier for the database, Cloudinary free tier for uploads, Razorpay test mode for payments, Daily for video.
- In production set `TRUST_PROXY` to the exact reverse-proxy hop count (Render/Railway commonly use `1`) and `CLIENT_URLS` to the real browser origins.
- The web client stores tokens in localStorage today; before a production launch move refresh tokens to HttpOnly cookies (documented in README security notes).
