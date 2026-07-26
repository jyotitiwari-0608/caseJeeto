# CaseJeeto

> A legal-services marketplace for discovering advocates, managing consultation bookings, and supporting the payment and video-consultation lifecycle.

CaseJeeto gives clients a structured way to compare legal professionals by practice area, court, language, experience, and fee. It gives lawyers a profile, verification, availability, booking, payment, payout, and consultation API foundation. The repository contains a React frontend and an Express/MongoDB backend; it is a development project, not a documented deployed service.

## What is implemented today

| Area | Current state |
| --- | --- |
| Public client experience | Home, searchable lawyer directory, lawyer profile, login, and registration screens are implemented. Directory results can fall back to clearly labelled sample profiles during enabled development/network-failure scenarios. |
| Client workspace | The frontend loads a client’s bookings and saved lawyers. Matter folders, messages, settings, reviews, refunds, and booking creation/payment controls are intentionally shown as unconnected or unavailable. |
| Lawyer experience | The frontend provides initial profile setup and a dashboard summary. Lawyer-side consultations, chat, earnings/payouts, availability, visibility, and settings are not connected to frontend controls yet. |
| Backend | Role-based auth, lawyer discovery and profiles, client profiles/shortlists, availability, transactional booking lifecycle, Razorpay order/verification/webhook handling, Daily video tokens, document uploads, conversations/Socket.IO, reviews, refunds, verification, payouts, and admin review routes exist. |

**Important:** the lawyer detail page does not publish slots and its booking button is disabled. The backend booking and availability endpoints can be exercised independently, but there is no complete browser booking-to-payment-to-video flow in the current frontend. Do not treat a successful build or API test as evidence of live end-to-end operation.

## Tech stack

| Layer | Technology |
| --- | --- |
| Web | React 19, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS |
| API | Node.js, Express 5, Mongoose, Socket.IO |
| Data | MongoDB; transactions protect booking, cancellation, payment reconciliation, and selected admin operations |
| Integrations | Razorpay, Daily, Cloudinary |
| Quality checks | Node’s built-in test runner, TypeScript, oxlint |

## Repository layout

```text
.
├── web/                    # Vite React client
│   └── src/pages/           # Public, client, and lawyer-facing screens
├── server/                  # Express API and Socket.IO server
│   ├── controllers/         # HTTP business logic
│   ├── models/              # Mongoose schemas and indexes
│   ├── routes/              # Role-scoped API routes
│   ├── services/            # Daily and Cloudinary adapters
│   ├── sockets/             # Authenticated conversation events
│   ├── scripts/             # Operational migrations
│   └── test/                # Backend regression tests
├── server/.env.example      # API environment-variable template
└── web/.env.example         # Browser-safe Vite-variable template
```

## Prerequisites

- A current Node.js LTS release and npm. The manifests do not pin an `engines` version.
- MongoDB configured as a **replica set**, locally or via a MongoDB deployment that supports transactions. A standalone `mongod` is not sufficient because booking, cancellation, payment, and admin paths use `session.withTransaction()`.
- Credentials for Razorpay, Daily, and Cloudinary if you will exercise the respective integration. The frontend can be explored without them, but the API cannot complete those provider-backed actions without valid credentials.

For a local replica set, use a URI such as:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017/casejeeto?replicaSet=rs0
```

Initialize and run the replica set according to your MongoDB installation before starting the API. Atlas clusters that support transactions are also suitable.

## Quick start

Install dependencies in each independently managed package:

```bash
cd server
npm ci
cd ../web
npm ci
```

Create local environment files from the committed templates. Do not commit either resulting `.env` file.

```bash
cp server/.env.example server/.env
cp web/.env.example web/.env
```

Set at least `MONGO_URI`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` in `server/.env`. Use long, distinct, randomly generated JWT secrets.

Start the API in one terminal:

```bash
cd server
npm run dev
```

Start the web app in another terminal:

```bash
cd web
npm run dev
```

The supplied local configuration points the browser at `http://localhost:5000/api`; Vite normally serves the client at `http://localhost:5173`. Keep `CLIENT_URLS=http://localhost:5173` in the API environment unless you deliberately use another frontend origin.

## Environment configuration

Start from the committed templates: [`server/.env.example`](server/.env.example) and [`web/.env.example`](web/.env.example). Values below are placeholders, not credentials. `VITE_ENABLE_DEMO_DATA` is supported by the client but is not currently included in the web template.

### API (`server/.env`)

