/**
 * @license
 * SPDX-License-Identifier: GPL-3.0-only
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ProgressBarProps {
  value: number;
  phase: 'uploading' | 'analyzing' | 'loading';
  fileName?: string;
  variant?: 'compact' | 'full';
}

export function ProgressBar({ value, phase, fileName, variant = 'full' }: ProgressBarProps) {
  const isUploading = phase === 'uploading';
  const isLoading = phase === 'loading';
  const clampedValue = Math.min(100, Math.max(0, value));
  const indeterminate = phase === 'analyzing';

  const label = isLoading ? 'Loading Strava activity' : isUploading ? 'Uploading file' : 'Analyzing data';
  const desc = isLoading
    ? 'Downloading GPX data from Strava...'
    : isUploading
      ? 'Sending raw GPX data to the server...'
      : 'Running stop detection...';

  if (variant === 'compact') {
    return (
      <div className="space-y-1.5">
        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${
              indeterminate
                ? 'bg-[#2563EB] animate-progress-indeterminate w-1/2'
                : 'bg-[#2563EB]'
            }`}
            style={indeterminate ? undefined : { width: `${clampedValue}%` }}
          />
        </div>
        <p className="text-[10px] text-[#6B7280] flex items-center gap-1">
          <Loader2 size={10} className="animate-spin" />
          {desc}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 bg-[#F0F7FF] border border-[#BFDBFE] rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#1E40AF] uppercase tracking-wider flex items-center gap-2">
          {indeterminate && <Loader2 size={14} className="animate-spin" />}
          {label}
        </span>
        <span className="font-mono font-bold text-[#2563EB] text-sm tabular-nums">
          {(isUploading || isLoading) ? `${Math.round(clampedValue)}%` : ''}
        </span>
      </div>

      <div className="w-full h-4 bg-white border border-[#BFDBFE] rounded-full overflow-hidden shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            indeterminate
              ? 'bg-gradient-to-r from-[#2563EB] to-[#60A5FA] animate-progress-indeterminate w-1/3'
              : 'bg-gradient-to-r from-[#2563EB] to-[#60A5FA]'
          }`}
          style={indeterminate ? undefined : { width: `${clampedValue}%` }}
        />
      </div>

      {fileName && (
        <p className="text-[11px] text-[#6B7280] truncate font-medium">
          {fileName}
        </p>
      )}

      <p className="text-[11px] text-[#6B7280]">
        {desc}
      </p>
    </div>
  );
}
