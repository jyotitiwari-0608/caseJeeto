// Requires: npm install multer
const multer = require('multer');

// Memory storage, not disk storage: the file buffer goes straight to the
// cloud storage adapter (see services/storage/cloudinaryStorage.js)
// without ever touching this server's filesystem. This matters
// specifically for hosts like Render/Railway where local disk writes
// don't persist across deploys/restarts anyway.
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB — plenty for a scanned document/photo

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    // Passing an Error here (rather than throwing) is how multer expects
    // rejection to be signaled — it surfaces as err.code === 'LIMIT_UNEXPECTED_FILE'
    // or a generic error caught by errorHandler.js.
    return cb(new Error('Only JPEG, PNG, WEBP images or PDF files are allowed.'));
  }
  return cb(null, true);
}

// Usage in a route:
//   router.post('/', verifyToken, upload.single('file'), uploadController.uploadFile)
// req.file will then contain { buffer, mimetype, originalname, size, ... }
module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});