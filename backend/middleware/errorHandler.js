/**
 * Global Error Handling Middleware
 * Ensures sensitive stack traces and internal paths are never exposed in production.
 */
export const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = err.status || err.statusCode || 500;

  // Log error stack internally for developer debugging
  console.error(`[ERROR] ${new Date().toISOString()} - ${req.method} ${req.url}:`, err.stack || err.message);

  const response = {
    error: isProduction && statusCode === 500
      ? 'An internal server error occurred. Please try again later.'
      : err.message || 'An unexpected error occurred.',
    status: statusCode
  };

  if (!isProduction && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
