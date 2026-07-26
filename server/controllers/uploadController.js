const storage = require('../services/storage/cloudinaryStorage');

// A whitelist of valid folder/purpose values, so the frontend can't send
// an arbitrary folder string and scatter uploads outside the organized
// Cloudinary structure. Mirrors the same document-type keys used in
// config/verificationDocumentTypes.js, plus a couple of non-verification
// upload purposes.
const ALLOWED_PURPOSES = [
  'governmentId',
  'pan',
  'barCouncilEnrollment',
  'barCouncilId',
  'certificateOfPractice',
  'lawDegree',
  'professionalPhoto',
  'bankVerification',
  'experienceCertificate',
];

// POST /api/uploads?purpose=pan
// Protected by verifyToken only (not requireRole) — both clients and
// lawyers may eventually need to upload something (e.g. a client
// uploading refund evidence later), so this stays role-agnostic; each
// caller decides what it's allowed to do with the returned URL.
//
// Flow: frontend picks a file -> POSTs it here first -> gets back a URL ->
// THEN calls e.g. POST /api/lawyers/me/verification/pan with that URL in
// the body. This upload endpoint never touches any Mongoose model itself
// — it only produces a URL.
exports.uploadFile = async (req, res) => {
  try {
    const { purpose } = req.query;

    if (!ALLOWED_PURPOSES.includes(purpose)) {
      return res.status(400).json({ message: `Invalid or missing purpose. Must be one of: ${ALLOWED_PURPOSES.join(', ')}` });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file was uploaded.' });
    }

    const folder = `caseleeto/${purpose}/${req.user.userId}`;
    const { url, publicId } = await storage.uploadFile(req.file.buffer, folder);

    return res.status(201).json({ url, publicId });
  } catch (err) {
    return res.status(500).json({ message: 'Could not upload file.', error: err.message });
  }
};