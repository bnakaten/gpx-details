/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { isStravaConfigured, getStravaAuthUrl, exchangeCodeForToken, setStravaCredentials, getStravaEnvRedirectUri } from './strava';
import { signToken } from './jwt';
import { upsertUser, deleteUser } from './db';
import { authMiddleware } from './middleware';

const stateStore = new Map<string, { state: string; expiresAt: number }>();

const STATE_TTL = 10 * 60 * 1000;

function cleanStateStore() {
  const now = Date.now();
  for (const [key, entry] of stateStore) {
    if (entry.expiresAt < now) stateStore.delete(key);
  }
}

function storeState(state: string) {
  cleanStateStore();
  const key = crypto.randomBytes(8).toString('hex');
  stateStore.set(key, { state, expiresAt: Date.now() + STATE_TTL });
  return key;
}

function verifyState(key: string, state: string): boolean {
  const entry = stateStore.get(key);
  if (!entry) return false;
  stateStore.delete(key);
  return entry.state === state;
}

export function createAuthRouter(): Router {
  const router = Router();

  router.get('/login', (req: Request, res: Response) => {
    if (!isStravaConfigured()) {
      return res.status(500).json({ error: 'Strava is not configured.' });
    }
    const state = crypto.randomBytes(16).toString('hex');
    const key = storeState(state);
    const envRedirect = process.env.STRAVA_REDIRECT_URI || '';
    const redirectUri = envRedirect || getStravaEnvRedirectUri() || `${req.protocol}://${req.get('host')}/api/auth/strava/callback`;
    const url = getStravaAuthUrl(state, key, redirectUri);
    res.json({ url });
  });

  router.get('/status', (_req: Request, res: Response) => {
    return res.json({ configured: isStravaConfigured() });
  });

  router.post('/strava-config', async (req: Request, res: Response) => {
    const { clientId, clientSecret, redirectUri } = req.body;
    if (!isStravaConfigured() && (!clientId || !clientSecret)) {
      return res.status(400).json({ error: 'Client ID and Client Secret are required.' });
    }
    try {
      await setStravaCredentials(clientId, clientSecret, redirectUri);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error saving configuration.' });
    }
  });

  router.get('/strava/callback', async (req: Request, res: Response) => {
    const { code, state, sk } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).send('Missing OAuth code.');
    }

    if (!state || typeof state !== 'string' || !sk || typeof sk !== 'string' || !verifyState(sk, state)) {
      return res.status(403).send('Invalid state parameter.');
    }

    try {
      const tokenData = await exchangeCodeForToken(code);

      const user = await upsertUser(
        tokenData.athlete.id,
        tokenData.athlete.firstname,
        tokenData.athlete.lastname,
        tokenData.access_token,
        tokenData.refresh_token,
        tokenData.expires_at
      );

      const jwtToken = signToken({
        userId: user.id,
        stravaAthleteId: user.strava_athlete_id,
      });

      res.cookie('token', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.redirect('/');
    } catch (err: any) {
      console.error('Strava callback error:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      return res.redirect(`/?loginError=${encodeURIComponent(errorMsg)}`);
    }
  });

  router.get('/me', authMiddleware, (req: Request, res: Response) => {
    return res.json({
      authenticated: true,
      user: req.user,
    });
  });

  router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie('token');
    return res.json({ success: true });
  });

  router.post('/delete-account', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      const { getStravaConfig } = await import('./db');
      const config = await getStravaConfig();
      const clientId = config?.client_id || process.env.STRAVA_CLIENT_ID;
      const clientSecret = config?.client_secret || process.env.STRAVA_CLIENT_SECRET;

      const { findUserById } = await import('./db');
      const userRow = await findUserById(user.userId);

      if (userRow && clientId && clientSecret) {
        try {
          await fetch('https://www.strava.com/oauth/deauthorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: clientId,
              client_secret: clientSecret,
              access_token: userRow.access_token,
            }),
          });
        } catch {}
      }

      await deleteUser(user.userId);

      res.clearCookie('token');
      return res.json({ success: true });
    } catch (err: any) {
      console.error('Delete account error:', err);
      return res.status(500).json({ error: err.message || 'Error deleting account.' });
    }
  });

  return router;
}