| Variable | Purpose |
| --- | --- |
| `PORT` | Express/Socket.IO port; defaults to `5000`. |
| `NODE_ENV` | Runtime mode. In production, Mongoose auto-indexing is disabled. |
| `MONGO_URI` | Replica-set-capable MongoDB connection string. |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Separate signing keys for access and refresh tokens. |
| `CLIENT_URLS` | Comma-separated browser-origin allowlist for CORS. |
| `TRUST_PROXY` | Exact number of trusted reverse-proxy hops; leave unset for direct local traffic. |
| `INDEX_MIGRATION_WRITE_FREEZE` | Leave `false` normally; see the index-migration procedure below. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Razorpay order, signature-verification, and webhook-signature credentials. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary server-side upload credentials. |
| `DAILY_API_KEY` | Daily REST API credential for private rooms and meeting tokens. |
| `DAILY_DOMAIN` | Present in the template for deployment configuration; the current Daily adapter calls Daily’s REST API directly and does not read this variable. |

### Web (`web/.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API base URL, including `/api`; local default is `http://localhost:5000/api`. |
| `VITE_ENABLE_DEMO_DATA` | Set to `true` only when you deliberately want demo directory fallback outside Vite development. |

Only expose values prefixed with `VITE_` that are safe to embed in the browser. Never put MongoDB, JWT, Razorpay secret, Cloudinary secret, or Daily API credentials in `web/.env`.

## Demo data and availability

The directory, home-page featured list, and lawyer detail page can use bundled demo lawyer profiles when the API request fails due to a network error or timeout **and** demo fallback is enabled. It is enabled automatically in Vite development, or explicitly with `VITE_ENABLE_DEMO_DATA=true`; it is not used for HTTP errors such as `401`, `404`, or `500`. Demo notices identify these records as sample data.

Availability is not exposed by the current public frontend. The profile page therefore never reserves a slot, creates a booking, or takes payment. Use real API data and the backend endpoints for integration testing; do not infer bookability from a directory profile or demo record.

## Commands and checks

There is no root workspace script. Run commands from the package that owns them.

| Package | Command | What it checks or runs |
| --- | --- | --- |
| `server` | `npm run dev` | API with `nodemon`. |
| `server` | `npm start` | API with Node. |
| `server` | `npm test` | Backend regression tests. |
| `server` | `npm run migrate:unique-indexes` | Preflights duplicates and creates/verifies required unique indexes. |
| `web` | `npm run dev` | Vite development server. |
| `web` | `npm test` | Frontend API/session contract tests. |
| `web` | `npm run typecheck` | TypeScript check without emitting files. |
| `web` | `npm run lint` | oxlint. |
| `web` | `npm run build` | TypeScript build followed by Vite production build. |
| `web` | `npm run preview` | Serves the built client locally. |

## Database index migration safety

Run the unique-index migration before relying on the payment, refund, or conversation uniqueness guarantees, especially in a production-like database where `autoIndex` is disabled:

```bash
cd server
npm run migrate:unique-indexes
```

The script first reports duplicate groups for payment booking/order/payment IDs, refund payment IDs, and client-lawyer conversations. It exits without changing indexes when duplicates are found. Resolve those records deliberately (with a backup and an audited cleanup plan) before rerunning it; the script does **not** delete or merge duplicate data for you.

On MongoDB versions that cannot build a replacement index alongside the old one, the script refuses to drop and recreate an index while writes may occur. Only after you have actually stopped application writes should you run:

```bash
cd server
INDEX_MIGRATION_WRITE_FREEZE=true npm run migrate:unique-indexes
```

Treat the write freeze as an operational change, not a flag that makes a live system safe by itself: stop API workers and other writers, confirm the database backup and duplicate cleanup, run the migration, verify its success, then restore writes and unset the flag.

## Architecture and API overview

The client calls `/api` over HTTP, using bearer access tokens for protected routes. On an authenticated `401`, the web client makes one shared refresh request, stores rotated tokens, and retries the failed request once. The API applies role checks to client, lawyer, and admin paths. Socket.IO uses JWT authentication and verifies conversation membership before joining a room or sending a message.

```text
React/Vite client ──HTTP + bearer JWT──> Express API ──> MongoDB replica set
                                            ├──────> Razorpay
                                            ├──────> Daily
                                            ├──────> Cloudinary
                                            └──────> Socket.IO conversations
```

This is an overview, not a replacement for an OpenAPI specification. Principal route groups are:

