const clamp = (value, fallback, minimum, maximum) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximum, parsed));
};

class RequestLoggingService {
  constructor(logger, options = {}) {
    this.logger = logger;
    this.now = options.now || (() => Number(process.hrtime.bigint()) / 1e6);
    this.logAll = options.logAll ?? process.env.SNEUP_HTTP_REQUEST_LOGS === 'true';
    this.slowRequestMs = options.slowRequestMs
      ?? clamp(process.env.SNEUP_SLOW_REQUEST_MS, 1000, 100, 60_000);
  }

  middleware() {
    return (req, res, next) => {
      const startedAt = this.now();
      res.once('finish', () => {
        const durationMs = Math.max(0, Math.round(this.now() - startedAt));
        const metadata = {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs
        };
        if (res.statusCode >= 500) {
          this.logger.error('HTTP request failed', metadata);
        } else if (res.statusCode >= 400 || durationMs >= this.slowRequestMs) {
          this.logger.warn(res.statusCode >= 400 ? 'HTTP request rejected' : 'Slow HTTP request', metadata);
        } else if (this.logAll) {
          this.logger.info('HTTP request completed', metadata);
        }
      });
      return next();
    };
  }
}

module.exports = { RequestLoggingService };
