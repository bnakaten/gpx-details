/**
 * @license
 * SPDX-License-Identifier: GPL-3.0-only
 */

import React, { useState, useRef } from 'react';
import { AnalysisSettings, AnalysisSummary, DetectionMethod } from '../types';
import { Upload, FileCode, X, Sliders, ChevronDown, ChevronUp, ArrowLeftRight, HelpCircle } from 'lucide-react';
import { CompareResults } from './CompareResults';
import { parseDatetimeLocal } from '../utils';

interface FileSlot {
  id: number;
  filename: string;
  content: string;
  settings: AnalysisSettings;
  cutoffEnabled: boolean;
  cutoffTime: string;
  savedCutoffMs: number | null;
}

const EMPTY_SETTINGS: AnalysisSettings = {
  minDurationMinutes: 5,
  maxRadiusMeters: 15,
  detectionMethod: 'hybrid',
  gpsFilterOutliers: true,
  tolerateShortMovements: true,
  enableMapMatching: false,
  densifyIntervalM: 0,
};

const emptySlot = (id: number): FileSlot => ({
  id,
  filename: '',
  content: '',
  settings: { ...EMPTY_SETTINGS },
  cutoffEnabled: true,
  cutoffTime: '2026-07-04T12:50',
  savedCutoffMs: parseDatetimeLocal('2026-07-04T12:50'),
});

interface SettingsPanelProps {
  slot: FileSlot;
  expanded: boolean;
  onToggle: () => void;
  onUpdateSetting: (key: keyof AnalysisSettings, value: any) => void;
  onUpdateSlot: React.Dispatch<React.SetStateAction<FileSlot[]>>;
}

