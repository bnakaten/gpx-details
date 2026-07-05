/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { analyzeGPXData } from './src/gpxAnalyzer';
import { AnalysisSettings } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set limits for large GPX files (parsed as text)
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // API Route: Analyze GPX text payload
  app.post('/api/analyze', (req, res) => {
    try {
      const { content, settings } = req.body;
      
      if (!content || typeof content !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Ungültiger Datei-Inhalt. Es wurde kein Roh-GPX-Text bereitgestellt.',
        });
      }

      const parsedSettings: AnalysisSettings = {
        minDurationMinutes: Number(settings?.minDurationMinutes ?? 5),
        maxRadiusMeters: Number(settings?.maxRadiusMeters ?? 15),
        detectionMethod: settings?.detectionMethod ?? 'hybrid',
        gpsFilterOutliers: settings?.gpsFilterOutliers ?? true,
        tolerateShortMovements: settings?.tolerateShortMovements ?? true,
        cutoffTimestampMs: settings?.cutoffTimestampMs ?? undefined,
      };

      const result = analyzeGPXData(content, parsedSettings);
      return res.json(result);
    } catch (error: any) {
      console.error('Analysis error in endpoint:', error);
      return res.status(500).json({
        success: false,
        error: `Fehler bei der Server-Berechnung: ${error.message || error}`,
      });
    }
  });

  // Vite Assets Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development middleware integrated.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
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
