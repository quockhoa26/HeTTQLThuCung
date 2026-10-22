import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  logger.error('Xảy ra lỗi trong hệ thống:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errorDetails = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      success: false,
      message: 'Dữ liệu đầu vào không hợp lệ',
      errors: errorDetails,
    });
    return;
  }

  // Handle PostgreSQL specific errors
  if (err.code) {
    if (err.code === '23505') {
      // Unique violation
      res.status(409).json({
        success: false,
        message: 'Dữ liệu đã tồn tại trong hệ thống (vi phạm ràng buộc duy nhất). Vui lòng kiểm tra lại.',
        detail: err.detail,
      });
      return;
    }
    if (err.code === '23503') {
      // Foreign key violation
      res.status(400).json({
        success: false,
        message: 'Dữ liệu liên quan không tồn tại hoặc đang được liên kết với bản ghi khác, không thể thực hiện.',
        detail: err.detail,
      });
      return;
    }
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.';

  res.status(statusCode).json({
    success: false,
    message,
  });
}
