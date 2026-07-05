/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AnalysisResponse, AnalysisSettings, GPXPoint, GPXStop } from './types';
import { DEMO_GPX_XML } from './demoGPX';
import { UploadForm } from './components/UploadForm';
import { StatsDashboard } from './components/StatsDashboard';
import { MapContainer } from './components/MapContainer';
import { StopList } from './components/StopList';
import { ElevationProfile } from './components/ElevationProfile';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MapPin, Info, Sparkles, AlertCircle, FileSpreadsheet, Compass } from 'lucide-react';

export default function App() {
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
        throw new Error(errDetail.error || `Netzwerk-Fehler (${response.status})`);
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
        throw new Error(result.error || 'Unbekannter Fehler bei der Analyse.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Verbindung zum Analyse-Server fehlgeschlagen.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load the Munich tour demo directly
  const handleLoadDemo = () => {
    setDemoFile({ name: 'Tim-Tom.gpx', content: DEMO_GPX_XML });
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] pb-12 flex flex-col font-sans">
      
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#E5E7EB] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-[#2563EB] flex items-center justify-center text-white">
            <Compass size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-[#111827]">GPX Analyzer</h1>
            <p className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider">
              Standzeit-Analyse & Wegpunkt-Filter
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleLoadDemo}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 bg-white border border-[#E5E7EB] hover:border-blue-300 text-[#111827] hover:text-[#2563EB] text-xs px-3 py-1.5 rounded font-semibold transition cursor-pointer disabled:opacity-50"
          >
            <Sparkles size={12} className="text-amber-500" />
            Demodaten laden
          </button>
          
          <a
            href="https://www.openstreetmap.org"
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-[#6B7230] hover:text-[#111827] font-semibold flex items-center gap-1"
          >
            <Info size={11} />
            Karten: &copy; OSM
          </a>
        </div>
      </header>

      {/* 2. Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 md:px-6 pt-6 flex-grow flex flex-col gap-6">
        
        {/* Welcome Callout if no file uploaded */}
        {points.length === 0 && (
          <div className="col-span-full bg-white border border-[#E5E7EB] rounded-lg p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            
            <div className="space-y-3 max-w-2xl text-center md:text-left">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-extrabold tracking-wider text-blue-700 bg-blue-50 uppercase border border-blue-100">
                Willkommen bei GPX Analyzer
              </span>
              <h2 className="text-lg md:text-xl font-bold text-[#111827] tracking-tight">
                Analysiere Standzeiten aus aufgezeichneten GPX-Routen
              </h2>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Diese Anwendung ermöglicht es dir, GPS-Datenpfade hochzuladen und detailliert nach 
                Standzeiten (Aufenthalten/Stopps) zu durchsuchen. Der Algorithmus rechnet GPS-Schwankungen (Jitter) raus, 
                filtert Signalausreißer und listet alle Ruhephasen tabellarisch sowie visualisiert auf einer interaktiven OSM-Karte auf.
              </p>
              
              {/* Feature Tags */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                <span className="text-[10px] bg-slate-50 text-[#6B7280] px-2 py-0.5 rounded border border-[#E5E7EB]">
                  Mindestdauer anpassbar
                </span>
                <span className="text-[10px] bg-slate-50 text-[#6B7280] px-2 py-0.5 rounded border border-[#E5E7EB]">
                  Maximaler Radius wählbar
                </span>
                <span className="text-[10px] bg-slate-50 text-[#6B7280] px-2 py-0.5 rounded border border-[#E5E7EB]">
                  Interaktive Kartenabschnitte
                </span>
                <span className="text-[10px] bg-slate-50 text-[#6B7280] px-2 py-0.5 rounded border border-[#E5E7EB]">
                  Hybride Berechnung
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
                Demodaten laden
              </button>
              <p className="text-[10px] text-[#6B7280] text-center">
                Direkt testen mit unserem historischen Rundgang.
              </p>
            </div>
          </div>
        )}

        {/* Dashboard Panels Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: File Upload & Controls */}
          <div className="lg:col-span-4 h-full">
            <UploadForm 
              onAnalyze={handleAnalyze} 
              isLoading={isLoading} 
              error={error}
              demoFile={demoFile}
              expandOptions={analysisVersion}
            />
          </div>

          {/* Right Panel: Map, Stats & Table */}
          <div className="lg:col-span-8 space-y-6 flex flex-col h-full">
            
            {/* 2.1. Statistics cards (Only show when data loaded) */}
            {points.length > 0 && summary && (
              <div className="animate-fade-in-down">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <FileSpreadsheet size={15} />
                    <span className="text-xs font-semibold text-slate-500">
                      Ergebnisse für: <strong className="text-slate-800 font-bold">{filename}</strong>
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm">
                    ● Analyse abgeschlossen
                  </span>
                </div>
                <StatsDashboard summary={summary} stops={stops} />
              </div>
            )}

            {/* 2.2. Map Container */}
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

            {/* 2.3. Elevation Profile */}
            {points.length > 0 && (
              <ElevationProfile points={points} totalDistanceMeters={summary?.totalDistanceMeters ?? 0} onZoomChange={setElevationZoom} onHoverChange={setHoveredPoint} highlightPoint={mapHoveredPoint} />
            )}

            {/* 2.4. Stop List result table (Only show when data loaded) */}
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

      </main>
    </div>
  );
}
