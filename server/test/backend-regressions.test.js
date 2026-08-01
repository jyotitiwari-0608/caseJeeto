const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const crypto = require('crypto');

process.env.JWT_ACCESS_SECRET = 'unit-test-access-secret';
process.env.JWT_REFRESH_SECRET = 'unit-test-refresh-secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'unit-test-webhook-secret';
process.env.RAZORPAY_KEY_SECRET = 'unit-test-key-secret';

test('refresh tokens signed in the same second have distinct JWT IDs', async () => {
  const bcrypt = require('bcryptjs');
  const User = require('../models/user');
  const Client = require('../models/client');
  const authController = require('../controllers/authController');
  const originals = {
    hash: bcrypt.hash,
    findOne: User.findOne,
    createUser: User.create,
    updateUser: User.updateOne,
    createClient: Client.create,
  };

  bcrypt.hash = async (value) => `hash:${value}`;
  User.findOne = async () => null;
  User.updateOne = async () => ({ modifiedCount: 1 });
  User.create = async (input) => ({
    _id: new mongoose.Types.ObjectId(),
    ...input,
    refreshTokens: [],
    save: async () => {},
  });
  Client.create = async () => ({});

  const register = async () => {
    let body;
    const res = {
      status() { return this; },
      json(value) { body = value; return value; },
    };
    await authController.register({
      body: { name: 'Test', email: 'test@example.com', phone: '9999999999', password: 'secret', role: 'client' },
      headers: { 'user-agent': 'unit-test' },
    }, res);
    return body.refreshToken;
  };

  try {
    const [first, second] = await Promise.all([register(), register()]);
    assert.notEqual(first, second);
    assert.notEqual(jwt.decode(first).jti, jwt.decode(second).jti);
  } finally {
    bcrypt.hash = originals.hash;
    User.findOne = originals.findOne;
    User.create = originals.createUser;
    User.updateOne = originals.updateUser;
    Client.create = originals.createClient;
  }
});

test('login inserts and caps refresh sessions with one atomic update', async () => {
  const bcrypt = require('bcryptjs');
  const User = require('../models/user');
  const authController = require('../controllers/authController');
  const originalFindOne = User.findOne;
  const originalUpdateOne = User.updateOne;
  const originalCompare = bcrypt.compare;
  const originalHash = bcrypt.hash;
  const existing = { tokenHash: 'old-hash', device: 'old-device', createdAt: new Date() };
  const user = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Test',
    email: 'test@example.com',
    role: 'client',
    isActive: true,
    passwordHash: 'password-hash',
    refreshTokens: [existing],
    save: async () => {},
  };
  let selectedFields;
  let atomicUpdate;
  User.findOne = () => ({
    select: async (fields) => { selectedFields = fields; return user; },
  });
  bcrypt.compare = async () => true;
  bcrypt.hash = async (value) => `hash:${value}`;
  User.updateOne = async (filter, update) => {
    atomicUpdate = update;
    const pushed = update.$push?.refreshTokens;
    if (pushed) {
      user.refreshTokens.push(...pushed.$each);
      user.refreshTokens = user.refreshTokens.slice(pushed.$slice);
    }
    return { modifiedCount: 1 };
  };

  try {
    let body;
    await authController.login(
      { body: { email: user.email, password: 'secret' }, headers: { 'user-agent': 'new-device' } },
      { status() { return this; }, json(value) { body = value; return value; } }
    );
    assert.equal(selectedFields, '+passwordHash');
    assert.equal(atomicUpdate.$push.refreshTokens.$slice, -10);
    assert.equal(user.refreshTokens.length, 2);
    assert.equal(user.refreshTokens[0], existing);
    assert.ok(body.refreshToken);
    assert.equal(
      atomicUpdate.$push.refreshTokens.$each[0].tokenHash,
      crypto.createHash('sha256').update(body.refreshToken).digest('hex')
    );
  } finally {
    User.findOne = originalFindOne;
    User.updateOne = originalUpdateOne;
    bcrypt.compare = originalCompare;
    bcrypt.hash = originalHash;
  }
});

