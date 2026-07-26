// Requires: npm install express mongoose helmet cors morgan dotenv socket.io axios
require('dotenv').config();

const http = require('http');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const corsOptions = require('./config/cors');
const requestLogger = require('./config/logger');
const notFoundHandler = require('./middleware/notFoundHandler.middleware');
const errorHandler = require('./middleware/errorHandler.middleware');
const socketAuthMiddleware = require('./middleware/socketAuth.middleware');

const app = express();

// --- Security & logging ---
app.use(helmet());
app.use(cors(corsOptions));
app.use(requestLogger());

// --- Webhook raw-body exception ---
// MUST be mounted BEFORE express.json() and only for this exact path —
// the signature in paymentController.handleWebhook is computed over the
// raw request bytes, which express.json() would otherwise consume.
const { handleWebhook } = require('./controllers/paymentController');
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// --- Standard JSON body parsing for every other route ---
app.use(express.json());

// --- Public / auth ---
app.use('/api/auth', require('./routes/auth.routes'));

// --- Client-facing ---
app.use('/api/clients', require('./routes/client.routes'));
app.use('/api/bookings', require('./routes/booking.routes'));
app.use('/api/bookings', require('./routes/consultation.routes')); // GET /:id/video-token
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/conversations', require('./routes/message.routes'));
app.use('/api/reviews', require('./routes/review.routes'));
app.use('/api/refunds', require('./routes/refund.routes'));

// --- Lawyer-facing ---
// LawyerSelf.routes (GET/PATCH /me) mounted BEFORE publicLawyer.routes
// (GET /:id) on the same prefix — see bug #6 fix.
app.use('/api/lawyers', require('./routes/LawyerSelf.routes'));
app.use('/api/lawyers', require('./routes/publicLawyer.routes'));

app.use('/api/lawyers/me/verification', require('./routes/lawyerVerification.routes'));
app.use('/api/lawyers/me/availability', require('./routes/lawyerAvailability.routes'));
app.use('/api/lawyers/me/bookings', require('./routes/lawyerBooking.routes'));
app.use('/api/lawyers/me/bookings', require('./routes/consultation.routes')); // GET /:id/video-token
app.use('/api/lawyers/me', require('./routes/payout.routes'));
app.use('/api/lawyers/me/reviews', require('./routes/lawyerReview.routes'));
app.use('/api/lawyers/me/conversations', require('./routes/lawyerMessage.routes'));
app.use('/api/lawyers/me/dashboard', require('./routes/dasboard.routes'));

// --- Admin-facing ---
app.use('/api/admin/verification', require('./routes/admin/adminVerificationRoutes'));
app.use('/api/admin/refunds', require('./routes/admin/adminRefund'));

// --- Shared ---
app.use('/api/uploads', require('./routes/uploadRoutes'));

// --- Fallbacks ---
app.use(notFoundHandler);
app.use(errorHandler);

// --- HTTP server + Socket.IO ---
// Wrapping app in http.createServer explicitly (rather than app.listen
// directly) is required so Socket.IO can attach to the same underlying
// server instead of spinning up a second one on a second port.
const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions,
});

io.use(socketAuthMiddleware);
require('./sockets')(io);

