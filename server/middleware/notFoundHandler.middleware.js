// Mount this AFTER every real route but BEFORE errorHandler.js. Anything
// that reaches here didn't match any defined route at all (wrong method,
// wrong path, typo) — distinct from a controller's own 404s, which mean
// "the route matched but that specific record wasn't found."

module.exports = (req, res) => {
    return res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
  };