test('refresh rotation uses session CAS and rejects concurrent replay', async () => {
  const User = require('../models/user');
  const authController = require('../controllers/authController');
  const originals = { findById: User.findById, updateOne: User.updateOne };
  const userId = new mongoose.Types.ObjectId();
  const sessionId = new mongoose.Types.ObjectId();
  const oldToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d', jwtid: 'old-jti' });
  const oldTokenHash = crypto.createHash('sha256').update(oldToken).digest('hex');
  const user = {
    _id: userId,
    role: 'client',
    isActive: true,
    refreshTokens: [{ _id: sessionId, tokenHash: oldTokenHash }],
  };
  User.findById = () => ({ select: async () => user });
  let consumed = false;
  let storedHash;
  User.updateOne = async (filter, update, options) => {
    assert.equal(filter['refreshTokens.tokenHash'], oldTokenHash);
    assert.equal(options.arrayFilters[0]['session.tokenHash'], oldTokenHash);
    if (consumed) return { modifiedCount: 0 };
    consumed = true;
    storedHash = update.$set['refreshTokens.$[session].tokenHash'];
    return { modifiedCount: 1 };
  };
  const invoke = async () => {
    let statusCode;
    let body;
    await authController.refreshToken(
      { body: { refreshToken: oldToken } },
      { status(value) { statusCode = value; return this; }, json(value) { body = value; return value; } }
    );
    return { statusCode, body };
  };

  try {
    const results = await Promise.all([invoke(), invoke()]);
    assert.deepEqual(results.map((result) => result.statusCode).sort(), [200, 401]);
    const success = results.find((result) => result.statusCode === 200);
    const replay = results.find((result) => result.statusCode === 401);
    assert.equal(storedHash, crypto.createHash('sha256').update(success.body.refreshToken).digest('hex'));
    assert.match(replay.body.message, /already used or revoked/);
  } finally {
    User.findById = originals.findById;
    User.updateOne = originals.updateOne;
  }
});

test('refresh storage distinguishes JWTs that differ only after bcrypt byte 72', async () => {
  const bcrypt = require('bcryptjs');
  const User = require('../models/user');
  const authController = require('../controllers/authController');
  const originals = { findOne: User.findOne, updateOne: User.updateOne, compare: bcrypt.compare };
  const userId = new mongoose.Types.ObjectId();
  const user = {
    _id: userId,
    name: 'Test',
    email: 'test@example.com',
    role: 'client',
    isActive: true,
    passwordHash: 'password-hash',
  };
  const issued = [];

  User.findOne = () => ({ select: async () => user });
  User.updateOne = async (filter, update) => {
    issued.push(update.$push.refreshTokens.$each[0]);
    return { modifiedCount: 1 };
  };
  bcrypt.compare = async () => true;

  const login = async () => {
    let statusCode;
    let body;
    await authController.login(
      { body: { email: user.email, password: 'secret' }, headers: {} },
      { status(value) { statusCode = value; return this; }, json(value) { body = value; return value; } }
    );
    return { statusCode, body };
  };

  try {
    const first = await login();
    const second = await login();
    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 200);
    assert.equal(first.body.refreshToken.slice(0, 72), second.body.refreshToken.slice(0, 72));
    assert.notEqual(first.body.refreshToken, second.body.refreshToken);
    assert.equal(issued[0].tokenHash, crypto.createHash('sha256').update(first.body.refreshToken).digest('hex'));
    assert.equal(issued[1].tokenHash, crypto.createHash('sha256').update(second.body.refreshToken).digest('hex'));
    assert.notEqual(issued[0].tokenHash, issued[1].tokenHash);
  } finally {
    User.findOne = originals.findOne;
    User.updateOne = originals.updateOne;
    bcrypt.compare = originals.compare;
  }
});

