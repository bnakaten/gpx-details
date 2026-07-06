/**
 * @license
 * SPDX-License-Identifier: GPL-3.0-only
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gpx-details-dev-secret-change-in-production';

export interface JwtPayload {
  userId: number;
  stravaAthleteId: number;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
