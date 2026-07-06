/**
 * @license
 * SPDX-License-Identifier: GPL-3.0-only
 */

import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { AnalysisResponse, AnalysisSettings, GPXPoint, GPXStop } from '../types';
import { DEMO_GPX_XML } from '../demoGPX';
import { UploadForm } from '../components/UploadForm';
import { StatsDashboard } from '../components/StatsDashboard';
import { MapContainer } from '../components/MapContainer';
import { StopList } from '../components/StopList';
import { ElevationProfile } from '../components/ElevationProfile';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Sparkles, FileSpreadsheet } from 'lucide-react';

export default function HomePage() {
  const [points, setPoints] = useState<GPXPoint[]>([]);
  const [rawPoints, setRawPoints] = useState<GPXPoint[] | undefined>(undefined);
  const [stops, setStops] = useState<GPXStop[]>([]);
  const [selectedStop, setSelectedStop] = useState<GPXStop | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [filename, setFilename] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [elevationZoom, setElevationZoom] = useState<{ minDist: number; maxDist: number } | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<GPXPoint | null>(null);
  const [mapHoveredPoint, setMapHoveredPoint] = useState<GPXPoint | null>(null);
  const [demoFile, setDemoFile] = useState<{ name: string; content: string } | null>(null);
  const [analysisVersion, setAnalysisVersion] = useState(0);

  const handleAnalyze = async (content: string, name: string, settings: AnalysisSettings) => {
    setIsLoading(true);
    setError(null);
    setSelectedStop(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          settings,
        }),
      });

      if (!response.ok) {
        const errDetail = await response.json().catch(() => ({}));
        throw new Error(errDetail.error || `Network error (${response.status})`);
      }

      const result: AnalysisResponse = await response.json();

      if (result.success) {
        setPoints(result.points);
        setRawPoints(result.rawPoints);
        setStops(result.stops);
        setSummary(result.summary);
        setFilename(name);
        setAnalysisVersion(v => v + 1);
      } else {
        throw new Error(result.error || 'Unknown error during analysis.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Connection to analysis server failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadDemo = () => {
    setDemoFile({ name: 'Tim-Tom.gpx', content: DEMO_GPX_XML });
  };

  return (
    <>
      {points.length === 0 && (
        <div className="col-span-full bg-white border border-[#E5E7EB] rounded-lg p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-center md:text-left">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-extrabold tracking-wider text-blue-700 bg-blue-50 uppercase border border-blue-100">
              Welcome to GPX Analyzer
            </span>
            <h2 className="text-lg md:text-xl font-bold text-[#111827] tracking-tight">
              Analyze stop times from recorded GPX routes
            </h2>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              This app can generate accurate routes along drivable roads from simple GPX files using Google Roads' "Snap to Roads" service. In addition, it analyzes key metrics such as distance, elevation gain, speed, and pause times.

              Thanks to its integration with Strava, stop times and interruptions can be examined in even greater detail.

              The app originally started as a side project to better understand and analyze the movement patterns and riding behavior of Three Peaks riders.
            </p>
            <div className="pt-1">
              <a
                href="https://cycling-breaks.onrender.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-[#2563EB] hover:underline"
              >
                <ExternalLink size={12} />
                cycling-breaks.onrender.com
              </a>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
              <span className="text-[10px] bg-slate-50 text-[#6B7280] px-2 py-0.5 rounded border border-[#E5E7EB]">
                Adjustable minimum duration
              </span>
              <span className="text-[10px] bg-slate-50 text-[#6B7280] px-2 py-0.5 rounded border border-[#E5E7EB]">
                Selectable maximum radius
              </span>
              <span className="text-[10px] bg-slate-50 text-[#6B7280] px-2 py-0.5 rounded border border-[#E5E7EB]">
                Interactive map sections
              </span>
              <span className="text-[10px] bg-slate-50 text-[#6B7280] px-2 py-0.5 rounded border border-[#E5E7EB]">
                Hybrid calculation
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 min-w-[200px] w-full md:w-auto">
            <button
              onClick={handleLoadDemo}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#2563EB] hover:bg-blue-700 text-white rounded font-semibold text-xs transition duration-150 tracking-wide text-center flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles size={14} />
              Load demo data
            </button>
            <p className="text-[10px] text-[#6B7280] text-center">
              Try it directly with our historic round trip.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 h-full">
          <UploadForm
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
            error={error}
            demoFile={demoFile}
            expandOptions={analysisVersion}
          />
        </div>

        <div className="lg:col-span-8 space-y-6 flex flex-col h-full">
          {points.length > 0 && summary && (
            <div className="animate-fade-in-down">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2 text-slate-500">
                  <FileSpreadsheet size={15} />
                  <span className="text-xs font-semibold text-slate-500">
                    Results for: <strong className="text-slate-800 font-bold">{filename}</strong>
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm">
                  ● Analysis completed
                </span>
              </div>
              <StatsDashboard summary={summary} stops={stops} />
            </div>
          )}

          <div className="h-[450px] md:h-[500px] w-full min-h-[300px] shrink-0">
            <ErrorBoundary>
              <MapContainer
                points={points}
                rawPoints={rawPoints}
                stops={stops}
                selectedStop={selectedStop}
                onStopSelect={setSelectedStop}
                elevationZoomBounds={elevationZoom}
                hoveredPoint={hoveredPoint}
                onTrackHover={setMapHoveredPoint}
              />
            </ErrorBoundary>
          </div>

          {points.length > 0 && (
            <ElevationProfile points={points} totalDistanceMeters={summary?.totalDistanceMeters ?? 0} onZoomChange={setElevationZoom} onHoverChange={setHoveredPoint} highlightPoint={mapHoveredPoint} />
          )}

          {points.length > 0 && (
            <div className="grow">
              <StopList
                points={points}
                stops={stops}
                selectedStop={selectedStop}
                onStopSelect={setSelectedStop}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
