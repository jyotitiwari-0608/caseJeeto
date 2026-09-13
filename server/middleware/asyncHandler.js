// module.exports = (fn) => (req, res, next) => {
//   Promise.resolve(fn(req, res, next)).catch(next);
// };
module.exports = (fn) => {

  return (req, res, next) => {

      const result = fn(req, res, next);

      Promise.resolve(result)
          .catch(next);
  };

};