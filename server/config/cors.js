// CLIENT_URLS in .env should be a comma-separated list, e.g.:
//   CLIENT_URLS=http://localhost:3000,https://caseleeto.vercel.app
// Using an explicit whitelist instead of origin: '*' matters here
// specifically because cookies/credentials (your refresh token flow, if
// you move it to an httpOnly cookie later) cannot be sent cross-origin
// with a wildcard origin — the browser blocks it outright.

const whitelist = (process.env.CLIENT_URLS || '').split(',').map((s) => s.trim()).filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // origin is undefined for non-browser requests (curl, Postman,
    // server-to-server) — allow those through since there's no browser
    // same-origin policy to enforce for them anyway.
    if (!origin || whitelist.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin '${origin}' is not allowed by CORS.`));
  },
  credentials: true,
};

module.exports = corsOptions;