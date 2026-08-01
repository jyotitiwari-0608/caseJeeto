# Deployment checklist

Free-tier target stack for CaseJeeto. Costs are zero at launch for every item below except the domain (optional).

| Layer | Recommended free host | Notes |
| --- | --- | --- |
| API (Express + Socket.IO) | Render Web Service | Free instance sleeps on idle (~50 s cold start). Railway is an alternative. |
| Database (MongoDB) | MongoDB Atlas M0 | Needs transactions, so a shared M0 cluster works; standalone local `mongod` does not. |
| Client (Vite React) | Vercel | Auto-redeploys from `main`. Netlify is an alternative. |
| File uploads | Cloudinary free tier | Used by the server's `multer`/`streamifier` upload path. |
| Payments | Razorpay test mode | Zero cost; switch to live keys for production. |
| Video | Daily free tier | Required for real consultation rooms/tokens. |
| CI | GitHub Actions | Free minutes on public repos. |

## 1. Pre-flight (local)

- [ ] `server` tests pass: `cd server && npm test`
- [ ] `web` checks pass: `npm run typecheck && npm run lint && npm test && npm run build`
- [ ] `server/.env` and `web/.env` are never committed; both exist only via `.env.example`
- [ ] Unique-index migration has been run against the target database (see README)
- [ ] Frontend/backend run together locally (two terminals, ports 5173/5000)

## 2. Backend deploy (Render)

1. Push `main` to GitHub.
2. Render → New Web Service → connect the repo.
3. Root directory: `server`; Build command `npm install`; Start command `node server.js`.
4. Add environment variables from `server/.env.example`:
   - `NODE_ENV=production`
   - `MONGO_URI` (Atlas connection string)
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (long, distinct, random)
   - `TRUST_PROXY=1`
   - `CLIENT_URLS` set to the Vercel origin (e.g. `https://casejeeto.vercel.app`)
   - `RAZORPAY_*`, `CLOUDINARY_*`, `DAILY_API_KEY` if those integrations are exercised
5. Deploy and note the service URL, e.g. `https://casejeeto-backend.onrender.com`.

## 3. Database (Atlas M0)

- [ ] Cluster created (M0 free tier)
- [ ] Database user created; connection string placed in `MONGO_URI`
- [ ] Network access allows the host (Render) and your laptop
- [ ] Replica-set capable (Atlas shared clusters are transaction-capable)

## 4. Frontend deploy (Vercel)

1. Vercel → Import GitHub repo.
2. Framework preset: Vite; Root directory: `web`.
3. Env var: `VITE_API_URL=https://casejeeto-backend.onrender.com/api`.
4. Deploy and note the URL, e.g. `https://casejeeto.vercel.app`.

## 5. Wire them together

- [ ] `CLIENT_URLS` on Render includes the exact Vercel origin.
- [ ] Live smoke test: register a client, browse lawyers, book a consultation.
- [ ] If API calls fail in production but work locally, check CORS (`CLIENT_URLS`) and `VITE_API_URL` (must include `/api`).

## 6. Post-launch hardening

- [ ] Move refresh tokens to HttpOnly, `SameSite` cookies (see README security notes).
- [ ] Replace the free Render instance with a persistent plan once traffic grows.
- [ ] Set up Razorpay live keys, Cloudinary access controls, and Daily project limits.
- [ ] Add monitoring and backups for the Atlas cluster.
