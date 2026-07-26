class AppError extends Error {
  constructor(message, status = 500, fields = null) {
    super(message);
    this.status = status;
    this.fields = fields;
    Error.captureStackTrace(this, AppError);
  }
}

module.exports = AppError;