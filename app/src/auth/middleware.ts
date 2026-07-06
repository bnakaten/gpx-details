/**
 * @license
 * SPDX-License-Identifier: GPL-3.0-only
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from './jwt';
import { findUserById } from './db';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { firstname: string; lastname: string };
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const payload = verifyToken(token);
    const user = await findUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }
    req.user = {
      userId: payload.userId,
      stravaAthleteId: payload.stravaAthleteId,
      firstname: user.firstname,
      lastname: user.lastname,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (token) {
    try {
      const payload = verifyToken(token);
      const user = await findUserById(payload.userId);
      if (user) {
        req.user = {
          userId: payload.userId,
          stravaAthleteId: payload.stravaAthleteId,
          firstname: user.firstname,
          lastname: user.lastname,
        };
      }
    } catch {}
  }
  next();
}