test('legacy bcrypt refresh sessions are rejected instead of ambiguously matched', async () => {
  const bcrypt = require('bcryptjs');
  const User = require('../models/user');
  const authController = require('../controllers/authController');
  const originals = { findById: User.findById, updateOne: User.updateOne };
  const userId = new mongoose.Types.ObjectId();
  const token = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d', jwtid: 'legacy-jti' });
  const legacyHash = await bcrypt.hash(token, 4);
  let updateCalled = false;

  User.findById = () => ({
    select: async () => ({
      _id: userId,
      role: 'client',
      isActive: true,
      refreshTokens: [{ _id: new mongoose.Types.ObjectId(), tokenHash: legacyHash }],
    }),
  });
  User.updateOne = async () => { updateCalled = true; return { modifiedCount: 1 }; };

  try {
    let statusCode;
    let body;
    await authController.refreshToken(
      { body: { refreshToken: token } },
      { status(value) { statusCode = value; return this; }, json(value) { body = value; return value; } }
    );
    assert.equal(statusCode, 401);
    assert.match(body.message, /revoked or invalid/);
    assert.equal(updateCalled, false);
  } finally {
    User.findById = originals.findById;
    User.updateOne = originals.updateOne;
  }
});

test('logout removes only the exact refresh session digest', async () => {
  const User = require('../models/user');
  const authController = require('../controllers/authController');
  const originalUpdateOne = User.updateOne;
  const userId = new mongoose.Types.ObjectId();
  const firstToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d', jwtid: 'first-session' });
  const secondToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d', jwtid: 'second-session' });
  const sessions = [firstToken, secondToken].map((token) => ({
    tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
  }));

  User.updateOne = async (filter, update) => {
    assert.equal(String(filter._id), String(userId));
    const digest = update.$pull.refreshTokens.tokenHash;
    const index = sessions.findIndex((session) => session.tokenHash === digest);
    if (index !== -1) sessions.splice(index, 1);
    return { modifiedCount: index === -1 ? 0 : 1 };
  };

  try {
    let statusCode;
    await authController.logout(
      { body: { refreshToken: firstToken } },
      { status(value) { statusCode = value; return this; }, json(value) { return value; } }
    );
    assert.equal(statusCode, 200);
    assert.deepEqual(sessions, [{
      tokenHash: crypto.createHash('sha256').update(secondToken).digest('hex'),
    }]);
  } finally {
    User.updateOne = originalUpdateOne;
  }
});

test('payment model enforces one payment lifecycle per booking', () => {
  const Payment = require('../models/payment');
  const Refund = require('../models/refund');
  const Conversation = require('../models/conversation');
  const bookingIndex = Payment.schema.indexes().find(([fields]) => fields.bookingId === 1);
  assert.ok(bookingIndex);
  assert.equal(bookingIndex[1].unique, true);
  assert.ok(Payment.schema.path('paymentStatus').enumValues.includes('creating'));
  const orderIndex = Payment.schema.indexes().find(([fields]) => fields.razorpayOrderId === 1);
  const paymentIndex = Payment.schema.indexes().find(([fields]) => fields.razorpayPaymentId === 1);
  assert.equal(orderIndex[1].unique, true);
  assert.equal(paymentIndex[1].unique, true);
  const refundIndex = Refund.schema.indexes().find(([fields]) => fields.paymentId === 1);
  const conversationIndex = Conversation.schema.indexes().find(
    ([fields]) => fields.clientId === 1 && fields.lawyerId === 1
  );
  assert.equal(refundIndex[1].unique, true);
  assert.equal(conversationIndex[1].unique, true);
});

test('payment order failures distinguish deterministic rejection from ambiguous transport loss', () => {
  const { isDeterministicProviderRejection } = require('../utils/paymentProviderError');
  assert.equal(isDeterministicProviderRejection({ statusCode: 400 }), true);
  assert.equal(isDeterministicProviderRejection({ response: { status: 422 } }), true);
  assert.equal(isDeterministicProviderRejection({ statusCode: 429 }), false);
  assert.equal(isDeterministicProviderRejection(new Error('socket reset')), false);
});

