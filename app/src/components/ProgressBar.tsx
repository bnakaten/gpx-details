/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ProgressBarProps {
  value: number;
  phase: 'uploading' | 'analyzing' | 'loading';
  fileName?: string;
}

export function ProgressBar({ value, phase, fileName }: ProgressBarProps) {
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold text-[#6B7280]">
          {label}
        </span>
        <span className="font-mono font-bold text-[#2563EB] tabular-nums">
          {(isUploading || isLoading) ? `${Math.round(clampedValue)}%` : ''}
        </span>
      </div>

      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            indeterminate
              ? 'bg-[#2563EB] animate-progress-indeterminate w-1/2'
              : 'bg-[#2563EB]'
          }`}
          style={indeterminate ? undefined : { width: `${clampedValue}%` }}
        />
      </div>

      {fileName && (
        <p className="text-[10px] text-[#9CA3AF] truncate">
          {fileName}
        </p>
      )}

      {(isUploading || isLoading || indeterminate) && (
        <p className="text-[10px] text-[#6B7280] flex items-center gap-1">
          <Loader2 size={10} className="animate-spin" />
          {desc}
        </p>
      )}
    </div>
  );
}
