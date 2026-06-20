import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ZodSchema } from 'zod';
import { Role } from '@repo/types';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: Role;
    phone?: string;
    email?: string;
    branchId?: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'shree_aai_ji_sweets_super_secret_jwt_key_12345';

// Authenticate JWT token
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user as AuthRequest['user'];
    next();
  });
};

// Require specific user roles
export const requireRole = (allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }

    next();
  };
};

// Validate request body using a Zod schema
export const validateBody = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error: any) {
      res.status(400).json({
        error: 'Validation Error',
        details: error.errors || error.message,
      });
    }
  };
};