test('partial refunds use integer paise and cannot exceed either remaining balance', () => {
  const { applyRefundIncrement } = require('../utils/refundRules');
  assert.deepEqual(applyRefundIncrement({
    amount: 2500,
    currentRefunded: 0,
    consultationFee: 10000,
    requestedRefund: 5000,
  }), { cumulativeRefund: 2500, paymentCompleted: false, requestCompleted: false });
  assert.deepEqual(applyRefundIncrement({
    amount: 2500,
    currentRefunded: 2500,
    consultationFee: 10000,
    requestedRefund: 5000,
  }), { cumulativeRefund: 5000, paymentCompleted: false, requestCompleted: true });
  assert.throws(() => applyRefundIncrement({
    amount: 2500.5,
    currentRefunded: 0,
    consultationFee: 10000,
    requestedRefund: 5000,
  }), /positive integer in paise/);
  assert.throws(() => applyRefundIncrement({
    amount: 3000,
    currentRefunded: 2500,
    consultationFee: 10000,
    requestedRefund: 5000,
  }), /remaining refundable balance/);
});

test('validly signed webhook processing failures return a retryable 5xx', async () => {
  const { handleWebhook } = require('../controllers/paymentController');
  const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: {} }));
  const signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  let statusCode;
  let responseBody;
  const res = {
    status(value) { statusCode = value; return this; },
    json(value) { responseBody = value; return value; },
  };

  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    await handleWebhook({
      headers: { 'x-razorpay-signature': signature },
      body: rawBody,
    }, res);
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(statusCode, 500);
  assert.deepEqual(responseBody, { received: false, message: 'Webhook processing failed.' });
});

test('invalid client signature keeps the original order reconcilable by a late webhook', async () => {
  const Payment = require('../models/payment');
  const Booking = require('../models/booking');
  const paymentController = require('../controllers/paymentController');
  const originals = {
    paymentFindOne: Payment.findOne,
    bookingFindById: Booking.findById,
    startSession: mongoose.startSession,
  };
  const clientId = new mongoose.Types.ObjectId();
  const paymentId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();
  const payment = {
    _id: paymentId,
    clientId,
    bookingId,
    razorpayOrderId: 'order_original',
    razorpayPaymentId: null,
    paymentStatus: 'created',
    webhookVerified: false,
    processedRefundIds: [],
    save: async () => {},
  };
  const booking = {
    _id: bookingId,
    status: 'pending',
    paymentId: null,
    save: async () => {},
  };
  const query = (value) => ({
    session: async () => value,
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
  });
  Payment.findOne = () => query(payment);
  Booking.findById = () => query(booking);
  mongoose.startSession = async () => ({
    withTransaction: async (fn) => fn(),
    endSession: async () => {},
  });

  try {
    const invalidError = await new Promise((resolve) => {
      paymentController.verifyPayment(
        {
          body: { razorpayOrderId: 'order_original', razorpayPaymentId: 'pay_late', razorpaySignature: '0'.repeat(64) },
          user: { userId: clientId },
        },
        {},
        resolve
      );
    });
    assert.equal(invalidError.status, 400);
    assert.equal(payment.paymentStatus, 'created');
    assert.equal(payment.razorpayOrderId, 'order_original');

    const rawBody = Buffer.from(JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { order_id: 'order_original', id: 'pay_late' } } },
    }));
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');
    let statusCode;
    await paymentController.handleWebhook(
      { headers: { 'x-razorpay-signature': signature }, body: rawBody },
      { status(value) { statusCode = value; return this; }, json(value) { return value; } }
    );
    assert.equal(statusCode, 200);
    assert.equal(payment.paymentStatus, 'paid');
    assert.equal(payment.razorpayPaymentId, 'pay_late');
    assert.equal(booking.status, 'confirmed');
    assert.equal(String(booking.paymentId), String(paymentId));
  } finally {
    Payment.findOne = originals.paymentFindOne;
    Booking.findById = originals.bookingFindById;
    mongoose.startSession = originals.startSession;
  }
});

