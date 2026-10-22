import { Request, Response, NextFunction } from 'express';
import { verifyToken, UserPayload } from '../utils/jwt.js';

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Vui lòng đăng nhập để thực hiện thao tác này (Token không hợp lệ hoặc thiếu)',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({
      success: false,
      message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.',
    });
    return;
  }

  req.user = decoded;
  next();
}