function SettingsPanel({ slot, expanded, onToggle, onUpdateSetting, onUpdateSlot }: SettingsPanelProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 text-[10px] text-[#6B7280] hover:text-[#111827] py-1"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Settings
      </button>
      {expanded && (
        <div className="grid grid-cols-2 gap-2 mt-1 p-2 bg-[#F9FAFB] rounded border border-[#E5E7EB]">
          <label className="text-[9px] text-[#6B7280]">
            Min dur (min)
            <input
              type="number"
              value={slot.settings.minDurationMinutes}
              onChange={(e) => onUpdateSetting('minDurationMinutes', Number(e.target.value))}
              className="w-full text-[10px] border border-[#E5E7EB] rounded px-1.5 py-0.5 mt-0.5"
            />
          </label>
          <label className="text-[9px] text-[#6B7280]">
            Max radius (m)
            <input
              type="number"
              value={slot.settings.maxRadiusMeters}
              onChange={(e) => onUpdateSetting('maxRadiusMeters', Number(e.target.value))}
              className="w-full text-[10px] border border-[#E5E7EB] rounded px-1.5 py-0.5 mt-0.5"
            />
          </label>
          <label className="text-[9px] text-[#6B7280] col-span-2">
            Method
            <select
              value={slot.settings.detectionMethod}
              onChange={(e) => onUpdateSetting('detectionMethod', e.target.value as DetectionMethod)}
              className="w-full text-[10px] border border-[#E5E7EB] rounded px-1.5 py-0.5 mt-0.5"
            >
              <option value="distance">Distance</option>
              <option value="speed">Speed</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>
          <label className="text-[9px] text-[#6B7280] flex items-center gap-1">
            <input
              type="checkbox"
              checked={slot.settings.gpsFilterOutliers}
              onChange={(e) => onUpdateSetting('gpsFilterOutliers', e.target.checked)}
            />
            Filter outliers
          </label>
          <label className="text-[9px] text-[#6B7280] flex items-center gap-1">
            <input
              type="checkbox"
              checked={slot.settings.tolerateShortMovements}
              onChange={(e) => onUpdateSetting('tolerateShortMovements', e.target.checked)}
            />
            Tolerate movements
          </label>

          {/* Cutoff timestamp */}
          <div className="col-span-2 border-t border-[#E5E7EB] pt-2 space-y-1.5">
            <label className="text-[9px] text-[#6B7280] flex items-center gap-1">
              <input
                type="checkbox"
                checked={slot.cutoffEnabled}
                onChange={(e) =>
                  onUpdateSlot((prev) =>
                    prev.map((s) =>
                      s.id === slot.id ? { ...s, cutoffEnabled: e.target.checked } : s
                    )
                  )
                }
              />
              Active cutoff
            </label>
            <div className="flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
              <input
                type="datetime-local"
                value={slot.cutoffTime}
                disabled={!slot.cutoffEnabled}
                onChange={(e) =>
                  onUpdateSlot((prev) =>
                    prev.map((s) =>
                      s.id === slot.id ? { ...s, cutoffTime: e.target.value } : s
                    )
                  )
                }
                className={`flex-1 text-[10px] border border-[#E5E7EB] rounded px-1.5 py-0.5 ${!slot.cutoffEnabled ? 'opacity-40' : ''}`}
              />
              <button
                type="button"
                disabled={!slot.cutoffEnabled}
                onClick={() =>
                  onUpdateSlot((prev) =>
                    prev.map((s) =>
                      s.id === slot.id
                        ? { ...s, savedCutoffMs: s.cutoffTime ? parseDatetimeLocal(s.cutoffTime) : null }
                        : s
                    )
                  )
                }
                className="text-[10px] px-2 py-0.5 bg-[#E5E7EB] hover:bg-[#D1D5DB] text-[#374151] rounded font-semibold disabled:opacity-40 cursor-pointer"
              >
                Save
              </button>
            </div>
            {slot.savedCutoffMs != null && (
              <p className="text-[9px] text-[#6B7280]">
                Saved: {new Date(slot.savedCutoffMs).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}




export function ComparePage() {
  const [slots, setSlots] = useState<FileSlot[]>([
    emptySlot(1),
    emptySlot(2),
  ]);
  const [results, setResults] = useState<{ filename: string; summary: AnalysisSummary }[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [enableMapMatching, setEnableMapMatching] = useState(false);
  const [googleApiKey, setGoogleApiKey] = useState<string>(() => {
    try { return localStorage.getItem('gpx-google-api-key') || ''; } catch { return ''; }
  });
  const [densifyIntervalM, setDensifyIntervalM] = useState<number>(150);
  const [elevationSmoothingRadius, setElevationSmoothingRadius] = useState<number>(200);
  const [showGoogleApiHelp, setShowGoogleApiHelp] = useState(false);
  const [expandedSlots, setExpandedSlots] = useState<Set<number>>(new Set());

  const filledSlots = slots.filter((s) => s.content);

  const handleFileDrop = (slotId: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId ? { ...s, filename: file.name, content } : s
        )
      );
    };
    reader.readAsText(file);
  };

  const handleRemove = (slotId: number) => {
    setSlots((prev) => {
      const rest = prev.filter((s) => s.id !== slotId);
      if (rest.length < 2) {
        const maxId = prev.reduce((m, s) => Math.max(m, s.id), 0);
        rest.push(emptySlot(maxId + 1));
      }
      return rest;
    });
    setResults(null);
  };

  const addSlot = () => {
    const maxId = slots.reduce((m, s) => Math.max(m, s.id), 0);
    setSlots([...slots, emptySlot(maxId + 1)]);
  };

  const updateSetting = (
    slotId: number,
    key: keyof AnalysisSettings,
    value: any
  ) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, settings: { ...s.settings, [key]: value } }
          : s
      )
    );
  };

  const handleCompare = async () => {
    if (filledSlots.length < 2) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/history/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: filledSlots.map((s) => ({
            filename: s.filename,
            content: s.content,
            settings: {
              ...s.settings,
              cutoffTimestampMs: s.cutoffEnabled ? (s.savedCutoffMs ?? undefined) : undefined,
              enableMapMatching,
              googleApiKey: enableMapMatching ? googleApiKey : undefined,
              densifyIntervalM: enableMapMatching ? densifyIntervalM : 0,
              elevationSmoothingRadius,
            },
          })),
        }),
      });

      if (!response.ok) {
        const errDetail = await response.json().catch(() => ({}));
        throw new Error(errDetail.error || `Server error (${response.status})`);
      }

      const data = await response.json();
      setResults(data.results);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Comparison failed.');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
          <ArrowLeftRight size={14} className="text-[#2563EB]" />
          Compare GPX files
        </h2>
        <p className="text-[11px] text-[#6B7280] mt-1.5 leading-relaxed">
          Load 2–5 GPX files with individual detection settings and compare their metrics side by side.
        </p>
      </div>

      {/* Google Roads API — global setting for all files */}
      <div className="bg-white border border-[#E5E7EB] rounded-md p-3 space-y-2">
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
              Snaps GPS points to roads via Google Roads API. Applies to all files.
            </p>
          </div>
        </label>
        {enableMapMatching && (
          <div className="ml-5.5 space-y-2">
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
            <label className="flex flex-col gap-1.5 text-xs">
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
            <label className="flex flex-col gap-1.5 text-xs mt-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">
                  Elevation Smoothing
                </span>
                <span className="font-mono font-bold text-[#2563EB]">
                  {elevationSmoothingRadius === 0 ? 'Off' : `${elevationSmoothingRadius}m`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                step="50"
                value={elevationSmoothingRadius}
                onChange={(e) => setElevationSmoothingRadius(Number(e.target.value))}
                className="w-full accent-[#2563EB] h-1.5"
              />
              <p className="text-[10px] text-[#6B7280] leading-normal">
                Gaussian smoothing radius for GPS elevation data (0=off, 200m default).
              </p>
            </label>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {slots.map((slot, idx) => (
          <SlotDropZone
            key={slot.id}
            slot={slot}
            idx={idx}
            fileInputRefs={fileInputRefs}
            onDrop={handleFileDrop}
            onRemove={handleRemove}
            onUploadClick={(i) => fileInputRefs.current[i]?.click()}
            settingsPanel={<SettingsPanel slot={slot} expanded={expandedSlots.has(slot.id)} onToggle={() => setExpandedSlots((prev) => { const next = new Set(prev); if (next.has(slot.id)) next.delete(slot.id); else next.add(slot.id); return next; })} onUpdateSetting={(key, value) => updateSetting(slot.id, key, value)} onUpdateSlot={setSlots} />}
          />
        ))}
      </div>

      {(
        <button
          type="button"
          onClick={addSlot}
          className="text-[11px] text-[#2563EB] hover:underline font-medium cursor-pointer"
        >
          + Add another file
        </button>
      )}

      {error && (
        <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="border-t border-[#E5E7EB] pt-4">
        <button
          type="button"
          onClick={handleCompare}
          disabled={filledSlots.length < 2 || isLoading}
          className={`w-full py-2.5 px-4 rounded font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
            filledSlots.length >= 2 && !isLoading
              ? 'bg-[#2563EB] text-white hover:bg-blue-700'
              : 'bg-[#F9FAFB] text-slate-300 border border-[#E5E7EB] cursor-not-allowed'
          }`}
        >
          {isLoading ? 'Comparing...' : `Compare ${filledSlots.length} files`}
        </button>
      </div>

      {results && <CompareResults results={results} />}

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
                className="text-[#9CA3AF] hover:text-[#111827] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <ol className="text-xs text-[#6B7280] space-y-2 list-decimal list-inside">
              <li>Open the <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-[#2563EB] underline">Google Cloud Console</a>.</li>
              <li>Select or create a project.</li>
              <li>Enable the <strong>Roads API</strong>.</li>
              <li>Go to <strong>APIs &amp; Services → Credentials</strong> and click <strong>Create Credentials → API Key</strong>.</li>
              <li>Copy the key and paste it above.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function SlotDropZone(props: {
  slot: FileSlot;
  idx: number;
  fileInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  onDrop: (slotId: number, file: File) => void;
  onRemove: (slotId: number) => void;
  onUploadClick: (idx: number) => void;
  settingsPanel: React.ReactNode;
  key?: React.Key;
}) {
  const { slot, idx, fileInputRefs, onDrop, onRemove, onUploadClick, settingsPanel } = props;
  const [dragActive, setDragActive] = useState(false);

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
    if (e.dataTransfer.files?.[0]) {
      onDrop(slot.id, e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      onDrop(slot.id, e.target.files[0]);
    }
  };

  const isEmpty = !slot.content;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
          File {idx + 1}
        </span>
        {!isEmpty && (
          <button
            type="button"
            onClick={() => onRemove(slot.id)}
            className="text-[#9CA3AF] hover:text-rose-600 cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => isEmpty && onUploadClick(idx)}
        className={`relative border-2 border-dashed rounded-md p-4 text-center transition duration-150 cursor-pointer ${
          dragActive
            ? 'border-[#2563EB] bg-[#DBEAFE]/30'
            : isEmpty
              ? 'border-[#E5E7EB] hover:border-slate-300 bg-[#F9FAFB]'
              : 'border-emerald-500 bg-emerald-50/30'
        }`}
      >
        <input
          ref={(el) => {
            fileInputRefs.current[idx] = el;
          }}
          type="file"
          className="hidden"
          accept=".gpx,.xml"
          onChange={handleFileChange}
        />

        {isEmpty ? (
          <div className="space-y-1 pointer-events-none">
            <Upload size={18} className="mx-auto text-[#9CA3AF]" />
            <p className="text-[10px] text-[#6B7280]">Drop GPX or click</p>
          </div>
        ) : (
          <div className="space-y-1 pointer-events-none">
            <FileCode size={16} className="mx-auto text-emerald-600" />
            <p
              className="text-[10px] font-semibold text-slate-800 truncate max-w-[180px]"
              title={slot.filename}
            >
              {slot.filename}
            </p>
            <span className="inline-block text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
              Replace
            </span>
          </div>
        )}
      </div>

      {!isEmpty && settingsPanel}
    </div>
  );
}
