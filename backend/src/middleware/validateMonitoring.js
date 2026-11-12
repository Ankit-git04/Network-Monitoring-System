/**
 * Middleware to validate incoming monitoring data.
 * Requires at minimum: host, status.
 */
const validateMonitoring = (req, res, next) => {
  const { host, status } = req.body;

  const errors = [];

  if (!host || typeof host !== 'string' || host.trim() === '') {
    errors.push('host is required and must be a non-empty string');
  }

  if (!status || !['UP', 'DOWN', 'TIMEOUT'].includes(status)) {
    errors.push('status is required and must be one of: UP, DOWN, TIMEOUT');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

module.exports = validateMonitoring;
