/**
 * @license
 * SPDX-License-Identifier: GPL-3.0-only
 */

import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { analyzeGPXData } from './src/gpxAnalyzer';
import { AnalysisSettings } from './src/types';
import { createAuthRouter } from './src/auth/routes';
import { authMiddleware, optionalAuth } from './src/auth/middleware';
import { findUserById, updateTokens } from './src/auth/db';
import { initStravaCredentials, refreshAccessToken, getAthleteActivities, getActivityStreams, buildGPXFromStreams, StravaAuthError } from './src/auth/strava';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', true);

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));
  app.use(cookieParser());

  await initStravaCredentials();

  app.use('/api/auth', createAuthRouter());

  app.post('/api/analyze', optionalAuth, async (req, res) => {
    try {
      const { content, settings } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Invalid file content. No raw GPX text was provided.',
        });
      }

      const parsedSettings: AnalysisSettings = {
        minDurationMinutes: Number(settings?.minDurationMinutes ?? 5),
        maxRadiusMeters: Number(settings?.maxRadiusMeters ?? 15),
        detectionMethod: settings?.detectionMethod ?? 'hybrid',
        gpsFilterOutliers: settings?.gpsFilterOutliers ?? true,
        tolerateShortMovements: settings?.tolerateShortMovements ?? true,
        cutoffTimestampMs: settings?.cutoffTimestampMs ?? undefined,
        enableMapMatching: settings?.enableMapMatching ?? false,
        googleApiKey: settings?.googleApiKey ?? undefined,
        densifyIntervalM: Number(settings?.densifyIntervalM ?? 0),
      };

      const result = await analyzeGPXData(content, parsedSettings);
      return res.json(result);
    } catch (error: any) {
      console.error('Analysis error in endpoint:', error);
      return res.status(500).json({
        success: false,
        error: `Server calculation error: ${error.message || error}`,
      });
    }
  });

  app.get('/api/strava/activities', authMiddleware, async (req, res) => {
    try {
      const user = await findUserById(req.user!.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found.' });
      }

      let accessToken = user.access_token;

      if (user.expires_at * 1000 < Date.now()) {
        try {
          const refreshed = await refreshAccessToken(user.refresh_token);
          accessToken = refreshed.access_token;
          await updateTokens(user.id, refreshed.access_token, refreshed.refresh_token, refreshed.expires_at);
        } catch {
          return res.status(401).json({ error: 'Strava session expired. Please log in again.' });
        }
      }

      const after = req.query.after ? parseInt(req.query.after as string) : undefined;
      const before = req.query.before ? parseInt(req.query.before as string) : undefined;
      const activities = await getAthleteActivities(accessToken, { after, before });
      return res.json({ activities });
    } catch (err: any) {
      console.error('Strava activities error:', err);
      return res.status(500).json({ error: err.message || 'Error fetching activities.' });
    }
  });

  app.get('/api/strava/activity/:id/gpx', authMiddleware, async (req, res) => {
    try {
      const activityId = parseInt(req.params.id, 10);
      if (isNaN(activityId)) {
        return res.status(400).json({ error: 'Invalid activity ID.' });
      }

      const user = await findUserById(req.user!.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found.' });
      }

      let accessToken = user.access_token;

      if (user.expires_at * 1000 < Date.now()) {
        try {
          const refreshed = await refreshAccessToken(user.refresh_token);
          accessToken = refreshed.access_token;
          await updateTokens(user.id, refreshed.access_token, refreshed.refresh_token, refreshed.expires_at);
        } catch {
          return res.status(401).json({ error: 'Strava session expired. Please log in again.' });
        }
      }

      const streams = await getActivityStreams(accessToken, activityId);

      if (!streams.latlng || !streams.time) {
        return res.status(400).json({ error: 'This activity contains no GPS data.' });
      }

      const activityName = streams.latlng ? 'Strava Activity' : '';
      const startDate = (req.query.startDate as string) || '';
      const gpx = buildGPXFromStreams(streams, activityName, startDate);

      return res.json({ gpx, activityId });
    } catch (err: any) {
      console.error('Strava GPX error:', err);
      if (err instanceof StravaAuthError) {
        return res.status(401).json({ error: 'Strava token invalid. Please log in again.' });
      }
      return res.status(500).json({ error: err.message || 'Error fetching GPX data.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development middleware integrated.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(optionalAuth, express.static(distPath));
    app.get('*', optionalAuth, (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log(`Serving static production build from: ${distPath}`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start full-stack server:', error);
});
