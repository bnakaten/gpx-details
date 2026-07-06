/**
 * @license
 * SPDX-License-Identifier: GPL-3.0-only
 */

import React, { useState, useRef, useEffect } from 'react';
import { AnalysisSettings, DetectionMethod } from '../types';
import { Upload, FileCode, Sliders, ChevronDown, ChevronUp, AlertCircle, HelpCircle, Clock, ExternalLink, X } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { useAuth } from './AuthContext';

interface UploadFormProps {
  onAnalyze: (content: string, filename: string, settings: AnalysisSettings) => void;
  isLoading: boolean;
  error: string | null;
  demoFile?: { name: string; content: string } | null;
  expandOptions?: boolean;
}

export function UploadForm({ onAnalyze, isLoading, error, demoFile, expandOptions }: UploadFormProps) {
  const { user } = useAuth();

  // Settings State
  const [minDurationMinutes, setMinDurationMinutes] = useState<number>(5);
  const [maxRadiusMeters, setMaxRadiusMeters] = useState<number>(15);
  const [detectionMethod, setDetectionMethod] = useState<DetectionMethod>('hybrid');
  const [gpsFilterOutliers, setGpsFilterOutliers] = useState<boolean>(true);
  const [tolerateShortMovements, setTolerateShortMovements] = useState<boolean>(true);
  const [enableMapMatching, setEnableMapMatching] = useState<boolean>(true);
  const [densifyIntervalM, setDensifyIntervalM] = useState<number>(150);
  const [googleApiKey, setGoogleApiKey] = useState<string>(() => {
    try { return localStorage.getItem('gpx-google-api-key') || ''; } catch { return ''; }
  });

  // Advanced section collapses
  const [showAdvanced, setShowAdvanced] = useState<boolean>(true);
  const [showGoogleApiHelp, setShowGoogleApiHelp] = useState<boolean>(false);

  // Cutoff timestamp (fixed even when other params change)
  const [cutoffEnabled, setCutoffEnabled] = useState<boolean>(true);
  const [cutoffTime, setCutoffTime] = useState<string>('2026-07-04T12:50');
  const [savedCutoffMs, setSavedCutoffMs] = useState<number | null>(
    new Date('2026-07-04T12:50').getTime()
  );

  // File Upload States
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string; size: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Strava activity selector states
  const [stravaActivities, setStravaActivities] = useState<StravaActivity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [stravaLoading, setStravaLoading] = useState<boolean>(false);
  const [stravaError, setStravaError] = useState<string | null>(null);
  const [stravaDownloadProgress, setStravaDownloadProgress] = useState<number | null>(null);
  const [stravaDateFrom, setStravaDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [stravaDateTo, setStravaDateTo] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );

  interface StravaActivity {
    id: number;
    name: string;
    distance: number;
    start_date: string;
    type: string;
  }

  const fetchStravaActivities = (from?: string, to?: string) => {
    if (!user) return;
    setStravaLoading(true);
    setStravaError(null);
    const params = new URLSearchParams();
    if (from) params.set('after', String(Math.floor(new Date(from).getTime() / 1000)));
    if (to) params.set('before', String(Math.floor(new Date(to + 'T23:59:59').getTime() / 1000)));
    fetch(`/api/strava/activities?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Error loading.');
        return res.json();
      })
      .then((data) => setStravaActivities(data.activities || []))
      .catch((err) => setStravaError(err.message))
      .finally(() => setStravaLoading(false));
  };

  useEffect(() => {
    fetchStravaActivities(stravaDateFrom, stravaDateTo);
  }, [user]);

  const handleStravaActivityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? parseInt(e.target.value) : null;
    setSelectedActivityId(id);
    if (!id) {
      setUploadedFile(null);
      return;
    }
    const activity = stravaActivities.find((a) => a.id === id);
    const startDate = activity?.start_date || '';
    setStravaLoading(true);
    setStravaError(null);
    setStravaDownloadProgress(0);
    try {
      const url = `/api/strava/activity/${id}/gpx?startDate=${encodeURIComponent(startDate)}`;
      const response = await fetch(url);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error fetching GPX data.');
      }

      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      const reader = response.body!.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total > 0) {
          setStravaDownloadProgress(Math.round((received / total) * 100));
        }
      }

      const merged = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      const body = new TextDecoder().decode(merged);
      const data = JSON.parse(body);

      const name = activity ? `${activity.name}.gpx` : `strava_${id}.gpx`;
      setUploadedFile({ name, content: data.gpx, size: '' });
    } catch (err: any) {
      setStravaError(err.message);
    } finally {
      setStravaLoading(false);
      setStravaDownloadProgress(null);
    }
  };

  useEffect(() => {
    if (demoFile) {
      const bytes = new Blob([demoFile.content]).size;
      setUploadedFile({ name: demoFile.name, content: demoFile.content, size: formatBytes(bytes) });
    }
  }, [demoFile]);

  useEffect(() => {
    if (expandOptions) setShowAdvanced(true);
  }, [expandOptions]);

  // Convert bytes for display
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${meters.toFixed(0)} m`;
  };

  // Process file contents
  const processFile = (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.gpx') && !file.name.toLowerCase().endsWith('.xml')) {
      alert('Please only upload valid GPX files (.gpx).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setUploadedFile({
          name: file.name,
          content,
          size: formatBytes(file.size),
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) return;

    onAnalyze(uploadedFile.content, uploadedFile.name, {
      minDurationMinutes,
      maxRadiusMeters,
      detectionMethod,
      gpsFilterOutliers,
      tolerateShortMovements,
      cutoffTimestampMs: cutoffEnabled ? (savedCutoffMs ?? undefined) : undefined,
      enableMapMatching,
      googleApiKey: enableMapMatching ? googleApiKey : undefined,
      densifyIntervalM: enableMapMatching ? densifyIntervalM : undefined,
    });
  };

  const handleSaveCutoff = () => {
    if (cutoffTime) {
      setSavedCutoffMs(new Date(cutoffTime).getTime());
    } else {
      setSavedCutoffMs(null);
    }
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 flex flex-col h-full justify-between">
      <form onSubmit={handleSubmit} className="space-y-5 grow">
        <div>
          <h2 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
            <Sliders size={14} className="text-[#2563EB]" />
            Parameters &amp; File
          </h2>
          <p className="text-[11px] text-[#6B7280] mt-1.5 leading-relaxed">
            Configure thresholds and upload your GPX log for stop detection.
          </p>
        </div>

        {/* Trigger Button */}
        <div className="border-b border-[#E5E7EB] pb-4">
          <button
            onClick={handleSubmit}
            disabled={!uploadedFile || isLoading}
            className={`w-full py-2.5 px-4 rounded font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
              uploadedFile && !isLoading
                ? 'bg-[#2563EB] text-white hover:bg-blue-700'
                : 'bg-[#F9FAFB] text-slate-300 border border-[#E5E7EB] cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <span>Analyzing...</span>
            ) : (
              <span>Start Analysis</span>
            )}
          </button>
        </div>

        {/* Strava Activity Selector */}
        {user && (
          <div className="border border-[#FC4C02]/30 bg-orange-50/50 rounded-md p-3 space-y-2">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#FC4C02">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.01 13.828h4.172" />
              </svg>
              <span className="text-xs font-semibold text-[#FC4C02] uppercase tracking-wider">
                Strava Activity
              </span>
            </div>
            <div className="flex gap-1.5 items-center">
              <input
                type="date"
                value={stravaDateFrom}
                onChange={(e) => setStravaDateFrom(e.target.value)}
                className="flex-1 text-[10px] border border-[#E5E7EB] bg-white rounded px-1.5 py-1 text-[#111827] focus:outline-none focus:border-[#FC4C02]"
              />
              <span className="text-[10px] text-[#6B7280]">-</span>
              <input
                type="date"
                value={stravaDateTo}
                onChange={(e) => setStravaDateTo(e.target.value)}
                className="flex-1 text-[10px] border border-[#E5E7EB] bg-white rounded px-1.5 py-1 text-[#111827] focus:outline-none focus:border-[#FC4C02]"
              />
              <button
                type="button"
                onClick={() => fetchStravaActivities(stravaDateFrom, stravaDateTo)}
                disabled={stravaLoading}
                className="px-2 py-1 bg-[#E5E7EB] hover:bg-[#D1D5DB] text-[#374151] text-[10px] rounded font-semibold uppercase tracking-wider disabled:opacity-50 transition cursor-pointer"
              >
                Load
              </button>
            </div>
            {stravaLoading && stravaActivities.length === 0 ? (
              <p className="text-[10px] text-[#6B7280]">Loading activities...</p>
            ) : stravaError && stravaActivities.length === 0 ? (
              <p className="text-[10px] text-rose-600">{stravaError}</p>
            ) : stravaActivities.length === 0 ? (
              <p className="text-[10px] text-[#6B7280]">No activities in this time range.</p>
            ) : (
              <div>
                <select
                  value={selectedActivityId ?? ''}
                  onChange={handleStravaActivityChange}
                  disabled={stravaLoading || isLoading}
                  className="w-full text-[10px] border border-[#E5E7EB] bg-white rounded px-2 py-1.5 text-[#111827] focus:outline-none focus:border-[#FC4C02] disabled:opacity-50"
                >
                  <option value="">Select activity...</option>
                  {stravaActivities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {formatDistance(a.distance)} -- {a.name} ({new Date(a.start_date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {stravaError && stravaActivities.length > 0 && (
              <p className="text-[10px] text-rose-600">{stravaError}</p>
            )}
            {stravaDownloadProgress !== null && (
              <ProgressBar value={stravaDownloadProgress} phase="loading" />
            )}
          </div>
        )}

        {/* Drag and Drop Zone */}
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-md p-6 text-center transition duration-150 flex flex-col items-center justify-center cursor-pointer ${
            dragActive 
              ? 'border-[#2563EB] bg-[#DBEAFE]/30' 
              : uploadedFile 
                ? 'border-emerald-500 bg-emerald-50/30' 
                : 'border-[#E5E7EB] hover:border-slate-300 bg-[#F9FAFB]'
          }`}
          onClick={onButtonClick}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            className="hidden" 
            accept=".gpx,.xml" 
            onChange={handleChange}
          />
          
          {uploadedFile ? (
            <div className="space-y-2 pointer-events-none">
              <div className="w-9 h-9 rounded bg-emerald-100/60 text-emerald-700 flex items-center justify-center mx-auto">
                <FileCode size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800 truncate max-w-[200px]" title={uploadedFile.name}>
                  {uploadedFile.name}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{uploadedFile.size}</p>
              </div>
              <span className="inline-block text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold mt-1">
                    Replace
              </span>
            </div>
          ) : (
            <div className="space-y-1 my-2 pointer-events-none">
              <p className="text-xs font-semibold text-[#111827]">Drop GPX file here</p>
              <p className="text-[11px] text-[#6B7280]">or click to select</p>
            </div>
          )}
        </div>

        {/* Cutoff Timestamp */}
        <div className="space-y-2 p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
            <Clock size={12} />
            Start Timestamp
            <label className="ml-auto flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={cutoffEnabled}
                onChange={(e) => setCutoffEnabled(e.target.checked)}
                className="w-3 h-3 accent-[#2563EB] cursor-pointer"
              />
              <span className="text-[9px] font-normal normal-case tracking-normal">active</span>
            </label>
          </div>
          <p className="text-[10px] text-[#6B7280] leading-relaxed">
            Only data after this point in time minus 1 minute will be analyzed.
            {savedCutoffMs && (
              <span className="block mt-0.5 text-[#2563EB] font-semibold">
                Saved: {new Date(savedCutoffMs).toLocaleString('en-US')}
              </span>
            )}
          </p>
          <div className="flex gap-2">
              <input
                type="datetime-local"
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                disabled={!cutoffEnabled}
                className="grow text-[11px] border border-[#E5E7EB] rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB] disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={handleSaveCutoff}
                disabled={!cutoffEnabled}
                className="shrink-0 px-3 py-1.5 bg-[#2563EB] text-white rounded text-[10px] font-semibold uppercase tracking-wider hover:bg-blue-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
                            Save
            </button>
          </div>
        </div>

        {/* Configurations Fields */}
        <div className="space-y-4">
          {/* Mindestdauer (Duration Threshold) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <label htmlFor="min-duration" className="font-semibold text-[#6B7280] uppercase tracking-wider">
                        Minimum Duration
              </label>
              <span className="font-mono font-bold text-[#2563EB]">
                {minDurationMinutes}  min
              </span>
            </div>
            <input 
              id="min-duration"
              type="range" 
              min="1" 
              max="60" 
              step="1"
              value={minDurationMinutes}
              onChange={(e) => setMinDurationMinutes(parseInt(e.target.value))}
              className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-[#2563EB]"
            />
          </div>

          {/* Maximaler Bewegungsradius (Radius Threshold) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <label htmlFor="max-radius" className="font-semibold text-[#6B7280] uppercase tracking-wider">
                        Maximum Radius
              </label>
              <span className="font-mono font-bold text-[#2563EB]">
                {maxRadiusMeters} m
              </span>
            </div>
            <input 
              id="max-radius"
              type="range" 
              min="5" 
              max="50" 
              step="5"
              value={maxRadiusMeters}
              onChange={(e) => setMaxRadiusMeters(parseInt(e.target.value))}
              className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-[#2563EB]"
            />
          </div>

          {/* Method Selector */}
          <div>
            <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-2">
                        Detection Method
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded">
              {(['distance', 'speed', 'hybrid'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setDetectionMethod(method)}
                  className={`py-1 rounded text-[10px] font-semibold text-center tracking-wide transition duration-150 cursor-pointer ${
                    detectionMethod === method 
                      ? 'bg-white text-[#2563EB] border border-[#E5E7EB] font-bold' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {method === 'distance' ? 'Distance' : method === 'speed' ? 'Speed' : 'Hybrid'}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Toggles Accordion */}
          <div className="border-t border-[#E5E7EB] pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-[11px] text-[#6B7280] hover:text-slate-800 font-semibold uppercase tracking-wider cursor-pointer"
            >
              <span>Options</span>
              {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {showAdvanced && (
              <div className="mt-3.5 space-y-3 pl-0.5">
                {/* Outlier removal checkbox */}
                <label className="flex items-start gap-2 cursor-pointer text-xs group">
                  <input
                    type="checkbox"
                    checked={gpsFilterOutliers}
                    onChange={(e) => setGpsFilterOutliers(e.target.checked)}
                    className="w-3.5 h-3.5 rounded-sm bg-[#F9FAFB] border-[#E5E7EB] text-[#2563EB] focus:ring-[#2563EB] mt-0.5"
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-700">
                      Filter GPS Outliers
                    </span>
                    <p className="text-[10px] text-[#6B7280] leading-normal">
                      Eliminates sudden tracking error jumps.
                    </p>
                  </div>
                </label>

                {/* Absorption of short excursions */}
                <label className="flex items-start gap-2 cursor-pointer text-xs group">
                  <input
                    type="checkbox"
                    checked={tolerateShortMovements}
                    onChange={(e) => setTolerateShortMovements(e.target.checked)}
                    className="w-3.5 h-3.5 rounded-sm bg-[#F9FAFB] border-[#E5E7EB] text-[#2563EB] focus:ring-[#2563EB] mt-0.5"
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-700">
                      Tolerate Movements
                    </span>
                    <p className="text-[10px] text-[#6B7280] leading-normal">
                      Tolerates short-term excursions within stops.
                    </p>
                  </div>
                </label>

                {/* Map Matching */}
                <label className="flex items-start gap-2 cursor-pointer text-xs group">
                  <input
                    type="checkbox"
                    checked={enableMapMatching}
                    onChange={(e) => setEnableMapMatching(e.target.checked)}
                    className="w-3.5 h-3.5 rounded-sm bg-[#F9FAFB] border-[#E5E7EB] text-[#2563EB] focus:ring-[#2563EB] mt-0.5"
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-700">
                      Map Matching (Road Bike)
                      <button
                        type="button"
                        title="How to get a Google Roads API key"
                        onClick={(e) => { e.preventDefault(); setShowGoogleApiHelp(true); }}
                        className="ml-1 text-[#9CA3AF] hover:text-[#2563EB] transition cursor-pointer align-middle"
                      >
                        <HelpCircle size={12} />
                      </button>
                    </span>
                    <p className="text-[10px] text-[#6B7280] leading-normal">
                      Snaps GPS points to roads via Google Roads API.
                    </p>
                  </div>
                </label>
                {enableMapMatching && (
                  <div className="ml-5.5">
                    <input
                      type="password"
                      placeholder="Google Maps API Key"
                      value={googleApiKey}
                      onChange={(e) => {
                        setGoogleApiKey(e.target.value);
                        try { localStorage.setItem('gpx-google-api-key', e.target.value); } catch {}
                      }}
                      className="w-full px-2 py-1.5 text-xs bg-[#F9FAFB] border border-[#E5E7EB] rounded placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB]"
                    />
                    <label className="flex flex-col gap-1.5 text-xs mt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-700">
                          Point Densification
                        </span>
                        <span className="font-mono font-bold text-[#2563EB]">
                          {densifyIntervalM === 0 ? 'Off' : `${densifyIntervalM}m`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="1000"
                        step="50"
                        value={densifyIntervalM}
                        onChange={(e) => setDensifyIntervalM(Number(e.target.value))}
                        className="w-full accent-[#2563EB] h-1.5"
                      />
                        <p className="text-[10px] text-[#6B7280] leading-normal">
                          Control point spacing before Map Matching (50m–1km).
                        </p>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded flex items-start gap-2 text-rose-800 text-xs">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* Google Roads API Key Help Dialog */}
      {showGoogleApiHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setShowGoogleApiHelp(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#111827]">Google Roads API Key</h3>
              <button
                type="button"
                onClick={() => setShowGoogleApiHelp(false)}
                className="text-[#9CA3AF] hover:text-[#111827] transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-xs font-semibold text-[#111827] mb-2">Quick setup guide</p>
            <ol className="text-xs text-[#6B7280] space-y-2 list-decimal list-inside leading-relaxed">
              <li>Open the <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-[#2563EB] underline">Google Cloud Console</a>.</li>
              <li>Create a project or select an existing one.</li>
              <li>Go to the API Library, search for <strong>Roads API</strong>, and click <strong>Enable</strong>.</li>
              <li>Under <strong>Credentials</strong>, create an API key.</li>
            </ol>
            <p className="text-xs text-[#6B7280] mt-2 leading-relaxed">
              <strong>Security recommendation:</strong> Restrict the key in the settings (API restriction to "Roads API") to prevent unauthorized use by third parties.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
