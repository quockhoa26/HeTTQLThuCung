import { Request, Response, NextFunction } from 'express';
import { httpRequestCounter, httpRequestDuration } from '../utils/metrics.js';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationInSeconds = diff[0] + diff[1] / 1e9;
    const route = req.route ? req.baseUrl + req.route.path : req.path;
    const statusCode = res.statusCode.toString();

    // Do not record /metrics calls themselves to avoid polluting the count
    if (req.path !== '/metrics') {
      httpRequestCounter.inc({
        method: req.method,
        route,
        status_code: statusCode,
      });

      httpRequestDuration.observe(
        {
          method: req.method,
          route,
          status_code: statusCode,
        },
        durationInSeconds
      );
    }
  });

  next();
}
