import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/security';
import { User, IUser } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      tokenPayload?: TokenPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ detail: 'Authentication token missing or invalid' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    req.tokenPayload = payload;

    // Live database validation to enforce immediate session revocation upon suspension
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ detail: 'User no longer exists' });
    }

    if (!user.is_active) {
      return res.status(403).json({ detail: 'Account is suspended or deactivated' });
    }

    req.user = user;
    return next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ detail: 'Session expired, please login again' });
    }
    return res.status(401).json({ detail: 'Invalid authentication credentials' });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = verifyToken(token);
      req.tokenPayload = payload;
      const user = await User.findById(payload.sub);
      if (user && user.is_active) {
        req.user = user;
      }
    }
  } catch {
    // Ignore invalid optional tokens
  }
  return next();
}

