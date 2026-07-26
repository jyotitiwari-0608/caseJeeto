const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware'); // already a configured multer instance
const uploadController = require('../controllers/uploadController');

// POST /api/uploads?purpose=<type>
// multipart/form-data, field name: 'file'
router.post('/', verifyToken, upload.single('file'), uploadController.uploadFile);

module.exports = router;


// const express = require('express');
// const router = express.Router();
// const multer = require('multer');
// const { verifyToken } = require('../middleware/auth.middleware');
// const uploadOptions = require('../middleware/upload.middleware');
// const uploadController = require('../controllers/uploadController');

// const upload = multer(uploadOptions);

// // POST /api/uploads?purpose=<type>
// // multipart/form-data, field name: 'file'
// router.post('/', verifyToken, upload.single('file'), uploadController.uploadFile);

// module.exports = router;