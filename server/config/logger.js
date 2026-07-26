// Requires: npm install morgan
const morgan = require('morgan');

// 'dev' format is colored/concise, meant for a local terminal you're
// watching live. 'combined' is the standard Apache-style log line, better
// suited to a deployed environment's log aggregator (Render/Railway logs,
// or anything you pipe into a log service later).
//
// Skipped entirely in test env so test output isn't cluttered with every
// request line.
module.exports = () => {
  if (process.env.NODE_ENV === 'test') {
    return (req, res, next) => next(); // no-op middleware
  }
  const format = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
  return morgan(format);
};