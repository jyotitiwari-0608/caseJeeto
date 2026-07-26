// Mount this LAST in server.js, after every route — Express recognizes an
// error-handling middleware specifically by its 4-argument signature
// (err, req, res, next). Any controller that calls next(err), or that
// throws inside an async handler wrapped to forward errors, ends up here
// instead of every controller writing its own try/catch response shape.

module.exports = (err, req, res, next) => {
    // Server-side logging always happens, regardless of what we tell the
    // client. Swap this for a real logger (pino/winston) once you have one;
    // console.error is fine for now.
    console.error(err);
  
    // Mongoose validation errors (missing required field, failed enum, bad
    // type, etc.) -> 400 with a field-by-field breakdown so the frontend can
    // highlight the specific input instead of showing one flat string.
    if (err.name === 'ValidationError') {
      const fields = Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      return res.status(400).json({ message: 'Validation failed.', fields });
    }
  
    // Malformed ObjectId passed to a Mongoose query (e.g. /api/bookings/123
    // instead of a real ObjectId) -> 400, not a raw 500.
    if (err.name === 'CastError') {
      return res.status(400).json({ message: `Invalid value for '${err.path}'.` });
    }
  
    // Duplicate key violation (unique index) -> 409, and try to name the
    // field so "email already registered" reads better than a raw Mongo
    // error dump.
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(409).json({ message: `A record with this ${field} already exists.` });
    }
  
    // JWT errors that reach here (rather than being caught inside
    // middleware/auth.js) are treated the same way for consistency.
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired authentication token.' });
    }
  
    // A controller that deliberately attached a status (see the
    // Object.assign(new Error(...), { status }) pattern in bookingController)
    // gets to choose its own code; everything else is an unexpected 500.
    const status = err.status || 500;
    const message = status === 500 ? 'Something went wrong. Please try again.' : err.message;
  
    return res.status(status).json({ message });
  };