test('booking response keeps the lawyer user id and adds profile evidence', async () => {
  const Lawyer = require('../models/lawyer');
  const { enrichBookingsWithLawyerProfiles } = require('../utils/bookingResponse');
  const originalFind = Lawyer.find;
  const userId = new mongoose.Types.ObjectId();
  const profileId = new mongoose.Types.ObjectId();
  Lawyer.find = () => ({
    select() { return this; },
    populate() { return this; },
    lean: async () => [{
      _id: profileId,
      userId: { _id: userId, name: 'Adv. Test', email: 'lawyer@example.com' },
      specialization: ['Family Law'],
      consultationFee: 1800,
      yearsOfExperience: 8,
      courtsPracticed: ['Delhi High Court'],
      languages: ['English', 'Hindi'],
    }],
  });

  try {
    const booking = await enrichBookingsWithLawyerProfiles({
      _id: new mongoose.Types.ObjectId(),
      lawyerId: userId,
      status: 'confirmed',
    });
    assert.equal(String(booking.lawyerId._id), String(userId));
    assert.equal(String(booking.lawyerId.profileId), String(profileId));
    assert.deepEqual(booking.lawyerId.specialization, ['Family Law']);
    assert.equal(booking.lawyerId.consultationFee, 1800);
  } finally {
    Lawyer.find = originalFind;
  }
});

test('typing events require conversation participation', async () => {
  const Conversation = require('../models/conversation');
  const wireSockets = require('../sockets');
  const originalFindById = Conversation.findById;
  const clientId = new mongoose.Types.ObjectId();
  const lawyerId = new mongoose.Types.ObjectId();
  const outsiderId = new mongoose.Types.ObjectId();
  const conversationId = String(new mongoose.Types.ObjectId());
  const handlers = {};
  let emitted = false;
  const socket = {
    user: { userId: outsiderId, role: 'client' },
    on(event, handler) { handlers[event] = handler; },
    to() { emitted = true; return { emit() {} }; },
  };
  const io = { on(event, handler) { if (event === 'connection') handler(socket); } };
  Conversation.findById = () => ({ clientId, lawyerId, select: async () => ({ clientId, lawyerId }) });

  try {
    wireSockets(io);
    const joinResponse = await new Promise((resolve) => handlers.join_conversation(conversationId, resolve));
    assert.deepEqual(joinResponse, { ok: false, error: 'Not authorized for this conversation.' });
    const response = await new Promise((resolve) => {
      handlers.typing({ conversationId, isTyping: true }, resolve);
    });
    assert.deepEqual(response, { ok: false, error: 'Join this conversation before sending typing events.' });
    assert.equal(emitted, false);
  } finally {
    Conversation.findById = originalFindById;
  }
});

test('booking duration is derived from and cannot exceed the selected slot', () => {
  const { durationFromSlot } = require('../utils/bookingRules');
  const startTime = new Date(Date.now() + 60 * 60 * 1000);
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
  assert.equal(durationFromSlot({ startTime, endTime }), 30);
  assert.throws(
    () => durationFromSlot({ startTime, endTime }, 90),
    /must match the selected availability slot/
  );
});

test('booking and conversation lookup share the approved visible lawyer invariant', () => {
  const { searchableLawyerFilter } = require('../utils/lawyerAccess');
  const lawyerId = new mongoose.Types.ObjectId();
  assert.deepEqual(searchableLawyerFilter(lawyerId), {
    _id: lawyerId,
    verificationStatus: 'approved',
    isProfileVisible: true,
  });
});

