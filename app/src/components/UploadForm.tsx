/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { AnalysisSettings, DetectionMethod } from '../types';
import { Upload, FileCode, Sliders, ChevronDown, ChevronUp, AlertCircle, HelpCircle, Clock } from 'lucide-react';

interface UploadFormProps {
  onAnalyze: (content: string, filename: string, settings: AnalysisSettings) => void;
  isLoading: boolean;
  error: string | null;
}

export function UploadForm({ onAnalyze, isLoading, error }: UploadFormProps) {
  // Settings State
  const [minDurationMinutes, setMinDurationMinutes] = useState<number>(5);
  const [maxRadiusMeters, setMaxRadiusMeters] = useState<number>(15);
  const [detectionMethod, setDetectionMethod] = useState<DetectionMethod>('hybrid');
  const [gpsFilterOutliers, setGpsFilterOutliers] = useState<boolean>(true);
  const [tolerateShortMovements, setTolerateShortMovements] = useState<boolean>(true);

  // Advanced section collapses
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Cutoff timestamp (fixed even when other params change)
  const [cutoffTime, setCutoffTime] = useState<string>('');
  const [savedCutoffMs, setSavedCutoffMs] = useState<number | null>(null);

  // File Upload States
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string; size: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert bytes for display
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Process file contents
  const processFile = (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.gpx') && !file.name.toLowerCase().endsWith('.xml')) {
      alert('Bitte lade nur gültige GPX-Dateien hoch (.gpx).');
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
      cutoffTimestampMs: savedCutoffMs ?? undefined,
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
            Parameter & Datei
          </h2>
          <p className="text-[11px] text-[#6B7280] mt-1.5 leading-relaxed">
            Konfiguriere Grenzwerte und lade dein GPX-Protokoll zur Stopp-Erkennung.
          </p>
        </div>

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
                Ersetzen
              </span>
            </div>
          ) : (
            <div className="space-y-1 my-2 pointer-events-none">
              <p className="text-xs font-semibold text-[#111827]">GPX Datei hier ablegen</p>
              <p className="text-[11px] text-[#6B7280]">oder klicken zum Auswählen</p>
            </div>
          )}
        </div>

        {/* Cutoff Timestamp */}
        <div className="space-y-2 p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
            <Clock size={12} />
            Start-Zeitstempel
          </div>
          <p className="text-[10px] text-[#6B7280] leading-relaxed">
            Nur Daten nach diesem Zeitpunkt-1 Minute werden analysiert.
            {savedCutoffMs && (
              <span className="block mt-0.5 text-[#2563EB] font-semibold">
                Gespeichert: {new Date(savedCutoffMs).toLocaleString('de-DE')}
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
              className="grow text-[11px] border border-[#E5E7EB] rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            />
            <button
              type="button"
              onClick={handleSaveCutoff}
              className="shrink-0 px-3 py-1.5 bg-[#2563EB] text-white rounded text-[10px] font-semibold uppercase tracking-wider hover:bg-blue-700 transition cursor-pointer"
            >
              Speichern
            </button>
          </div>
        </div>

        {/* Configurations Fields */}
        <div className="space-y-4">
          {/* Mindestdauer (Duration Threshold) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <label htmlFor="min-duration" className="font-semibold text-[#6B7280] uppercase tracking-wider">
                Mindestdauer
              </label>
              <span className="font-mono font-bold text-[#2563EB]">
                {minDurationMinutes} Min.
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
                Maximaler Radius
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
              Erkennungsmethode
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
                  {method === 'distance' ? 'Distanz' : method === 'speed' ? 'Tempo' : 'Hybrid'}
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
              <span>Optionen</span>
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
                      GPS-Ausreißer filtern
                    </span>
                    <p className="text-[10px] text-[#6B7280] leading-normal">
                      Eliminiert plötzliche Tracking-Fehlersprünge.
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
                      Bewegungen tolerieren
                    </span>
                    <p className="text-[10px] text-[#6B7280] leading-normal">
                      Toleriert kurzfristige Ausschläge innerhalb Stopps.
                    </p>
                  </div>
                </label>
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

      {/* Trigger Button */}
      <div className="mt-6 border-t border-[#E5E7EB] pt-4">
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
            <span>Wird analysiert...</span>
          ) : (
            <span>Analyse starten</span>
          )}
        </button>
      </div>
    </div>
  );
}