// --- DB connection + server start ---
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    server.listen(PORT, () => console.log(`CaseLeeto server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;

// // Requires: npm install express mongoose helmet cors morgan dotenv
// require('dotenv').config();

// const express = require('express');
// const helmet = require('helmet');
// const cors = require('cors');
// const mongoose = require('mongoose');

// const corsOptions = require('./config/cors');
// const requestLogger = require('./config/logger');
// const notFoundHandler = require('./middleware/notFoundHandler.middleware');
// const errorHandler = require('./middleware/errorHandler.middleware');

// const app = express();

// // --- Security & logging (order matters: these go before everything else) ---
// app.use(helmet());
// app.use(cors(corsOptions));
// app.use(requestLogger());

// // --- Webhook raw-body exception ---
// // Must mount BEFORE express.json(), once the webhook handler exists:
// //   app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// // --- Standard JSON body parsing for every other route ---
// app.use(express.json());

// // --- Public / auth ---
// app.use('/api/auth', require('./routes/auth.routes'));

// // --- Client-facing ---
// app.use('/api/clients', require('./routes/client.routes'));
// app.use('/api/bookings', require('./routes/booking.routes'));
// app.use('/api/payments', require('./routes/payment.routes'));

// // --- Lawyer-facing ---
// // CHANGED: LawyerSelf.routes (GET/PATCH /me, /me/visibility) is now
// // mounted BEFORE publicLawyer.routes (GET /, GET /:id) on the same
// // '/api/lawyers' prefix. Express matches route layers in registration
// // order — with public routes first, GET /api/lawyers/me was matching
// // public's GET /:id (id="me") and never reaching the real handler.
// app.use('/api/lawyers', require('./routes/LawyerSelf.routes'));
// app.use('/api/lawyers', require('./routes/publicLawyer.routes'));

// app.use('/api/lawyers/me/verification', require('./routes/lawyerVerification.routes'));
// app.use('/api/lawyers/me/availability', require('./routes/lawyerAvailability.routes'));
// app.use('/api/lawyers/me/bookings', require('./routes/lawyerBooking.routes'));
// app.use('/api/lawyers/me', require('./routes/payout.routes'));
// app.use('/api/lawyers/me/reviews', require('./routes/lawyerReview.routes'));
// app.use('/api/lawyers/me/conversations', require('./routes/lawyerMessage.routes'));
// app.use('/api/lawyers/me/dashboard', require('./routes/dasboard.routes'));

// // --- Admin-facing ---
// app.use('/api/admin/verification', require('./routes/admin/adminVerificationRoutes'));
// app.use('/api/admin/refunds', require('./routes/admin/adminRefund'));

// // --- Shared ---
// app.use('/api/uploads', require('./routes/uploadRoutes'));

// // --- Fallbacks (order matters: notFound before errorHandler, both LAST) ---
// app.use(notFoundHandler);
// app.use(errorHandler);

// // --- DB connection + server start ---
// const PORT = process.env.PORT || 5000;

// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => {
//     app.listen(PORT, () => console.log(`CaseLeeto server running on port ${PORT}`));
//   })
//   .catch((err) => {
//     console.error('MongoDB connection failed:', err.message);
//     process.exit(1);
//   });

// module.exports = app;

// // // Requires: npm install express mongoose helmet cors morgan dotenv
// // require('dotenv').config();

// // const express = require('express');
// // const helmet = require('helmet');
// // const cors = require('cors');
// // const mongoose = require('mongoose');

// // const corsOptions = require('./config/cors');
// // const requestLogger = require('./config/logger');
// // const notFoundHandler = require('./middleware/notFoundHandler');
// // const errorHandler = require('./middleware/errorHandler');

// // const app = express();

// // // --- Security & logging (order matters: these go before everything else) ---
// // app.use(helmet()); // sets a batch of protective response headers (X-Frame-Options, etc.)
// // app.use(cors(corsOptions));
// // app.use(requestLogger());

// // // --- Webhook raw-body exception ---
// // // This MUST be mounted BEFORE express.json() below, and only for this
// // // exact path. Razorpay's webhook signature is computed over the raw
// // // request bytes — if express.json() parses the body into a JS object
// // // first, the raw bytes are gone and signature verification will always
// // // fail. Once the Phase 9 webhook handler exists, require it here:
// // //
// // //   const { handleWebhook } = require('./controllers/paymentController');
// // //   app.post(
// // //     '/api/payments/webhook',
// // //     express.raw({ type: 'application/json' }),
// // //     handleWebhook
// // //   );
// // //
// // // Placeholder left commented until that controller is built.

// // // --- Standard JSON body parsing for every other route ---
// // app.use(express.json());

// // // --- Public / auth ---
// // app.use('/api/auth', require('./routes/authRoutes'));
// // app.use('/api/lawyers', require('./routes/publicLawyerRoutes')); // GET / and GET /:id are public

// // // --- Client-facing ---
// // app.use('/api/clients', require('./routes/clientRoutes'));
// // app.use('/api/bookings', require('./routes/bookingRoutes'));
// // app.use('/api/payments', require('./routes/paymentRoutes'));

// // // --- Lawyer-facing ---
// // app.use('/api/lawyers', require('./routes/lawyerSelfRoutes'));
// // app.use('/api/lawyers/me/verification', require('./routes/lawyerVerificationRoutes'));
// // app.use('/api/lawyers/me/availability', require('./routes/lawyerAvailabilityRoutes'));
// // app.use('/api/lawyers/me/bookings', require('./routes/lawyerBookingRoutes'));
// // app.use('/api/lawyers/me', require('./routes/payoutRoutes'));
// // app.use('/api/lawyers/me/reviews', require('./routes/lawyerReviewRoutes'));
// // app.use('/api/lawyers/me/conversations', require('./routes/lawyerMessageRoutes'));
// // app.use('/api/lawyers/me/dashboard', require('./routes/dashboardRoutes'));

// // // --- Admin-facing ---
// // app.use('/api/admin/verification', require('./admin/routes/adminVerificationRoutes'));
// // app.use('/api/admin/refunds', require('./admin/routes/adminRefundRoutes'));

// // // --- Shared ---
// // app.use('/api/uploads', require('./routes/uploadRoutes'));

// // // --- Fallbacks (order matters: notFound before errorHandler, both LAST) ---
// // app.use(notFoundHandler);
// // app.use(errorHandler);

// // // --- DB connection + server start ---
// // const PORT = process.env.PORT || 5000;

// // mongoose
// //   .connect(process.env.MONGO_URI)
// //   .then(() => {
// //     app.listen(PORT, () => console.log(`CaseLeeto server running on port ${PORT}`));
// //   })
// //   .catch((err) => {
// //     console.error('MongoDB connection failed:', err.message);
// //     process.exit(1);
// //   });

// // module.exports = app;

// // Requires: npm install express mongoose helmet cors morgan dotenv
// require('dotenv').config();

// const express = require('express');
// const helmet = require('helmet');
// const cors = require('cors');
// const mongoose = require('mongoose');

// const corsOptions = require('./config/cors');
// const requestLogger = require('./config/logger');
// const notFoundHandler = require('./middleware/notFoundHandler.middleware');
// const errorHandler = require('./middleware/errorHandler.middleware');

// const app = express();

// // --- Security & logging (order matters: these go before everything else) ---
// app.use(helmet());
// app.use(cors(corsOptions));
// app.use(requestLogger());

// // --- Webhook raw-body exception ---
// // Placeholder left commented until that controller is built.

// // --- Standard JSON body parsing for every other route ---
// app.use(express.json());

// // --- Public / auth ---
// app.use('/api/auth', require('./routes/auth.routes'));
// app.use('/api/lawyers', require('./routes/publicLawyer.routes')); // GET / and GET /:id are public

// // --- Client-facing ---
// app.use('/api/clients', require('./routes/client.routes'));
// app.use('/api/bookings', require('./routes/booking.routes'));
// app.use('/api/payments', require('./routes/payment.routes'));

// // --- Lawyer-facing ---
// app.use('/api/lawyers', require('./routes/LawyerSelf.routes'));
// app.use('/api/lawyers/me/verification', require('./routes/lawyerVerification.routes'));
// app.use('/api/lawyers/me/availability', require('./routes/lawyerAvailability.routes'));
// app.use('/api/lawyers/me/bookings', require('./routes/lawyerBooking.routes'));
// app.use('/api/lawyers/me', require('./routes/payout.routes'));
// app.use('/api/lawyers/me/reviews', require('./routes/lawyerReview.routes'));
// app.use('/api/lawyers/me/conversations', require('./routes/lawyerMessage.routes'));
// app.use('/api/lawyers/me/dashboard', require('./routes/dasboard.routes'));

// // --- Admin-facing ---
// app.use('/api/admin/verification', require('./routes/admin/adminVerificationRoutes'));
// app.use('/api/admin/refunds', require('./routes/admin/adminRefund'));

// // --- Shared ---
// app.use('/api/uploads', require('./routes/uploadRoutes'));

// // --- Fallbacks (order matters: notFound before errorHandler, both LAST) ---
// app.use(notFoundHandler);
// app.use(errorHandler);

// // --- DB connection + server start ---
// const PORT = process.env.PORT || 5000;

// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => {
//     app.listen(PORT, () => console.log(`CaseLeeto server running on port ${PORT}`));
//   })
//   .catch((err) => {
//     console.error('MongoDB connection failed:', err.message);
//     process.exit(1);
//   });

// module.exports = app;