test('authenticated lawyer search excludes the client blocked list', async () => {
  const Lawyer = require('../models/lawyer');
  const Client = require('../models/client');
  const publicLawyerController = require('../controllers/publicLawyerController');
  const originalAggregate = Lawyer.aggregate;
  const originalFindOne = Client.findOne;
  const blockedId = new mongoose.Types.ObjectId();
  const pipelines = [];
  Client.findOne = () => ({ select: async () => ({ blockedLawyers: [blockedId] }) });
  Lawyer.aggregate = async (pipeline) => { pipelines.push(pipeline); return []; };

  try {
    await new Promise((resolve, reject) => {
      publicLawyerController.getLawyers(
        { query: {}, user: { userId: new mongoose.Types.ObjectId(), role: 'client' } },
        { status() { return this; }, json() { resolve(); } },
        reject
      );
    });
    assert.equal(String(pipelines[0][0].$match._id.$nin[0]), String(blockedId));
  } finally {
    Lawyer.aggregate = originalAggregate;
    Client.findOne = originalFindOne;
  }
});

test('lawyer rankings only rank approved visible lawyers with stable scores', async () => {
  const Lawyer = require('../models/lawyer');
  const publicLawyerController = require('../controllers/publicLawyerController');
  const originalAggregate = Lawyer.aggregate;
  const matches = [];
  const user1 = new mongoose.Types.ObjectId();
  const user2 = new mongoose.Types.ObjectId();

  Lawyer.aggregate = async (pipeline) => {
    const first = pipeline[0];
    if (first.$match) matches.push(first.$match);
    if (pipeline.some((stage) => stage.$count)) return [{ total: 2 }];
    if (pipeline.some((stage) => stage.$group)) return [{ _id: null, min: 10, max: 500 }];
    return [
      {
        _id: new mongoose.Types.ObjectId(),
        user: { _id: user1, name: 'Adv. Meera Sethi' },
        specialization: ['Family Law'],
        yearsOfExperience: 12,
        courtsPracticed: ['Delhi High Court'],
        languages: ['English', 'Hindi'],
        consultationFee: 1800,
        rating: 4.9,
        reviewCount: 126,
        totalConsultations: 500,
        score: 92.3,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        user: { _id: user2, name: 'Adv. Kabir Anand' },
        specialization: ['Property Law'],
        yearsOfExperience: 17,
        courtsPracticed: ['District Courts'],
        languages: ['English'],
        consultationFee: 2000,
        rating: 4.7,
        reviewCount: 143,
        totalConsultations: 400,
        score: 80.1,
      },
    ];
  };

  try {
    let captured;
    await new Promise((resolve, reject) => {
      publicLawyerController.getLawyerRankings(
        { query: {} },
        { status() { return this; }, json(body) { captured = body; resolve(); } },
        reject
      );
    });
    assert.equal(captured.success, true);
    assert.equal(captured.data.rankings.length, 2);
    assert.equal(captured.data.rankings[0].rank, 1);
    assert.equal(captured.data.rankings[0].score, 92.3);
    assert.equal(captured.data.rankings[1].rank, 2);
    assert.equal(String(captured.data.rankings[0].lawyer.user._id), String(user1));
    assert.equal(captured.meta.total, 2);
    matches.forEach((match) => {
      assert.equal(match.isProfileVisible, true);
      assert.equal(match.verificationStatus, 'approved');
    });
  } finally {
    Lawyer.aggregate = originalAggregate;
  }
});

test('video tokens are rejected before the consultation join window', async () => {
  const Booking = require('../models/booking');
  const consultationController = require('../controllers/consultationController');
  const originalFindById = Booking.findById;
  const clientId = new mongoose.Types.ObjectId();
  Booking.findById = async () => ({
    _id: new mongoose.Types.ObjectId(),
    clientId,
    lawyerId: new mongoose.Types.ObjectId(),
    status: 'confirmed',
    scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
    durationMinutes: 30,
  });

  try {
    const error = await new Promise((resolve) => {
      consultationController.getVideoToken(
        { params: { id: String(new mongoose.Types.ObjectId()) }, user: { userId: clientId, role: 'client' } },
        {},
        resolve
      );
    });
    assert.equal(error.status, 403);
    assert.match(error.message, /opens 15 minutes before/);
  } finally {
    Booking.findById = originalFindById;
  }
});
