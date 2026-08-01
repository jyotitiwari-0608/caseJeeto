const express = require('express');
const router = express.Router();
const { attachUserIfPresent } = require('../middleware/auth.middleware');
const publicLawyerController = require('../controllers/publicLawyerController');

// Public browsing — no login required. attachUserIfPresent means a logged-in
// client gets personalized fields (isSaved/isBlocked, blocked-lawyer
// filtering) but an anonymous visitor can still load these pages.
router.get('/', attachUserIfPresent, publicLawyerController.getLawyers);
// Leaderboard route must be declared BEFORE the /:id catch-all so 'rankings'
// is never treated as a lawyer id.
router.get('/rankings', publicLawyerController.getLawyerRankings);
router.get('/:id', attachUserIfPresent, publicLawyerController.getLawyerById);

// NEW: client-facing read of a lawyer's open booking slots. Deliberately
// fully public (no attachUserIfPresent) — it returns nothing
// personalized, only slots that are open to whoever books first.
router.get('/:id/availability', publicLawyerController.getLawyerAvailability);

module.exports = router;

// // const express = require('express');
// // const router = express.Router();
// // const { verifyToken, requireRole } = require('../middleware/auth.middleware')
// // const clientController = require('../controllers/clientController');
// // const savedLawyerController = require('../controllers/savedLawyerController');
// // const blockedLawyerController = require('../controllers/blockedLawyersController');

// // // Everything here belongs to the logged-in client only.
// // router.use(verifyToken, requireRole('client'));

// // router.get('/me', clientController.getMyProfile);
// // router.patch('/me', clientController.updateMyProfile);

// // router.get('/me/saved-lawyers', savedLawyerController.getSavedLawyers);
// // router.post('/me/saved-lawyers/:lawyerId', savedLawyerController.saveLawyer);
// // router.delete('/me/saved-lawyers/:lawyerId', savedLawyerController.unsaveLawyer);

// // router.get('/me/blocked-lawyers', blockedLawyerController.getBlockedLawyers);
// // router.post('/me/blocked-lawyers/:lawyerId', blockedLawyerController.blockLawyer);
// // router.delete('/me/blocked-lawyers/:lawyerId', blockedLawyerController.unblockLawyer);

// // module.exports = router;
// // /**
// //  * const express = require('express');
// // const router = express.Router();
// // const { attachUserIfPresent } = require('../middleware/auth.middleware');
// // const publicLawyerController = require('../controllers/publicLawyerController');

// // // Public browsing — no login required. attachUserIfPresent means a logged-in
// // // client gets personalized fields (isSaved/isBlocked) but an anonymous
// // // visitor can still load these pages.
// // router.get('/', attachUserIfPresent, publicLawyerController.getLawyers);
// // router.get('/:id', attachUserIfPresent, publicLawyerController.getLawyerById);

// // module.exports = router;
// //  */


// const express = require('express');
// const router = express.Router();
// const { attachUserIfPresent } = require('../middleware/auth.middleware');
// const publicLawyerController = require('../controllers/publicLawyerController');

// router.get('/', attachUserIfPresent, publicLawyerController.getLawyers);
// router.get('/:id', attachUserIfPresent, publicLawyerController.getLawyerById);

// module.exports = router;