| Route group | Examples | Intended capability |
| --- | --- | --- |
| `/api/auth` | `POST /register`, `/login`, `/refresh-token`, `/logout` | Registration and token/session lifecycle. |
| `/api/lawyers` | `GET /`, `GET /:id`, `GET/PATCH /me` | Public lawyer discovery plus lawyer profile management. |
| `/api/clients` | `GET/PATCH /me`, saved/blocked lawyer routes | Client profile and private shortlist controls. |
| `/api/lawyers/me/availability` | `POST /`, `GET /`, slot `PATCH`/`DELETE` | Lawyer-controlled, non-overlapping future availability slots. |
| `/api/bookings` | `POST /`, list/detail, cancel | Transactional client booking and cancellation. |
| `/api/payments` | order, verify, history, invoice, webhook | Razorpay-backed payment lifecycle; webhook lives at `POST /api/payments/webhook`. |
| `/api/bookings/:id/video-token` | client and lawyer variants | Time-windowed Daily room access for confirmed bookings. |
| `/api/conversations` and Socket.IO | conversations and room events | Persisted messages and authenticated real-time events. |
| `/api/reviews`, `/api/refunds`, `/api/admin/*` | reviews, refund review, verification/payment admin work | Client, lawyer, and administrator operations. |
| `/api/uploads` | `POST /?purpose=...` | Authenticated JPEG/PNG/WEBP/PDF upload to Cloudinary; 5 MB maximum. |

## Provider setup

### Razorpay

1. Create a Razorpay account and supply server-side key ID and key secret.
2. Configure an externally reachable HTTPS webhook targeting `POST /api/payments/webhook` and put its **webhook signing secret** in `RAZORPAY_WEBHOOK_SECRET`. It is separate from `RAZORPAY_KEY_SECRET`.
3. Preserve the raw request body for this exact endpoint. `server.js` mounts it before JSON parsing so the HMAC signature can be checked.
4. Configure a Razorpay Route/linked-account workflow before enabling lawyer transfers in a real environment. The data model and payment code carry linked-account/transfer fields, but this README does not certify a completed payout operation.

### Daily

Set `DAILY_API_KEY` on the server. For a confirmed booking, the API creates a private, two-participant room with screen sharing/chat enabled, creates scoped meeting tokens, and limits client video access to 15 minutes before the booking through 30 minutes after it. Test with a real Daily project before relying on consultation delivery.

### Cloudinary

Set the three Cloudinary server credentials. Uploads remain in memory, accept JPEG, PNG, WEBP, and PDF content up to 5 MB, and are written beneath a purpose/user-specific `caseleeto/...` folder. Keep the provider credentials server-only and apply Cloudinary retention/access controls appropriate for legal-document data.

## Security notes

- Helmet, a CORS origin allowlist, JWT role checks, login/payment-order rate limits, raw-body Razorpay webhook verification, and Socket.IO conversation-membership checks are present in the API.
- Set `CLIENT_URLS` to exact browser origins. Set `TRUST_PROXY` only to the known number of reverse-proxy hops; an incorrect value can undermine IP-based rate limiting.
- The current web client stores **both access and refresh tokens in `localStorage`** because the backend does not issue an HttpOnly refresh cookie. This is vulnerable to token theft if an injected script runs. Before a production launch, move refresh-token handling to secure, HttpOnly, `SameSite` cookies and maintain a strong CSP/XSS posture.
- Keep secrets only in server environment storage, rotate provider/JWT credentials on exposure, and never commit `.env` files. The templates intentionally contain names only.
- Document uploads may contain sensitive legal and identity information. Restrict provider access, audit retention/deletion policies, and validate the deployment’s TLS, logs, backups, and least-privilege roles.

## Production checklist and operational gates

Before treating the application as deployable, complete and evidence these items:

- [ ] Use a transaction-capable MongoDB replica set, backups, production credentials, and successful unique-index migration.
- [ ] Configure exact HTTPS origins, a correctly bounded `TRUST_PROXY`, secure secret storage, CORS, and a reverse proxy/TLS endpoint.
- [ ] Configure and test Razorpay orders, callback verification, signed webhook delivery, reconciliation, refunds, and Route transfers with safe test data.
- [ ] Configure and test Daily room/token access and Cloudinary document upload/access controls in the target environment.
- [ ] Replace localStorage refresh-token storage with an HttpOnly-cookie design and test login, rotation, logout, and revocation.
- [ ] Connect or explicitly defer the frontend booking/availability/payment/video/chat/review/refund/payout workflows; the current interface deliberately leaves several of these unavailable.
- [ ] Run backend and frontend tests, type checking, linting, and a production web build; then perform a real staging end-to-end pass with the integrations above.

Current code and focused tests provide useful development coverage, but this repository does not establish a deployed environment, provider entitlement, production monitoring, or live end-to-end certification.
