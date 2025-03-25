/**
 * Middleware for collecting HTTP request metrics
 */

const metrics = require('../utils/metrics');

const metricsMiddleware = (req, res, next) => {
  // Record request start time
  const start = Date.now();

  // Increment request counter
  metrics.incrementHttpRequests();

  // Intercept 'end' method to capture when the request completes
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    // Restore original method
    res.end = originalEnd;

    // Calculate duration
    const duration = Date.now() - start;

    // Record response duration
    metrics.recordHttpResponseTime(duration);

    // Record HTTP status code
    metrics.incrementHttpStatusCode(res.statusCode);

    // If there was an error, increment error counter
    if (res.statusCode >= 400) {
      metrics.incrementHttpErrors();
    }

    // Call original method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = metricsMiddleware; 