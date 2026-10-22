import winston from 'winston';
import path from 'path';
import fs from 'fs';

const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom format to mask sensitive data
const maskSensitive = winston.format((info) => {
  const sensitiveKeys = ['password', 'password_hash', 'token', 'authorization', 'secret', 'jwt'];
  const mask = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    const cloned = Array.isArray(obj) ? [...obj] : { ...obj };
    for (const key of Object.keys(cloned)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        cloned[key] = '***REDACTED***';
      } else if (typeof cloned[key] === 'object') {
        cloned[key] = mask(cloned[key]);
      }
    }
    return cloned;
  };
  return mask(info);
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    maskSensitive(),
    winston.format.json()
  ),
  defaultMeta: { service: 'backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `[${timestamp}] [${service}] ${level}: ${message} ${metaStr}`;
        })
      ),
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'backend.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});
