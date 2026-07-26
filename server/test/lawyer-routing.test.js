const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_ACCESS_SECRET = 'lawyer-routing-test-secret';

function request(app, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const responseHeaders = {};
    let rawBody = '';
    const req = { method: 'GET', url: path, headers };
    const res = {
      statusCode: 200,
      setHeader(name, value) { responseHeaders[name.toLowerCase()] = value; },
      getHeader(name) { return responseHeaders[name.toLowerCase()]; },
      removeHeader(name) { delete responseHeaders[name.toLowerCase()]; },
      write(chunk) { rawBody += chunk; return true; },
      end(chunk) {
        if (chunk) rawBody += chunk;
        resolve({
          status: this.statusCode,
          body: rawBody ? JSON.parse(rawBody) : null,
        });
      },
    };

    app.handle(req, res, reject);
  });
}

test('public and self lawyer routes compose without leaking or swallowing auth', async (t) => {
  const lawyerProfileController = require('../controllers/lawyerProfileController');
  const publicLawyerController = require('../controllers/publicLawyerController');
  const originals = {
    getMyProfile: lawyerProfileController.getMyProfile,
    getLawyers: publicLawyerController.getLawyers,
    getLawyerById: publicLawyerController.getLawyerById,
  };

  lawyerProfileController.getMyProfile = (req, res) => {
    res.status(200).json({ handler: 'self', role: req.user.role });
  };
  publicLawyerController.getLawyers = (req, res) => {
    res.status(200).json({ handler: 'public-list' });
  };
  publicLawyerController.getLawyerById = (req, res) => {
    res.status(200).json({ handler: 'public-detail', id: req.params.id });
  };

  const selfRoutePath = require.resolve('../routes/LawyerSelf.routes');
  const publicRoutePath = require.resolve('../routes/publicLawyer.routes');
  delete require.cache[selfRoutePath];
  delete require.cache[publicRoutePath];

  const app = express();
  app.use('/api/lawyers', require(selfRoutePath));
  app.use('/api/lawyers', require(publicRoutePath));

  t.after(() => {
    lawyerProfileController.getMyProfile = originals.getMyProfile;
    publicLawyerController.getLawyers = originals.getLawyers;
    publicLawyerController.getLawyerById = originals.getLawyerById;
    delete require.cache[selfRoutePath];
    delete require.cache[publicRoutePath];
  });

  const publicList = await request(app, '/api/lawyers');
  assert.equal(publicList.status, 200);
  assert.equal(publicList.body.handler, 'public-list');

  const anonymousSelf = await request(app, '/api/lawyers/me');
  assert.equal(anonymousSelf.status, 401);
  assert.match(anonymousSelf.body.message, /Authentication token is required/);

  const lawyerToken = jwt.sign(
    { userId: 'lawyer-user-id', role: 'lawyer' },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '5m' }
  );
  const authenticatedSelf = await request(app, '/api/lawyers/me', {
    authorization: `Bearer ${lawyerToken}`,
  });
  assert.equal(authenticatedSelf.status, 200);
  assert.deepEqual(authenticatedSelf.body, { handler: 'self', role: 'lawyer' });

  const publicDetail = await request(app, '/api/lawyers/lawyer-profile-id');
  assert.equal(publicDetail.status, 200);
  assert.deepEqual(publicDetail.body, {
    handler: 'public-detail',
    id: 'lawyer-profile-id',
  });
});
