import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export interface UserPayload {
  id: number;
  username: string;
  role: string;
  fullName: string;
  customerId?: number | null;
}

export function generateToken(payload: UserPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as any,
  });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, config.jwt.secret) as UserPayload;
  } catch (error) {
    return null;
  }
}
