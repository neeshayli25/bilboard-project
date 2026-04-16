const errorHandler = (err, req, res, next) => {
  // Get status code from response if already set, otherwise 500 (server error)
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Mongoose duplicate key error (code 11000) – usually for unique fields like email
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
  }

  // Mongoose validation error (e.g., required field missing, enum mismatch)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  res.status(statusCode).json({
    message,
    // Show stack trace only in development (not in production)
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

export default errorHandler;