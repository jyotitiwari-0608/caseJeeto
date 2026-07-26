const mongoose = require('mongoose');

// Factory, not a middleware itself — call it with the param name to check:
//   router.get('/:id', validateObjectId('id'), controller.getBookingById)
//   router.post('/:lawyerId/x', validateObjectId('lawyerId'), controller.x)
//
// Catches malformed IDs (wrong length, bad characters, someone passing
// "undefined" as a literal string from a broken frontend call) before they
// reach a Mongoose query and surface as a less readable CastError further
// down in errorHandler.js.
module.exports = (paramName) => (req, res, next) => {
  const value = req.params[paramName];

  if (!mongoose.Types.ObjectId.isValid(value)) {
    return res.status(400).json({ message: `'${value}' is not a valid ${paramName}.` });
  }

  return next();
};