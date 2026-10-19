import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface TokenPayload {
  sub: string; // user id
  email: string;
  role: string;
  is_superuser?: boolean;
  department_id?: string | null;
  company_id?: string | null;
  entity_id?: string | null;
}

export function generateToken(payload: TokenPayload, expiresIn: string = config.jwtExpiresIn): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: expiresIn as any });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
}
